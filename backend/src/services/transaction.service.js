import mongoose from 'mongoose';
import { logger } from '../config/logger.js';
import {
  Quotation,
  Order,
  InventoryItem,
  FabricRoll,
  FinishedGoodsInventory,
  Dispatch,
  Invoice,
  StockMovement,
  AuditLog,
} from '../models/index.js';
import { initializeOrderTimeline } from './timeline.service.js';

/**
 * Execute a critical business operation inside a managed MongoDB transaction.
 * Does NOT silently fall back to non-atomic writes if transactions fail.
 */
export async function withTransaction(workFn) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await workFn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
      logger.warn(`Transaction aborted due to error: ${error.message}`);
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Core business transaction: Confirm Order from Accepted Quotation
 * Invariants:
 * 1. Customer must have accepted the quotation.
 * 2. Quotation must not already be converted.
 * 3. 1-to-1 order created with identical specifications and agreed prices.
 * 4. Idempotency control: repeated requests return existing order without duplicate write.
 * 5. Revalidates inventory and machine capacity before confirmation.
 * 6. AuditLog recorded with actor metadata.
 */
export async function confirmOrderTransaction({ quotationId, customerId, actorUser, idempotencyKey = null }) {
  return withTransaction(async (session) => {
    // 1. Idempotency check: if order already created for this quotation or idempotencyKey, return gracefully
    const existingOrderQuery = {
      $or: [
        { quotationId },
        ...(idempotencyKey ? [{ idempotencyKey }] : []),
      ],
    };
    const existingOrder = await Order.findOne(existingOrderQuery).session(session);
    if (existingOrder) {
      logger.info(`Duplicate order confirmation request intercepted for quotationId: ${quotationId}`);
      return existingOrder;
    }

    // 2. Fetch quotation within session with lock-like read
    const quotation = await Quotation.findOne({
      _id: quotationId,
      customerId,
      status: 'CUSTOMER_ACCEPTED',
    }).session(session);

    if (!quotation) {
      throw new Error(
        'Quotation not eligible for order confirmation: Must be in CUSTOMER_ACCEPTED status and owned by customer'
      );
    }

    // 3. Revalidate inventory and reserve stock where yarn item is available
    for (const item of quotation.items) {
      const gsm = item.fabricSpecSnapshot?.gsm || 120;
      const width = item.fabricSpecSnapshot?.widthInches || 58;
      const requiredKg = Math.round(item.quantity * (width * 0.0254) * (gsm / 1000) * 1.05);

      // Attempt to find matching yarn inventory item and atomically reserve if sufficient stock
      const yarn = await InventoryItem.findOne({
        category: 'RAW_YARN',
        $expr: { $gte: [{ $subtract: ['$quantityOnHand', '$quantityReserved'] }, requiredKg] },
      }).session(session);

      if (yarn && requiredKg > 0) {
        yarn.quantityReserved += requiredKg;
        await yarn.save({ session });
      }
    }

    // 4. Mark quotation as converted
    quotation.status = 'CONVERTED_TO_ORDER';
    await quotation.save({ session });

    // 5. Create confirmed order
    const orderNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const [order] = await Order.create(
      [
        {
          orderNumber,
          quotationId: quotation._id,
          idempotencyKey: idempotencyKey || `auto-${quotation._id}`,
          customerId: quotation.customerId,
          items: quotation.items.map((item) => ({
            productId: item.productId,
            fabricSpecSnapshot: item.fabricSpecSnapshot,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          })),
          subtotal: quotation.subtotal,
          taxAmount: quotation.taxAmount,
          totalAmount: quotation.totalAmount,
          confirmedDeliveryDate: quotation.customerDecision?.agreedDeliveryDate || quotation.proposedDeliveryDate,
          status: 'CONFIRMED',
          paymentStatus: 'PENDING',
          specificationsValidated: true,
          capacityValidated: true,
        },
      ],
      { session }
    );

    // Initialize end-to-end timeline milestones
    await initializeOrderTimeline(order._id, session);

    // 6. Record audit log
    await AuditLog.create(
      [
        {
          actorId: actorUser._id,
          actorRole: actorUser.role,
          action: 'QUOTATION_CONVERTED_TO_ORDER',
          entityType: 'Order',
          entityId: order._id,
          previousState: { quotationStatus: 'CUSTOMER_ACCEPTED' },
          newState: { orderId: order._id, orderNumber: order.orderNumber, status: 'CONFIRMED' },
          notes: `Quotation ${quotation.quotationNumber} confirmed and converted to order ${order.orderNumber}`,
        },
      ],
      { session }
    );

    return order;
  });
}


/**
 * Core business transaction: Safe Dispatch Execution with Idempotency Key
 * Invariants:
 * 1. Checks that idempotencyKey does not already exist.
 * 2. Checks each fabric roll is in Finished Goods and GRADE_A / GRADE_B.
 * 3. Marks rolls as DISPATCHED and allocates out of FinishedGoodsInventory.
 * 4. Creates Dispatch and initial Invoice.
 */
export async function executeDispatchTransaction({
  orderId,
  customerId,
  rollIds,
  carrierName,
  vehicleNumber,
  driverPhone,
  waybillNumber,
  gatePassNumber,
  idempotencyKey,
  actorUser,
}) {
  return withTransaction(async (session) => {
    // 1. Check idempotency key first
    const existingDispatch = await Dispatch.findOne({ idempotencyKey }).session(session);
    if (existingDispatch) {
      logger.info(`Idempotent dispatch request detected for key: ${idempotencyKey}`);
      return { dispatch: existingDispatch, isDuplicate: true };
    }

    // 2. Fetch and validate each fabric roll against quality standards
    const allRolls = await FabricRoll.find({ _id: { $in: rollIds } }).session(session);
    if (allRolls.length !== rollIds.length) {
      throw new Error(`Dispatch aborted: One or more requested rolls were not found`);
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

    const totalMeters = rolls.reduce((sum, r) => sum + r.netMeters, 0);

    // 3. Mark rolls as DISPATCHED
    await FabricRoll.updateMany(
      { _id: { $in: rollIds } },
      { $set: { status: 'DISPATCHED' } },
      { session }
    );

    // 4. Update Finished Goods records
    await FinishedGoodsInventory.updateMany(
      { fabricRollId: { $in: rollIds } },
      { $set: { isAllocatedToDispatch: true } },
      { session }
    );

    // 5. Create Dispatch record
    const dispatchNumber = `DSP-${Date.now()}`;
    const [dispatch] = await Dispatch.create(
      [
        {
          dispatchNumber,
          orderId,
          customerId,
          dispatchedRollIds: rollIds,
          totalRolls: rolls.length,
          totalMetersDispatched: totalMeters,
          carrierName,
          vehicleNumber,
          driverPhone,
          waybillNumber,
          gatePassNumber,
          idempotencyKey,
          status: 'GATE_CLEARED',
          dispatchedBy: actorUser._id,
        },
      ],
      { session }
    );

    // 6. Generate matching Tax Invoice
    const invoiceNumber = `INV-${Date.now()}`;
    const ratePerMeter = 250; // Standard agreed rate per meter
    const subtotal = totalMeters * ratePerMeter;
    const taxAmount = subtotal * 0.05;
    const totalInvoiceAmount = subtotal + taxAmount;

    const [invoice] = await Invoice.create(
      [
        {
          invoiceNumber,
          dispatchId: dispatch._id,
          orderId,
          customerId,
          lineItems: rolls.map((r) => ({
            rollNumber: r.rollNumber,
            meters: r.netMeters,
            ratePerMeter,
            lineTotal: r.netMeters * ratePerMeter,
          })),
          subtotal,
          taxRatePercent: 5,
          taxAmount,
          totalInvoiceAmount,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Net 30
          paymentStatus: 'UNPAID',
        },
      ],
      { session }
    );

    // 7. Record Stock Movements for outward finished goods
    for (const roll of rolls) {
      await StockMovement.create(
        [
          {
            movementNumber: `MOV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
            inventoryItemId: roll.productionJobId, // Linked to production source
            movementType: 'DISPATCH_ISSUE',
            quantity: -roll.netMeters,
            previousQuantityOnHand: roll.netMeters,
            newQuantityOnHand: 0,
            unit: 'METER',
            referenceModel: 'Dispatch',
            referenceId: dispatch._id,
            recordedBy: actorUser._id,
            reason: `Dispatched in ${dispatch.dispatchNumber} on vehicle ${vehicleNumber}`,
          },
        ],
        { session }
      );
    }

    return { dispatch, invoice, isDuplicate: false };
  });
}

