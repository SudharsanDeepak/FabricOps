import mongoose from 'mongoose';
import { logger } from '../config/logger.js';
import {
  FabricRoll,
  FinishedGoodsInventory,
  Dispatch,
  DispatchItem,
  Invoice,
  CustomerPayment,
  Order,
  StockMovement,
  AuditLog,
  OrderTimelineEvent,
} from '../models/index.js';
import { withTransaction } from './transaction.service.js';

/**
 * 1. Add eligible fabric roll to Finished Goods Inventory after quality & packing checks.
 */
export async function addToFinishedGoods({
  fabricRollId,
  warehouseLocation = 'FG-BAY-A1-RACK-01',
  packingStatus = 'POLY_WRAPPED',
  notes = '',
  actorUser,
}) {
  const roll = await FabricRoll.findById(fabricRollId).populate('orderId');
  if (!roll) {
    throw new Error('Fabric roll not found');
  }

  // Strictly enforce quality approval
  if (
    ['REWORK_REQUIRED', 'REJECTED_SCRAP'].includes(roll.status) ||
    roll.inspectionStatus === 'REWORK_REQUIRED' ||
    roll.grade === 'REJECT'
  ) {
    throw new Error(
      `Cannot add roll ${roll.rollNumber} to Finished Goods: Roll failed inspection or requires rework (Grade: ${roll.grade}).`
    );
  }

  if (!['GRADE_A', 'GRADE_B', 'PACKED_FOR_DISPATCH'].includes(roll.grade) && !['GRADE_A', 'GRADE_B', 'PACKED_FOR_DISPATCH'].includes(roll.status)) {
    throw new Error(
      `Cannot add roll ${roll.rollNumber} to Finished Goods: Roll must be Grade A or Grade B certified.`
    );
  }

  const order = roll.orderId || {};

  // Upsert Finished Goods Inventory item
  const fgItem = await FinishedGoodsInventory.findOneAndUpdate(
    { fabricRollId: roll._id },
    {
      $set: {
        rollNumber: roll.rollNumber,
        orderId: roll.orderId?._id || roll.orderId,
        productName: order.fabricType || 'Finished Textile Roll',
        fabricType: order.fabricType || 'Cotton Poplin',
        color: order.color || 'Natural White',
        gsm: roll.gsmActual || 120,
        widthInches: roll.widthInchesActual || 58,
        grade: roll.grade,
        netMeters: roll.netMeters,
        weightKg: roll.weightKg,
        warehouseLocation,
        status: 'AVAILABLE',
        packingStatus,
        packingCheckedAt: new Date(),
        packedBy: actorUser ? actorUser._id : undefined,
        isAllocatedToDispatch: false,
        notes,
      },
    },
    { upsert: true, new: true }
  );

  // Update roll status to PACKED_FOR_DISPATCH
  roll.status = 'PACKED_FOR_DISPATCH';
  await roll.save();

  if (actorUser) {
    await AuditLog.create({
      actorId: actorUser._id,
      actorRole: actorUser.role,
      action: 'ADD_TO_FINISHED_GOODS',
      entityType: 'FinishedGoodsInventory',
      entityId: fgItem._id,
      newState: {
        rollNumber: roll.rollNumber,
        netMeters: roll.netMeters,
        warehouseLocation,
        packingStatus,
      },
      notes: `Roll ${roll.rollNumber} added to Finished Goods inventory at ${warehouseLocation}`,
    });
  }

  return fgItem;
}

/**
 * 2. Reserve rolls during dispatch preparation to prevent double allocation.
 */
export async function reserveRollsForDispatch({ orderId, rollIds, actorUser }) {
  if (!rollIds || rollIds.length === 0) {
    throw new Error('No roll IDs provided for reservation');
  }

  const availableItems = await FinishedGoodsInventory.find({
    fabricRollId: { $in: rollIds },
    status: 'AVAILABLE',
  });

  if (availableItems.length !== rollIds.length) {
    throw new Error(
      `Reservation failed: One or more selected rolls are not currently AVAILABLE in Finished Goods.`
    );
  }

  await FinishedGoodsInventory.updateMany(
    { fabricRollId: { $in: rollIds } },
    {
      $set: {
        status: 'RESERVED_FOR_DISPATCH',
        reservedAt: new Date(),
      },
    }
  );

  if (actorUser) {
    await AuditLog.create({
      actorId: actorUser._id,
      actorRole: actorUser.role,
      action: 'RESERVE_ROLLS_FOR_DISPATCH',
      entityType: 'FinishedGoodsInventory',
      entityId: orderId,
      newState: { rollIds, count: rollIds.length },
      notes: `Reserved ${rollIds.length} rolls for order ${orderId} dispatch staging`,
    });
  }

  return { success: true, reservedCount: rollIds.length };
}

/**
 * 3. Release reserved rolls back to AVAILABLE if dispatch draft is discarded.
 */
export async function releaseReservedRolls({ rollIds, actorUser }) {
  await FinishedGoodsInventory.updateMany(
    { fabricRollId: { $in: rollIds }, status: 'RESERVED_FOR_DISPATCH' },
    {
      $set: {
        status: 'AVAILABLE',
        reservedForDispatchId: null,
      },
      $unset: { reservedAt: 1 },
    }
  );

  return { success: true, releasedCount: rollIds.length };
}

/**
 * 4. Execute atomic dispatch transaction:
 * - Checks idempotency key to prevent duplicate dispatch.
 * - Validates buyer, order, specifications, and quality status.
 * - Enforces atomic conditional updates to prevent concurrent double allocation of same roll.
 * - Computes partial dispatch and remaining order quantities.
 * - Validates over-dispatch limits.
 * - Creates Dispatch, itemized DispatchItem records, and matching Tax Invoice.
 * - Records immutable stock movements and audit log.
 */
export async function createDispatch({
  orderId,
  customerId,
  rollIds,
  carrierName,
  vehicleNumber,
  driverName = '',
  driverPhone = '',
  waybillNumber,
  gatePassNumber,
  deliveryReference = '',
  packagingType = 'POLY_WRAPPED_BALES',
  idempotencyKey,
  allowOverDispatch = false,
  overDispatchReason = '',
  notes = '',
  actorUser,
  dispatchedBy,
}) {
  const effectiveUserId = actorUser?._id || actorUser || dispatchedBy;
  return withTransaction(async (session) => {
    // 1. Idempotency Check: Prevent duplicate dispatch submission
    const existingDispatch = await Dispatch.findOne({ idempotencyKey })
      .populate('orderId')
      .populate('customerId', 'name email')
      .session(session);

    if (existingDispatch) {
      logger.info(`Idempotent dispatch request intercepted for key: ${idempotencyKey}`);
      const existingInvoice = await Invoice.findOne({ dispatchId: existingDispatch._id }).session(session);
      const existingItems = await DispatchItem.find({ dispatchId: existingDispatch._id }).session(session);
      return {
        dispatch: existingDispatch,
        invoice: existingInvoice,
        dispatchItems: existingItems,
        isDuplicate: true,
      };
    }

    // 2. Validate Order & Buyer
    const order = await Order.findById(orderId).session(session);
    if (order && customerId && order.customerId.toString() !== customerId.toString()) {
      throw new Error('Dispatch rejected: Buyer does not match the customer on the order');
    }

    const resolvedCustomerId = order?.customerId || customerId;

    // 3. Validate Roll IDs & Quality Standards
    if (!rollIds || rollIds.length === 0) {
      throw new Error('Dispatch must include at least one fabric roll');
    }

    const allRolls = await FabricRoll.find({ _id: { $in: rollIds } }).session(session);
    if (allRolls.length !== rollIds.length) {
      throw new Error('Dispatch aborted: One or more requested rolls were not found in database');
    }

    for (const r of allRolls) {
      if (r.orderId.toString() !== orderId.toString()) {
        throw new Error(`Dispatch rejected: Roll ${r.rollNumber} belongs to a different order`);
      }
      if (
        ['REWORK_REQUIRED', 'REJECTED_SCRAP'].includes(r.status) ||
        r.inspectionStatus === 'REWORK_REQUIRED' ||
        r.grade === 'REJECT'
      ) {
        throw new Error(
          `Dispatch rejected: Roll ${r.rollNumber} failed quality inspection or requires rework (Grade: ${r.grade}, Status: ${r.status}). Cannot dispatch unapproved rolls.`
        );
      }
      if (!['GRADE_A', 'GRADE_B', 'PACKED_FOR_DISPATCH'].includes(r.status)) {
        throw new Error(
          `Dispatch rejected: Roll ${r.rollNumber} is not approved for dispatch (Current status: ${r.status}). Only Grade A or Grade B passed rolls may be dispatched.`
        );
      }
    }

    const rolls = allRolls;
    const totalMetersDispatched = rolls.reduce((sum, r) => sum + r.netMeters, 0);
    const totalWeightKg = rolls.reduce((sum, r) => sum + (r.weightKg || 0), 0);

    // 5. Concurrency Control: Atomic Conditional Update on Finished Goods
    // Guarantees roll cannot be committed to two dispatches concurrently
    for (const roll of rolls) {
      const updatedFG = await FinishedGoodsInventory.findOneAndUpdate(
        {
          fabricRollId: roll._id,
          status: { $in: ['AVAILABLE', 'RESERVED_FOR_DISPATCH'] },
          isAllocatedToDispatch: false,
        },
        {
          $set: {
            status: 'DISPATCHED',
            isAllocatedToDispatch: true,
          },
        },
        { session, new: true }
      );

      if (!updatedFG) {
        throw new Error(
          `Concurrency conflict: Roll ${roll.rollNumber} is already committed or allocated to another dispatch.`
        );
      }
    }

    // 6. Partial Dispatch & Remaining Quantity Calculations
    const targetOrderedMeters = Number(order.totalMetersOrdered || order.items?.[0]?.quantity || 0);

    const priorDispatches = await Dispatch.find({
      orderId: order._id,
      status: { $ne: 'CANCELLED' },
    }).session(session);

    const priorDispatchedMeters = priorDispatches.reduce(
      (sum, d) => sum + d.totalMetersDispatched,
      0
    );

    const cumulativeDispatchedMeters = priorDispatchedMeters + totalMetersDispatched;

    // Validate over-dispatch
    if (targetOrderedMeters > 0 && cumulativeDispatchedMeters > targetOrderedMeters) {
      if (!allowOverDispatch) {
        throw new Error(
          `Over-dispatch violation: Total cumulative dispatch ${cumulativeDispatchedMeters}m exceeds authorized order quantity of ${targetOrderedMeters}m. Explicit override and reason required.`
        );
      }
    }

    const remainingOrderMeters = Math.max(0, targetOrderedMeters - cumulativeDispatchedMeters);
    const isPartialDispatch = remainingOrderMeters > 0;
    const dispatchType = isPartialDispatch ? 'PARTIAL' : 'FULL';

    // 7. Create Dispatch Record
    const dispatchNumber = `DSP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const [dispatch] = await Dispatch.create(
      [
        {
          dispatchNumber,
          orderId: order._id,
          customerId: resolvedCustomerId,
          dispatchedRollIds: rollIds,
          totalRolls: rolls.length,
          totalMetersDispatched,
          totalWeightKg,
          carrierName,
          vehicleNumber,
          driverName,
          driverPhone,
          waybillNumber,
          gatePassNumber,
          deliveryReference: deliveryReference || `DEL-REF-${dispatchNumber}`,
          packagingType,
          dispatchType,
          isPartialDispatch,
          remainingOrderMeters,
          idempotencyKey,
          status: 'GATE_CLEARED',
          dispatchedAt: new Date(),
          estimatedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Default +3 days
          dispatchedBy: actorUser ? actorUser._id : undefined,
          notes,
        },
      ],
      { session }
    );

    // 8. Derive Commercial Pricing from Order / Accepted Quotation
    const ratePerMeter = Number(
      order?.pricing?.unitPrice || order?.items?.[0]?.unitPrice || 250
    );

    // 9. Create Dedicated DispatchItem records
    const dispatchItemsDocs = rolls.map((roll) => ({
      dispatchId: dispatch._id,
      orderId: order?._id || orderId,
      customerId: resolvedCustomerId,
      fabricRollId: roll._id,
      rollNumber: roll.rollNumber,
      productName: order?.fabricType || 'Woven Fabric',
      fabricType: order?.fabricType || 'Cotton Poplin',
      color: order?.color || 'Natural White',
      grade: roll.grade,
      metersDispatched: roll.netMeters,
      weightKg: roll.weightKg,
      warehouseLocation: 'FG-Warehouse-Main',
      ratePerMeter,
      lineTotal: parseFloat((roll.netMeters * ratePerMeter).toFixed(2)),
      packingType: packagingType === 'POLY_WRAPPED_BALES' ? 'POLY_WRAPPED' : 'BOXED_CARTON',
    }));

    const createdDispatchItems = await DispatchItem.insertMany(dispatchItemsDocs, { session });

    // 10. Mark Fabric Rolls as DISPATCHED
    await FabricRoll.updateMany(
      { _id: { $in: rollIds } },
      { $set: { status: 'DISPATCHED' } },
      { session }
    );

    // 11. Generate Matching Commercial Tax Invoice
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const subtotal = parseFloat((totalMetersDispatched * ratePerMeter).toFixed(2));
    const taxRatePercent = 5; // Standard 5% GST on textiles
    const taxAmount = parseFloat((subtotal * (taxRatePercent / 100)).toFixed(2));
    const totalInvoiceAmount = parseFloat((subtotal + taxAmount).toFixed(2));

    const [invoice] = await Invoice.create(
      [
        {
          invoiceNumber,
          dispatchId: dispatch._id,
          orderId: order?._id || orderId,
          customerId: resolvedCustomerId,
          lineItems: rolls.map((r) => ({
            fabricRollId: r._id,
            rollNumber: r.rollNumber,
            fabricType: order?.fabricType || 'Cotton Poplin',
            grade: r.grade,
            meters: r.netMeters,
            ratePerMeter,
            lineTotal: parseFloat((r.netMeters * ratePerMeter).toFixed(2)),
          })),
          subtotal,
          discountAmount: 0,
          taxRatePercent,
          taxAmount,
          totalInvoiceAmount,
          amountPaid: 0,
          balanceDue: totalInvoiceAmount,
          paymentTerms: 'Net 30 Days',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          paymentStatus: 'UNPAID',
          currency: 'INR',
          generatedBy: effectiveUserId,
          notes: `Tax invoice automatically generated for dispatch ${dispatch.dispatchNumber}`,
        },
      ],
      { session }
    );

    // Link invoice to dispatch
    dispatch.invoiceId = invoice._id;
    await dispatch.save({ session });

    // 12. Update Order Production & Dispatch Progress
    if (order) {
      order.dispatchedMeters = cumulativeDispatchedMeters;
      order.producedMeters = Math.max(order.producedMeters || 0, cumulativeDispatchedMeters);
      if (isPartialDispatch) {
        order.status = 'PARTIALLY_DISPATCHED';
      } else {
        order.status = 'COMPLETED';
      }
      await order.save({ session });
    }

    // 13. Record Immutable Stock Movements for audit ledger
    for (const roll of rolls) {
      await StockMovement.create(
        [
          {
            movementNumber: `MOV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
            inventoryItemId: roll.productionJobId || roll._id,
            movementType: 'DISPATCH_ISSUE',
            quantity: -roll.netMeters,
            previousQuantityOnHand: roll.netMeters,
            newQuantityOnHand: 0,
            unit: 'METER',
            referenceModel: 'Dispatch',
            referenceId: dispatch._id,
            recordedBy: effectiveUserId,
            reason: `Dispatched in ${dispatch.dispatchNumber} via ${carrierName} (${vehicleNumber})`,
          },
        ],
        { session }
      );
    }

    // 14. Record Audit Log
    if (actorUser) {
      await AuditLog.create(
        [
          {
            actorId: actorUser._id,
            actorRole: actorUser.role,
            action: 'CREATE_DISPATCH',
            entityType: 'Dispatch',
            entityId: dispatch._id,
            newState: {
              dispatchNumber: dispatch.dispatchNumber,
              totalRolls: rolls.length,
              totalMetersDispatched,
              invoiceNumber: invoice.invoiceNumber,
              isPartialDispatch,
              remainingOrderMeters,
            },
            notes: `Dispatched ${rolls.length} rolls (${totalMetersDispatched}m) under ${dispatch.dispatchNumber}`,
          },
        ],
        { session }
      );
    }

    return {
      dispatch,
      invoice,
      dispatchItems: createdDispatchItems,
      remainingOrderMeters,
      isPartialDispatch,
      isDuplicate: false,
    };
  });
}

/**
 * 5. Update carrier delivery tracking & confirm delivery.
 */
export async function updateDeliveryStatus({
  dispatchId,
  status,
  actualDeliveryDate,
  receiverSignatureAck,
  proofOfDeliveryNotes,
  actorUser,
}) {
  const dispatch = await Dispatch.findById(dispatchId).populate('orderId');
  if (!dispatch) {
    throw new Error('Dispatch record not found');
  }

  const previousStatus = dispatch.status;
  dispatch.status = status;

  if (status === 'DELIVERED') {
    dispatch.actualDeliveryDate = actualDeliveryDate || new Date();
    dispatch.receiverSignatureAck = receiverSignatureAck || 'Acknowledged by Buyer Consignee';
    dispatch.proofOfDeliveryNotes = proofOfDeliveryNotes || 'Consignment received in intact condition';
  }

  await dispatch.save();

  if (actorUser) {
    await AuditLog.create({
      actorId: actorUser._id,
      actorRole: actorUser.role,
      action: 'UPDATE_DISPATCH_DELIVERY_STATUS',
      entityType: 'Dispatch',
      entityId: dispatch._id,
      previousState: { status: previousStatus },
      newState: { status: dispatch.status, actualDeliveryDate: dispatch.actualDeliveryDate },
      notes: `Updated dispatch ${dispatch.dispatchNumber} delivery status to ${status}`,
    });
  }

  return dispatch;
}

/**
 * 6. Record Customer Payment against an invoice.
 */
export async function recordCustomerPayment({
  invoiceId,
  amountPaid,
  paymentMethod,
  referenceNumber,
  paidAt = new Date(),
  notes = '',
  actorUser,
}) {
  return withTransaction(async (session) => {
    const invoice = await Invoice.findById(invoiceId).session(session);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const payAmount = Number(amountPaid);
    if (payAmount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    // Check unique reference number (Bank UTR / cheque) to prevent duplicate payment entry
    const existingPayment = await CustomerPayment.findOne({ referenceNumber }).session(session);
    if (existingPayment) {
      throw new Error(`Duplicate payment reference: "${referenceNumber}" has already been recorded.`);
    }

    const paymentNumber = `PAY-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const [payment] = await CustomerPayment.create(
      [
        {
          paymentNumber,
          invoiceId: invoice._id,
          orderId: invoice.orderId,
          customerId: invoice.customerId,
          amountPaid: payAmount,
          paymentMethod,
          referenceNumber,
          paidAt,
          status: 'CLEARED',
          recordedBy: actorUser ? actorUser._id : invoice.customerId,
          notes,
        },
      ],
      { session }
    );

    // Update Invoice balance
    invoice.amountPaid = parseFloat((invoice.amountPaid + payAmount).toFixed(2));
    invoice.balanceDue = Math.max(0, parseFloat((invoice.totalInvoiceAmount - invoice.amountPaid).toFixed(2)));

    if (invoice.balanceDue <= 0) {
      invoice.paymentStatus = 'PAID';
    } else {
      invoice.paymentStatus = 'PARTIALLY_PAID';
    }

    await invoice.save({ session });

    // Check if order is fully paid across all invoices
    const allInvoices = await Invoice.find({ orderId: invoice.orderId }).session(session);
    const allPaid = allInvoices.every((inv) => inv.paymentStatus === 'PAID');
    if (allPaid) {
      await Order.findByIdAndUpdate(invoice.orderId, { paymentStatus: 'PAID' }, { session });
    }

    if (actorUser) {
      await AuditLog.create(
        [
          {
            actorId: actorUser._id,
            actorRole: actorUser.role,
            action: 'RECORD_CUSTOMER_PAYMENT',
            entityType: 'CustomerPayment',
            entityId: payment._id,
            newState: {
              paymentNumber: payment.paymentNumber,
              amountPaid: payAmount,
              referenceNumber,
              invoicePaymentStatus: invoice.paymentStatus,
            },
            notes: `Recorded payment ${payment.paymentNumber} of ₹${payAmount} for invoice ${invoice.invoiceNumber}`,
          },
        ],
        { session }
      );
    }

    return { payment, invoice };
  });
}

/**
 * 7. List dispatches with RBAC & Customer isolation.
 */
export async function getDispatches({ customerId, orderId, status, search, page = 1, limit = 20 } = {}) {
  const query = {};
  if (customerId) query.customerId = customerId;
  if (orderId) query.orderId = orderId;
  if (status && status !== 'ALL') query.status = status;

  if (search) {
    const s = search.trim();
    query.$or = [
      { dispatchNumber: new RegExp(s, 'i') },
      { waybillNumber: new RegExp(s, 'i') },
      { carrierName: new RegExp(s, 'i') },
      { vehicleNumber: new RegExp(s, 'i') },
      { gatePassNumber: new RegExp(s, 'i') },
    ];
  }

  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

  const [dispatches, total] = await Promise.all([
    Dispatch.find(query)
      .populate('orderId', 'orderNumber totalMetersOrdered producedMeters confirmedDeliveryDate fabricType color')
      .populate('customerId', 'name email companyName')
      .populate('invoiceId', 'invoiceNumber totalInvoiceAmount paymentStatus')
      .populate('dispatchedRollIds', 'rollNumber netMeters grade status')
      .sort({ dispatchedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Dispatch.countDocuments(query),
  ]);

  return {
    dispatches,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * 8. Deep dispatch explorer with itemized rolls and delivery tracking.
 */
export async function getDispatchById(dispatchId, customerId = null) {
  const query = { _id: dispatchId };
  if (customerId) query.customerId = customerId;

  const dispatch = await Dispatch.findOne(query)
    .populate('orderId')
    .populate('customerId', 'name email companyName phone shippingAddress')
    .populate('invoiceId')
    .populate('dispatchedBy', 'name email')
    .lean();

  if (!dispatch) {
    const error = new Error('Dispatch not found or access unauthorized');
    error.statusCode = 404;
    throw error;
  }

  const items = await DispatchItem.find({ dispatchId: dispatch._id })
    .populate('fabricRollId', 'rollNumber grossMeters netMeters weightKg grade doffTimestamp')
    .lean();

  return {
    dispatch,
    items,
    invoice: dispatch.invoiceId,
    order: dispatch.orderId,
    customer: dispatch.customerId,
  };
}

/**
 * 9. List invoices with RBAC & Customer isolation.
 */
export async function getInvoices({ customerId, orderId, paymentStatus, search, page = 1, limit = 20 } = {}) {
  const query = {};
  if (customerId) query.customerId = customerId;
  if (orderId) query.orderId = orderId;
  if (paymentStatus && paymentStatus !== 'ALL') query.paymentStatus = paymentStatus;

  if (search) {
    const s = search.trim();
    query.$or = [{ invoiceNumber: new RegExp(s, 'i') }];
  }

  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

  const [invoices, total] = await Promise.all([
    Invoice.find(query)
      .populate('orderId', 'orderNumber fabricType totalMetersOrdered')
      .populate('customerId', 'name email companyName')
      .populate('dispatchId', 'dispatchNumber waybillNumber vehicleNumber carrierName dispatchedAt')
      .sort({ invoiceDate: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Invoice.countDocuments(query),
  ]);

  return {
    invoices,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * 10. Get single invoice with full line items and payment receipts.
 */
export async function getInvoiceById(invoiceId, customerId = null) {
  const query = { _id: invoiceId };
  if (customerId) query.customerId = customerId;

  const invoice = await Invoice.findOne(query)
    .populate('orderId')
    .populate('customerId', 'name email companyName billingAddress')
    .populate('dispatchId')
    .lean();

  if (!invoice) {
    const error = new Error('Invoice not found or access unauthorized');
    error.statusCode = 404;
    throw error;
  }

  const payments = await CustomerPayment.find({ invoiceId: invoice._id })
    .populate('recordedBy', 'name email')
    .sort({ paidAt: -1 })
    .lean();

  return {
    invoice,
    payments,
    order: invoice.orderId,
    dispatch: invoice.dispatchId,
    customer: invoice.customerId,
  };
}

/**
 * 11. List Finished Goods Inventory balances and roll availability.
 */
export async function getFinishedGoods({ orderId, status, grade, search, page = 1, limit = 30 } = {}) {
  const query = {};
  if (orderId) query.orderId = orderId;
  if (status && status !== 'ALL') query.status = status;
  if (grade && grade !== 'ALL') query.grade = grade;

  if (search) {
    const s = search.trim();
    query.$or = [
      { rollNumber: new RegExp(s, 'i') },
      { warehouseLocation: new RegExp(s, 'i') },
      { productName: new RegExp(s, 'i') },
    ];
  }

  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    FinishedGoodsInventory.find(query)
      .populate('orderId', 'orderNumber customerId totalMetersOrdered')
      .populate('fabricRollId', 'rollNumber grossMeters netMeters widthInchesActual grade status latestInspectionId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    FinishedGoodsInventory.countDocuments(query),
  ]);

  return {
    items,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * 12. Dashboard metrics for Finished Goods, Dispatches, and Invoicing.
 */
export async function getDispatchDashboardMetrics() {
  const [fgItems, dispatches, invoices, payments] = await Promise.all([
    FinishedGoodsInventory.find().lean(),
    Dispatch.find().lean(),
    Invoice.find().lean(),
    CustomerPayment.find().lean(),
  ]);

  const availableFG = fgItems.filter((i) => i.status === 'AVAILABLE');
  const reservedFG = fgItems.filter((i) => i.status === 'RESERVED_FOR_DISPATCH');
  const dispatchedFG = fgItems.filter((i) => i.status === 'DISPATCHED');

  const totalFgMeters = availableFG.reduce((sum, i) => sum + i.netMeters, 0);
  const totalReservedMeters = reservedFG.reduce((sum, i) => sum + i.netMeters, 0);

  const totalDispatchedMeters = dispatches.reduce((sum, d) => sum + d.totalMetersDispatched, 0);
  const inTransitDispatches = dispatches.filter((d) => ['GATE_CLEARED', 'IN_TRANSIT'].includes(d.status)).length;
  const deliveredDispatches = dispatches.filter((d) => d.status === 'DELIVERED').length;

  const totalInvoicedAmount = invoices.reduce((sum, i) => sum + i.totalInvoiceAmount, 0);
  const totalCollectedAmount = payments.filter((p) => p.status === 'CLEARED').reduce((sum, p) => sum + p.amountPaid, 0);
  const totalOutstandingAmount = Math.max(0, totalInvoicedAmount - totalCollectedAmount);

  const partialDispatchesCount = dispatches.filter((d) => d.isPartialDispatch).length;
  const fullDispatchesCount = dispatches.filter((d) => !d.isPartialDispatch).length;

  return {
    inventory: {
      totalAvailableRolls: availableFG.length,
      totalAvailableMeters: totalFgMeters,
      totalReservedRolls: reservedFG.length,
      totalReservedMeters,
      totalDispatchedRolls: dispatchedFG.length,
    },
    dispatch: {
      totalDispatches: dispatches.length,
      totalMetersDispatched,
      inTransitCount: inTransitDispatches,
      deliveredCount: deliveredDispatches,
      partialDispatchesCount,
      fullDispatchesCount,
    },
    billing: {
      totalInvoicedAmount: parseFloat(totalInvoicedAmount.toFixed(2)),
      totalCollectedAmount: parseFloat(totalCollectedAmount.toFixed(2)),
      totalOutstandingAmount: parseFloat(totalOutstandingAmount.toFixed(2)),
      unpaidInvoicesCount: invoices.filter((i) => i.paymentStatus === 'UNPAID').length,
      paidInvoicesCount: invoices.filter((i) => i.paymentStatus === 'PAID').length,
    },
  };
}
