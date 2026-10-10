import { Notification, User } from '../models/index.js';
import { broadcastEvent } from '../sockets/socketManager.js';
import { logger } from '../config/logger.js';

/**
 * Dispatches a notification: persists in MongoDB and emits a real-time socket event.
 * Safely avoids duplicate alerts for the same event via unique eventReference.
 */
export async function createAndSendNotification({
  recipientId,
  recipientRole,
  title,
  message,
  type,
  priority = 'MEDIUM',
  eventReference,
  actionUrl,
  metadata = {},
}) {
  try {
    // If eventReference is provided, check for existing notification to prevent duplicate alerts
    if (eventReference) {
      const existing = await Notification.findOne({ eventReference });
      if (existing) {
        logger.debug(`Duplicate alert suppressed for eventReference: ${eventReference}`);
        return existing;
      }
    }

    const notification = await Notification.create({
      recipientId,
      recipientRole,
      title,
      message,
      type,
      priority,
      eventReference: eventReference || undefined,
      actionUrl,
      metadata,
    });

    // Real-Time Socket.IO Broadcast
    try {
      broadcastEvent(`user:${recipientId}`, 'notification', notification);
      broadcastEvent(`role:${recipientRole}`, 'notification', notification);
      broadcastEvent(null, 'notification:broadcast', {
        type,
        title,
        recipientRole,
        recipientId,
      });
    } catch (sockErr) {
      logger.debug(`Socket broadcast skipped or failed: ${sockErr.message}`);
    }

    return notification;
  } catch (error) {
    // Handle duplicate key error gracefully
    if (error.code === 11000 && eventReference) {
      const existing = await Notification.findOne({ eventReference });
      return existing;
    }
    logger.error(`Failed to create notification: ${error.message}`);
    return null;
  }
}

/**
 * Helper to notify all admin users of a critical event.
 */
export async function notifyAllAdmins({
  title,
  message,
  type,
  priority = 'HIGH',
  eventReference,
  actionUrl,
  metadata = {},
}) {
  const admins = await User.find({ role: 'ADMIN', status: 'ACTIVE' }).select('_id');
  const notifications = [];

  for (const admin of admins) {
    const adminEventRef = eventReference ? `${eventReference}-admin-${admin._id}` : undefined;
    const notif = await createAndSendNotification({
      recipientId: admin._id,
      recipientRole: 'ADMIN',
      title,
      message,
      type,
      priority,
      eventReference: adminEventRef,
      actionUrl,
      metadata,
    });
    if (notif) notifications.push(notif);
  }

  return notifications;
}

// =============================================================================
// BUSINESS EVENT NOTIFICATION DISPATCHERS
// =============================================================================

export async function notifyNewOrderRequest(orderRequest) {
  return notifyAllAdmins({
    title: 'New Customer Order Request',
    message: `Inquiry submitted for ${orderRequest.fabricType || 'Custom Fabric'} (${orderRequest.quantity || 1000}m) by customer.`,
    type: 'ORDER_REQUEST_SUBMITTED',
    priority: 'MEDIUM',
    eventReference: `EVT-ORDER-REQ-${orderRequest._id}`,
    actionUrl: `/quotations?requestId=${orderRequest._id}`,
    metadata: { orderRequestId: orderRequest._id },
  });
}

export async function notifyQuotationEvent(quotation, eventType, actorName = 'Customer') {
  let title = 'Quotation Update';
  let message = `Quotation ${quotation.quotationNumber || quotation._id} status changed to ${eventType}`;
  let type = 'QUOTATION_PROPOSED';
  let priority = 'MEDIUM';

  if (eventType === 'PROPOSED') {
    title = 'Quotation Issued';
    message = `Commercial quote ${quotation.quotationNumber} has been issued by mill with lead time and pricing.`;
    type = 'QUOTATION_PROPOSED';
    return createAndSendNotification({
      recipientId: quotation.customerId,
      recipientRole: 'CUSTOMER',
      title,
      message,
      type,
      priority: 'HIGH',
      eventReference: `EVT-QUOTE-PROP-${quotation._id}-${quotation.version || 1}`,
      actionUrl: `/my-quotes`,
      metadata: { quotationId: quotation._id },
    });
  } else if (eventType === 'REVISED') {
    title = 'Quotation Revised';
    message = `Revised commercial terms proposed for Quote ${quotation.quotationNumber}.`;
    type = 'QUOTATION_REVISED';
    return createAndSendNotification({
      recipientId: quotation.customerId,
      recipientRole: 'CUSTOMER',
      title,
      message,
      type,
      priority: 'HIGH',
      eventReference: `EVT-QUOTE-REV-${quotation._id}-${quotation.version || 1}`,
      actionUrl: `/my-quotes`,
      metadata: { quotationId: quotation._id },
    });
  } else if (eventType === 'ACCEPTED') {
    title = 'Quotation Accepted by Buyer';
    message = `${actorName} accepted Quotation ${quotation.quotationNumber}. Final order confirmation pending.`;
    type = 'QUOTATION_ACCEPTED';
    priority = 'HIGH';
  } else if (eventType === 'DECLINED') {
    title = 'Quotation Declined';
    message = `${actorName} declined Quotation ${quotation.quotationNumber}.`;
    type = 'QUOTATION_REJECTED';
    priority = 'MEDIUM';
  }

  return notifyAllAdmins({
    title,
    message,
    type,
    priority,
    eventReference: `EVT-QUOTE-${eventType}-${quotation._id}-${quotation.version || 1}`,
    actionUrl: `/quotations`,
    metadata: { quotationId: quotation._id },
  });
}

export async function notifyMaterialShortage({ inventoryItem, requiredQuantity, shortageQuantity }) {
  return notifyAllAdmins({
    title: 'Critical Yarn Shortage Alert',
    message: `Shortage detected for ${inventoryItem.yarnName || inventoryItem.itemCode || 'Yarn Stock'}. Deficit: ${shortageQuantity} kg.`,
    type: 'MATERIAL_SHORTAGE',
    priority: 'HIGH',
    eventReference: `EVT-SHORTAGE-${inventoryItem._id}-${Date.now().toString().slice(0, 7)}`,
    actionUrl: `/procurement`,
    metadata: { inventoryItemId: inventoryItem._id, shortageQuantity },
  });
}

export async function notifySupplierDeliveryDelayed(purchaseOrder, delayDays = 3) {
  return notifyAllAdmins({
    title: 'Supplier Delivery Delay Warning',
    message: `PO ${purchaseOrder.poNumber} delayed by ${delayDays} days. Potential impact on production routing schedule.`,
    type: 'SUPPLIER_DELIVERY_DELAYED',
    priority: 'HIGH',
    eventReference: `EVT-SUP-DELAY-${purchaseOrder._id}-${delayDays}`,
    actionUrl: `/procurement`,
    metadata: { purchaseOrderId: purchaseOrder._id, delayDays },
  });
}

export async function notifyProductionStageChanged(job, newStage) {
  return notifyAllAdmins({
    title: 'Production Stage Advanced',
    message: `Job ${job.jobNumber} advanced to stage: ${newStage}.`,
    type: 'PRODUCTION_STAGE_CHANGED',
    priority: 'LOW',
    eventReference: `EVT-PROD-STAGE-${job._id}-${newStage}`,
    actionUrl: `/planning`,
    metadata: { jobId: job._id, newStage },
  });
}

export async function notifyMilestoneMissed(order, milestoneDescription) {
  return notifyAllAdmins({
    title: 'Production Milestone Missed',
    message: `Order ${order.orderNumber} missed scheduled milestone: "${milestoneDescription}". High risk of delay.`,
    type: 'PRODUCTION_MILESTONE_MISSED',
    priority: 'CRITICAL',
    eventReference: `EVT-MILESTONE-MISS-${order._id}-${milestoneDescription.slice(0, 15)}`,
    actionUrl: `/control-tower`,
    metadata: { orderId: order._id, milestoneDescription },
  });
}

export async function notifyMachineBreakdown(breakdownReport, machine) {
  return notifyAllAdmins({
    title: 'Loom Breakdown Alert',
    message: `Machine ${machine.machineCode} halted due to ${breakdownReport.breakdownType || 'fault'}: ${breakdownReport.description}.`,
    type: 'BREAKDOWN_ALERT',
    priority: 'CRITICAL',
    eventReference: `EVT-BRK-${breakdownReport._id}`,
    actionUrl: `/machines`,
    metadata: { breakdownReportId: breakdownReport._id, machineId: machine._id },
  });
}

export async function notifyTaskReassigned(job, operatorUser, previousOperatorName) {
  return createAndSendNotification({
    recipientId: operatorUser._id,
    recipientRole: 'OPERATOR',
    title: 'New Machine Task Assigned',
    message: `You have been assigned to Job ${job.jobNumber} on ${job.stage} stage (reassigned from ${previousOperatorName || 'previous operator'}).`,
    type: 'TASK_REASSIGNED',
    priority: 'HIGH',
    eventReference: `EVT-REASSIGN-${job._id}-${operatorUser._id}`,
    actionUrl: `/task-board`,
    metadata: { jobId: job._id },
  });
}

export async function notifyQualityEvent(inspection, eventType) {
  const isPass = eventType === 'PASSED';
  return notifyAllAdmins({
    title: isPass ? 'Fabric Roll Inspection Passed' : 'Fabric Quality Inspection Failure',
    message: isPass
      ? `Roll ${inspection.rollId?.rollNumber || inspection.rollNumber} passed 4-point inspection (${inspection.grade || 'Grade A'}).`
      : `Roll ${inspection.rollId?.rollNumber || inspection.rollNumber} failed inspection: ${inspection.defects?.length || 1} defect(s) logged. Rework required.`,
    type: isPass ? 'QC_PASSED' : 'QUALITY_FAILURE',
    priority: isPass ? 'LOW' : 'HIGH',
    eventReference: `EVT-QC-${inspection._id}-${eventType}`,
    actionUrl: `/qc`,
    metadata: { inspectionId: inspection._id },
  });
}

export async function notifyFinishedGoodsAvailable(fgItem) {
  return notifyAllAdmins({
    title: 'Finished Goods Ready for Staging',
    message: `Roll ${fgItem.fabricRollId?.rollNumber || 'FG Roll'} packed and ready for dispatch in bay ${fgItem.warehouseLocation || 'FG-BAY-A1'}.`,
    type: 'FINISHED_GOODS_AVAILABLE',
    priority: 'MEDIUM',
    eventReference: `EVT-FG-AVAIL-${fgItem._id}`,
    actionUrl: `/dispatch`,
    metadata: { fgItemId: fgItem._id },
  });
}

export async function notifyDispatchShipped(dispatch) {
  // Notify customer
  if (dispatch.customerId) {
    createAndSendNotification({
      recipientId: dispatch.customerId,
      recipientRole: 'CUSTOMER',
      title: 'Consignment Dispatched from Mill',
      message: `Your fabric order has been dispatched via ${dispatch.carrierName} (LR #${dispatch.waybillNumber}). Total meters: ${dispatch.dispatchedMeters}m.`,
      type: 'DISPATCH_SHIPPED',
      priority: 'HIGH',
      eventReference: `EVT-DSP-CUST-${dispatch._id}`,
      actionUrl: `/invoices`,
      metadata: { dispatchId: dispatch._id },
    });
  }

  return notifyAllAdmins({
    title: 'Consignment Outward Gate Cleared',
    message: `Dispatch ${dispatch.dispatchNumber} cleared mill gate via ${dispatch.carrierName} (Veh #${dispatch.vehicleNumber}).`,
    type: 'DISPATCH_SHIPPED',
    priority: 'MEDIUM',
    eventReference: `EVT-DSP-ADM-${dispatch._id}`,
    actionUrl: `/dispatch`,
    metadata: { dispatchId: dispatch._id },
  });
}

export async function notifyInvoiceGenerated(invoice) {
  if (invoice.customerId) {
    createAndSendNotification({
      recipientId: invoice.customerId,
      recipientRole: 'CUSTOMER',
      title: 'Tax Invoice Generated',
      message: `Tax Invoice ${invoice.invoiceNumber} for $${invoice.totalInvoiceAmount?.toFixed(2)} is now available with commercial terms.`,
      type: 'INVOICE_GENERATED',
      priority: 'HIGH',
      eventReference: `EVT-INV-GEN-${invoice._id}`,
      actionUrl: `/invoices`,
      metadata: { invoiceId: invoice._id },
    });
  }
}

export async function notifyPaymentReceived(payment, invoice) {
  return notifyAllAdmins({
    title: 'Customer Settlement Payment Received',
    message: `Payment of $${payment.amountPaid || payment.amount} recorded for Invoice ${invoice?.invoiceNumber || 'INV'} (UTR: ${payment.referenceNumber || payment.paymentReference}).`,
    type: 'PAYMENT_RECEIVED',
    priority: 'MEDIUM',
    eventReference: `EVT-PAY-REC-${payment._id}`,
    actionUrl: `/invoices`,
    metadata: { paymentId: payment._id },
  });
}

export async function notifyDeliveryCompleted(dispatch) {
  if (dispatch.customerId) {
    createAndSendNotification({
      recipientId: dispatch.customerId,
      recipientRole: 'CUSTOMER',
      title: 'Consignment Delivery Completed',
      message: `Consignment ${dispatch.dispatchNumber} has reached destination warehouse and proof of delivery confirmed.`,
      type: 'DELIVERY_COMPLETED',
      priority: 'HIGH',
      eventReference: `EVT-DELV-CUST-${dispatch._id}`,
      actionUrl: `/invoices`,
      metadata: { dispatchId: dispatch._id },
    });
  }
}
