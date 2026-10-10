import { Quotation, OrderRequest, User, AuditLog } from '../models/index.js';
import { checkYarnFeasibility, checkMachineCompatibility, calculateProposedTimeline } from './feasibility.service.js';
import { createAndSendNotification } from './notification.service.js';
import { logger } from '../config/logger.js';

/**
 * Perform a full feasibility evaluation for an order request or line item specs.
 */
export async function evaluateFeasibilityForSpecs({ fabricSpecs, quantity, productId = null }) {
  const yarnFeasibility = await checkYarnFeasibility({ fabricSpecs, quantity });
  const machineFeasibility = await checkMachineCompatibility({ fabricSpecs, quantity });
  const timeline = calculateProposedTimeline({
    yarnFeasibility,
    machineFeasibility,
    quantity,
  });

  return {
    yarnFeasibility,
    machineFeasibility,
    timeline,
  };
}

/**
 * Creates an initial Quotation (Revision 1) from an inquiry or directly.
 */
export async function createQuotation({
  orderRequestId = null,
  customerId,
  items,
  taxPercent = 5,
  proposedDeliveryDate,
  productionLeadTimeDays,
  validUntilDays = 10,
  materialAvailability = {},
  assumptions = [],
  riskFactors = [],
  adminNotes = '',
  createdBy,
}) {
  // Calculate line items and totals
  const calculatedItems = items.map((item) => {
    const lineTotal = Number(item.quantity) * Number(item.unitPrice);
    return {
      ...item,
      lineTotal,
    };
  });

  const subtotal = calculatedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const taxAmount = (subtotal * taxPercent) / 100;
  const totalAmount = subtotal + taxAmount;

  const finalDeliveryDate = proposedDeliveryDate
    ? new Date(proposedDeliveryDate)
    : new Date(Date.now() + (productionLeadTimeDays || 14) * 86400000);

  const finalValidUntil = new Date(Date.now() + validUntilDays * 86400000);
  const quotationNumber = `QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Prepare Revision 1 snapshot
  const initialRevision = {
    revisionNumber: 1,
    items: calculatedItems,
    subtotal,
    taxPercent,
    taxAmount,
    totalAmount,
    proposedDeliveryDate: finalDeliveryDate,
    productionLeadTimeDays: productionLeadTimeDays || 14,
    materialAvailability,
    assumptions,
    riskFactors,
    notes: adminNotes || 'Initial quotation issued',
    revisedBy: createdBy._id,
    createdAt: new Date(),
  };

  const quotation = await Quotation.create({
    quotationNumber,
    orderRequestId,
    customerId,
    items: calculatedItems,
    subtotal,
    taxPercent,
    taxAmount,
    totalAmount,
    proposedDeliveryDate: finalDeliveryDate,
    productionLeadTimeDays: productionLeadTimeDays || 14,
    materialAvailability,
    assumptions,
    riskFactors,
    validUntil: finalValidUntil,
    currentRevisionNumber: 1,
    revisions: [initialRevision],
    status: 'ISSUED',
    adminNotes,
    createdBy: createdBy._id,
  });

  // Link quotation back to OrderRequest if applicable
  if (orderRequestId) {
    await OrderRequest.findByIdAndUpdate(orderRequestId, {
      quotationId: quotation._id,
      status: 'QUOTED',
    });
  }

  // Audit log
  await AuditLog.create({
    actorId: createdBy._id,
    actorRole: createdBy.role,
    action: 'QUOTATION_ISSUED',
    entityType: 'Quotation',
    entityId: quotation._id,
    newState: { quotationNumber, totalAmount, status: 'ISSUED' },
    notes: `Initial quotation ${quotationNumber} issued for customer ${customerId}`,
  });

  // Notify customer
  await createAndSendNotification({
    recipientId: customerId,
    recipientRole: 'CUSTOMER',
    title: 'New Fabric Quotation Issued',
    message: `Everest Mills has issued Quotation ${quotation.quotationNumber} for ₹${totalAmount.toLocaleString()} with proposed delivery on ${finalDeliveryDate.toISOString().split('T')[0]}.`,
    type: 'QUOTATION_PROPOSED',
    actionUrl: `/my-quotes?id=${quotation._id}`,
    metadata: { quotationId: quotation._id, quotationNumber },
  });

  return quotation;
}

/**
 * Revises a quotation:
 * BUSINESS RULE: Preserves previous quotation revisions rather than overwriting previous offers.
 */
export async function reviseQuotation({
  quotationId,
  items,
  taxPercent = 5,
  proposedDeliveryDate,
  productionLeadTimeDays,
  materialAvailability = {},
  assumptions = [],
  riskFactors = [],
  notes = '',
  actorUser,
}) {
  const quotation = await Quotation.findById(quotationId);
  if (!quotation) {
    throw new Error('Quotation not found');
  }

  if (quotation.status === 'CONVERTED_TO_ORDER') {
    throw new Error('Cannot revise a quotation that has already been converted to an order');
  }

  // Calculate updated line items and totals
  const calculatedItems = items.map((item) => {
    const lineTotal = Number(item.quantity) * Number(item.unitPrice);
    return {
      ...item,
      lineTotal,
    };
  });

  const subtotal = calculatedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const taxAmount = (subtotal * taxPercent) / 100;
  const totalAmount = subtotal + taxAmount;

  const nextRevisionNumber = (quotation.currentRevisionNumber || 1) + 1;
  const finalDeliveryDate = proposedDeliveryDate
    ? new Date(proposedDeliveryDate)
    : quotation.proposedDeliveryDate;

  // New revision snapshot
  const newRevision = {
    revisionNumber: nextRevisionNumber,
    items: calculatedItems,
    subtotal,
    taxPercent,
    taxAmount,
    totalAmount,
    proposedDeliveryDate: finalDeliveryDate,
    productionLeadTimeDays: productionLeadTimeDays || quotation.productionLeadTimeDays,
    materialAvailability: materialAvailability || quotation.materialAvailability,
    assumptions: assumptions.length ? assumptions : quotation.assumptions,
    riskFactors: riskFactors.length ? riskFactors : quotation.riskFactors,
    notes: notes || `Revision ${nextRevisionNumber} issued`,
    revisedBy: actorUser._id,
    createdAt: new Date(),
  };

  // Preserve history: push to revisions array
  quotation.revisions.push(newRevision);
  quotation.currentRevisionNumber = nextRevisionNumber;
  quotation.items = calculatedItems;
  quotation.subtotal = subtotal;
  quotation.taxPercent = taxPercent;
  quotation.taxAmount = taxAmount;
  quotation.totalAmount = totalAmount;
  quotation.proposedDeliveryDate = finalDeliveryDate;
  if (productionLeadTimeDays) quotation.productionLeadTimeDays = productionLeadTimeDays;
  if (materialAvailability) quotation.materialAvailability = materialAvailability;
  if (assumptions?.length) quotation.assumptions = assumptions;
  if (riskFactors?.length) quotation.riskFactors = riskFactors;
  quotation.adminNotes = notes;
  quotation.status = 'REVISED';

  // Reset customer decision back to pending since this is a new offer
  quotation.customerDecision = {
    decision: 'PENDING',
  };

  await quotation.save();

  // Audit log
  await AuditLog.create({
    actorId: actorUser._id,
    actorRole: actorUser.role,
    action: 'QUOTATION_REVISED',
    entityType: 'Quotation',
    entityId: quotation._id,
    newState: { revisionNumber: nextRevisionNumber, totalAmount, status: 'REVISED' },
    notes: `Quotation ${quotation.quotationNumber} revised to revision ${nextRevisionNumber}`,
  });

  // Notify customer
  await createAndSendNotification({
    recipientId: quotation.customerId,
    recipientRole: 'CUSTOMER',
    title: `Revised Quotation ${quotation.quotationNumber} (Rev #${nextRevisionNumber})`,
    message: `Quotation ${quotation.quotationNumber} has been revised with updated terms. Total: ₹${totalAmount.toLocaleString()}.`,
    type: 'QUOTATION_REVISED',
    actionUrl: `/my-quotes?id=${quotation._id}`,
    metadata: { quotationId: quotation._id, revisionNumber: nextRevisionNumber },
  });

  return quotation;
}

/**
 * Handle customer decision (Accept, Reject, or Counter-Offer).
 * BUSINESS RULE: An accepted quotation must not silently change its price, specifications, or delivery commitment.
 */
export async function recordCustomerDecision({
  quotationId,
  customerId,
  decision, // 'ACCEPTED' | 'REJECTED' | 'COUNTER_OFFER'
  customerNotes = '',
  counterOffer = null, // { targetPrice, targetDeliveryDate, notes }
  actorUser,
}) {
  const quotation = await Quotation.findOne({ _id: quotationId, customerId });
  if (!quotation) {
    throw new Error('Quotation not found or does not belong to authenticated customer');
  }

  if (quotation.status === 'CONVERTED_TO_ORDER') {
    throw new Error('Quotation has already been converted to an order and cannot be modified');
  }

  const now = new Date();

  if (decision === 'ACCEPTED') {
    quotation.status = 'CUSTOMER_ACCEPTED';
    quotation.customerDecision = {
      decision: 'ACCEPTED',
      decidedAt: now,
      customerNotes,
      agreedDeliveryDate: quotation.proposedDeliveryDate,
      agreedPrice: quotation.totalAmount,
      decidedBy: actorUser._id,
    };

    await quotation.save();

    // Audit log
    await AuditLog.create({
      actorId: actorUser._id,
      actorRole: 'CUSTOMER',
      action: 'QUOTATION_ACCEPTED_BY_CUSTOMER',
      entityType: 'Quotation',
      entityId: quotation._id,
      previousState: { status: quotation.status },
      newState: { status: 'CUSTOMER_ACCEPTED', agreedPrice: quotation.totalAmount },
      notes: `Customer accepted quotation ${quotation.quotationNumber} for ₹${quotation.totalAmount}`,
    });

    // Notify admins
    const admins = await User.find({ role: 'ADMIN', status: 'ACTIVE' });
    for (const admin of admins) {
      await createAndSendNotification({
        recipientId: admin._id,
        recipientRole: 'ADMIN',
        title: `Quotation ${quotation.quotationNumber} Accepted!`,
        message: `Customer ${actorUser.name} accepted quotation ${quotation.quotationNumber}. Ready for order confirmation.`,
        type: 'QUOTATION_ACCEPTED',
        actionUrl: `/quotations?id=${quotation._id}`,
        metadata: { quotationId: quotation._id, quotationNumber: quotation.quotationNumber },
      });
    }
  } else if (decision === 'REJECTED') {
    quotation.status = 'CUSTOMER_REJECTED';
    quotation.customerDecision = {
      decision: 'REJECTED',
      decidedAt: now,
      customerNotes,
      decidedBy: actorUser._id,
    };

    await quotation.save();

    await AuditLog.create({
      actorId: actorUser._id,
      actorRole: 'CUSTOMER',
      action: 'QUOTATION_REJECTED_BY_CUSTOMER',
      entityType: 'Quotation',
      entityId: quotation._id,
      notes: `Customer rejected quotation ${quotation.quotationNumber}: ${customerNotes}`,
    });

    // Notify admins
    const admins = await User.find({ role: 'ADMIN', status: 'ACTIVE' });
    for (const admin of admins) {
      await createAndSendNotification({
        recipientId: admin._id,
        recipientRole: 'ADMIN',
        title: `Quotation ${quotation.quotationNumber} Declined`,
        message: `Customer ${actorUser.name} declined quotation ${quotation.quotationNumber}. Notes: ${customerNotes}`,
        type: 'QUOTATION_REJECTED',
        actionUrl: `/quotations?id=${quotation._id}`,
        metadata: { quotationId: quotation._id },
      });
    }
  } else if (decision === 'COUNTER_OFFER') {
    quotation.customerDecision = {
      decision: 'COUNTER_OFFER',
      decidedAt: now,
      customerNotes,
      counterOffer: {
        targetPrice: counterOffer?.targetPrice,
        targetDeliveryDate: counterOffer?.targetDeliveryDate ? new Date(counterOffer.targetDeliveryDate) : null,
        notes: counterOffer?.notes || customerNotes,
      },
      decidedBy: actorUser._id,
    };

    await quotation.save();

    await AuditLog.create({
      actorId: actorUser._id,
      actorRole: 'CUSTOMER',
      action: 'QUOTATION_COUNTER_OFFER_SUBMITTED',
      entityType: 'Quotation',
      entityId: quotation._id,
      notes: `Customer requested revision / counter-offer on ${quotation.quotationNumber}: Target Price ₹${counterOffer?.targetPrice || 'N/A'}`,
    });

    // Notify admins
    const admins = await User.find({ role: 'ADMIN', status: 'ACTIVE' });
    for (const admin of admins) {
      await createAndSendNotification({
        recipientId: admin._id,
        recipientRole: 'ADMIN',
        title: `Revision Requested on Quotation ${quotation.quotationNumber}`,
        message: `Customer ${actorUser.name} submitted a counter-offer: ${customerNotes}`,
        type: 'QUOTATION_COUNTER_OFFER',
        actionUrl: `/quotations?id=${quotation._id}`,
        metadata: { quotationId: quotation._id, counterOffer },
      });
    }
  }

  return quotation;
}

