import { Order, OrderRequest, Quotation, CustomerProfile, User, AuditLog, Product, OrderMessage } from '../models/index.js';
import { confirmOrderTransaction } from '../services/transaction.service.js';
import { createAndSendNotification } from '../services/notification.service.js';
import {
  getOrderTimeline,
  updateTimelineStage,
  recalculateOrderEstimates,
} from '../services/timeline.service.js';
import { broadcastEvent } from '../sockets/socketManager.js';
import { logger } from '../config/logger.js';

// ==========================================
// 1. ORDER REQUESTS / CUSTOMER INQUIRIES
// ==========================================

export const createOrderRequest = async (req, res, next) => {
  try {
    const { items, specificationDocuments = [], preferredDeliveryDate, customerNotes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Order request must have at least one fabric line item' },
      });
    }

    // Snapshot fabric specs if not provided
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        if (!item.productId) {
          throw new Error('Product ID is required for each line item');
        }
        const product = await Product.findById(item.productId);
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }

        const snapshot = item.fabricSpecSnapshot || {};
        return {
          productId: product._id,
          fabricSpecSnapshot: {
            gsm: snapshot.gsm || product.fabricSpecification?.gsm,
            weaveType: snapshot.weaveType || product.fabricSpecification?.weaveType,
            composition: snapshot.composition || product.fabricSpecification?.composition,
            yarnCountWarp: snapshot.yarnCountWarp || product.fabricSpecification?.yarnCountWarp,
            yarnCountWeft: snapshot.yarnCountWeft || product.fabricSpecification?.yarnCountWeft,
            construction: snapshot.construction || product.fabricSpecification?.construction,
            widthInches: snapshot.widthInches || product.fabricSpecification?.widthInches,
            colorName: snapshot.colorName || (product.colours?.[0]?.name ?? 'Standard Greige'),
          },
          targetQuantity: Number(item.targetQuantity),
          targetUnit: item.targetUnit || product.measurementUnit || 'METER',
          targetDeliveryDate: item.targetDeliveryDate ? new Date(item.targetDeliveryDate) : undefined,
          targetPricePerUnit: item.targetPricePerUnit ? Number(item.targetPricePerUnit) : undefined,
          notes: item.notes || '',
        };
      })
    );

    const requestNumber = `REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const orderRequest = await OrderRequest.create({
      requestNumber,
      customerId: req.user._id,
      items: enrichedItems,
      specificationDocuments,
      preferredDeliveryDate: preferredDeliveryDate ? new Date(preferredDeliveryDate) : undefined,
      customerNotes,
      status: 'PENDING_REVIEW',
    });

    // Record audit log
    await AuditLog.create({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'ORDER_REQUEST_SUBMITTED',
      entityType: 'OrderRequest',
      entityId: orderRequest._id,
      newState: { requestNumber, status: 'PENDING_REVIEW' },
      notes: `Order inquiry ${requestNumber} submitted with ${enrichedItems.length} items`,
    });

    // Notify admins
    const admins = await User.find({ role: 'ADMIN', status: 'ACTIVE' });
    for (const admin of admins) {
      await createAndSendNotification({
        recipientId: admin._id,
        recipientRole: 'ADMIN',
        title: 'New Fabric Order Inquiry',
        message: `Customer ${req.user.name} submitted Inquiry ${requestNumber} for ${enrichedItems[0].targetQuantity} ${enrichedItems[0].targetUnit}.`,
        type: 'ORDER_REQUEST_SUBMITTED',
        actionUrl: `/quotations?requestId=${orderRequest._id}`,
        metadata: { orderRequestId: orderRequest._id, requestNumber },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Order request submitted successfully for mill evaluation',
      data: orderRequest,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderRequests = async (req, res, next) => {
  try {
    const filter = { ...req.customerFilter };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const requests = await OrderRequest.find(filter)
      .populate('customerId', 'name email phone')
      .populate('items.productId', 'productCode name fabricSpecification pricing')
      .populate('quotationId', 'quotationNumber totalAmount status proposedDeliveryDate')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: requests,
      count: requests.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderRequestById = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, ...req.customerFilter };

    const orderRequest = await OrderRequest.findOne(filter)
      .populate('customerId', 'name email phone')
      .populate('items.productId', 'productCode name fabricSpecification pricing colours')
      .populate('quotationId');

    if (!orderRequest) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order request not found or access denied' },
      });
    }

    res.json({
      success: true,
      data: orderRequest,
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderRequestStatus = async (req, res, next) => {
  try {
    const { status, adminNotes } = req.body;
    const allowed = ['PENDING_REVIEW', 'QUOTED', 'REJECTED', 'CANCELLED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: `Status must be one of: ${allowed.join(', ')}` },
      });
    }

    const orderRequest = await OrderRequest.findById(req.params.id);
    if (!orderRequest) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order request not found' },
      });
    }

    orderRequest.status = status;
    if (adminNotes) orderRequest.adminNotes = adminNotes;
    await orderRequest.save();

    await AuditLog.create({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'ORDER_REQUEST_STATUS_UPDATED',
      entityType: 'OrderRequest',
      entityId: orderRequest._id,
      newState: { status, adminNotes },
      notes: `Order request status transitioned to ${status}`,
    });

    res.json({
      success: true,
      message: `Order request status updated to ${status}`,
      data: orderRequest,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. CONFIRMED ORDERS & DISPATCH DOCUMENTS
// ==========================================

export const confirmOrderHandler = async (req, res, next) => {
  try {
    const { quotationId, customerNotes } = req.body;
    const idempotencyKey = req.body.idempotencyKey || req.headers['idempotency-key'] || null;

    if (!quotationId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Quotation ID is required for order confirmation' },
      });
    }

    const quotation = await Quotation.findById(quotationId);
    if (!quotation) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Quotation not found' },
      });
    }

    // Role verification: Customers can only confirm their own accepted quotes; Admins can confirm on customer behalf
    if (req.user.role === 'CUSTOMER' && quotation.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only confirm quotations issued to your company' },
      });
    }

    // Execute atomic transaction with idempotency controls
    const order = await confirmOrderTransaction({
      quotationId: quotation._id,
      customerId: quotation.customerId,
      actorUser: req.user,
      idempotencyKey,
    });

    // Notify Customer and Admins
    await createAndSendNotification({
      recipientId: quotation.customerId,
      recipientRole: 'CUSTOMER',
      title: `Order ${order.orderNumber} Confirmed!`,
      message: `Your fabric order ${order.orderNumber} has been officially locked into the FabricOps production schedule. Target dispatch: ${new Date(order.confirmedDeliveryDate).toISOString().split('T')[0]}.`,
      type: 'ORDER_CONFIRMED',
      actionUrl: `/my-orders?id=${order._id}`,
      metadata: { orderId: order._id, orderNumber: order.orderNumber },
    });

    const admins = await User.find({ role: 'ADMIN', status: 'ACTIVE' });
    for (const admin of admins) {
      if (admin._id.toString() !== req.user._id.toString()) {
        await createAndSendNotification({
          recipientId: admin._id,
          recipientRole: 'ADMIN',
          title: `Sales Order ${order.orderNumber} Confirmed`,
          message: `Sales order ${order.orderNumber} confirmed for ₹${order.totalAmount.toLocaleString()}. Yarn reserved.`,
          type: 'ORDER_CONFIRMED',
          actionUrl: `/orders?id=${order._id}`,
          metadata: { orderId: order._id, orderNumber: order.orderNumber },
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Order ${order.orderNumber} confirmed successfully`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrdersHandler = async (req, res, next) => {
  try {
    const filter = { ...req.customerFilter };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const orders = await Order.find(filter)
      .populate('customerId', 'name email phone')
      .populate('quotationId', 'quotationNumber validUntil proposedDeliveryDate')
      .populate('items.productId', 'productCode name')
      .populate('productionJobIds')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderByIdHandler = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, ...req.customerFilter };

    const order = await Order.findOne(filter)
      .populate('customerId', 'name email phone')
      .populate('quotationId')
      .populate('items.productId', 'productCode name fabricSpecification colours')
      .populate('productionJobIds');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found or access denied' },
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const getAuthorizedOrderDocument = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, ...req.customerFilter };
    const order = await Order.findOne(filter)
      .populate('customerId', 'name email phone')
      .populate('items.productId')
      .populate('quotationId');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order document not found or access denied' },
      });
    }

    const customerProfile = await CustomerProfile.findOne({ userId: order.customerId._id });

    const documentPayload = {
      documentType: 'OFFICIAL_ORDER_CONFIRMATION',
      documentNumber: `DOC-CONF-${order.orderNumber}`,
      issuedDate: order.createdAt,
      millDetails: {
        companyName: 'FabricOps Limited',
        division: 'Weaving & Dyeing Operations',
        gstin: '33AAACE2026M1Z8',
        cin: 'L17111TZ2026PLC009988',
        millAddress: 'SF 42/1, Sengunthar Industrial Corridor, Tirupur, Tamil Nadu - 641602, India',
        phone: '+91 (421) 224-5500',
        email: 'orders@fabricops.com',
      },
      buyerDetails: {
        companyName: customerProfile?.companyName || order.customerId.name,
        customerCode: customerProfile?.customerCode || 'CUST-APEX',
        gstin: customerProfile?.taxId || 'Registered B2B Buyer',
        billingAddress: customerProfile?.billingAddress || {
          street: 'Industrial Zone',
          city: 'Chennai',
          state: 'Tamil Nadu',
          postalCode: '600001',
          country: 'India',
        },
        shippingAddress: customerProfile?.shippingAddress || {
          street: 'Warehouse Hub',
          city: 'Kanchipuram',
          state: 'Tamil Nadu',
          postalCode: '602105',
          country: 'India',
        },
        contactPerson: customerProfile?.contactPerson || {
          name: order.customerId.name,
          phone: order.customerId.phone,
          email: order.customerId.email,
        },
      },
      orderDetails: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        quotationNumber: order.quotationId?.quotationNumber || 'DIRECT-CONF',
        confirmedDeliveryDate: order.confirmedDeliveryDate,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentTerms: customerProfile ? `Net ${customerProfile.paymentTermsDays} Days` : 'Net 30 Days',
        specificationsValidated: order.specificationsValidated,
        capacityValidated: order.capacityValidated,
      },
      lineItems: order.items.map((item, idx) => ({
        itemNumber: idx + 1,
        productName: item.productId?.name || 'Custom Woven Fabric',
        productCode: item.productId?.productCode || 'FAB-CUSTOM',
        specifications: {
          gsm: item.fabricSpecSnapshot?.gsm,
          weaveType: item.fabricSpecSnapshot?.weaveType,
          composition: item.fabricSpecSnapshot?.composition,
          yarnCountWarp: item.fabricSpecSnapshot?.yarnCountWarp,
          yarnCountWeft: item.fabricSpecSnapshot?.yarnCountWeft,
          construction: item.fabricSpecSnapshot?.construction,
          widthInches: item.fabricSpecSnapshot?.widthInches,
          colorName: item.fabricSpecSnapshot?.colorName,
        },
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      financials: {
        subtotal: order.subtotal,
        taxPercent: 5,
        taxAmount: order.taxAmount,
        totalAmount: order.totalAmount,
        currency: 'INR',
      },
      commercialTerms: [
        'Fabric inspected according to ASTM D5430 standard 4-Point quality scoring system.',
        'Moisture regain tolerance: +/- 2.5% according to ISO 139 standard.',
        'Payment terms as mutually acknowledged in buyer profile.',
        'Dispatches accompanied by physical mill gate pass, barcode roll stickers, and digital tax invoice.',
      ],
      millAuthorizedSignatory: {
        name: 'Prakash Sharma',
        designation: 'General Manager — Operations & Sales',
        signedAt: order.createdAt,
        digitalSignatureHash: `SHA256:${order._id}:${order.totalAmount}`,
      },
    };

    res.json({
      success: true,
      data: documentPayload,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderTimelineHandler = async (req, res, next) => {
  try {
    const timeline = await getOrderTimeline(req.params.id, req.user);
    res.json({
      success: true,
      data: timeline,
    });
  } catch (error) {
    if (error.message.includes('Cross-customer') || error.message.includes('prohibited')) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: error.message },
      });
    }
    next(error);
  }
};

export const updateTimelineStageHandler = async (req, res, next) => {
  try {
    const result = await updateTimelineStage({
      orderId: req.params.id,
      ...req.body,
      actorUser: req.user,
    });

    res.json({
      success: true,
      message: 'Timeline milestone updated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const recalculateOrderEstimatesHandler = async (req, res, next) => {
  try {
    const result = await recalculateOrderEstimates(req.params.id, req.body);
    res.json({
      success: true,
      message: 'Order estimates dynamically recalculated',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. ORDER / INQUIRY MESSAGE THREADS
// ==========================================

async function verifyThreadAccess(threadType, referenceId, user) {
  if (user.role === 'ADMIN') return { hasAccess: true, customerId: null, refDoc: null };

  let doc = null;
  if (threadType === 'ORDER_REQUEST') {
    doc = await OrderRequest.findById(referenceId);
  } else if (threadType === 'QUOTATION') {
    doc = await Quotation.findById(referenceId);
  } else if (threadType === 'ORDER') {
    doc = await Order.findById(referenceId);
  }

  if (!doc) {
    return { hasAccess: false, notFound: true };
  }

  const isOwner = doc.customerId.toString() === user._id.toString();
  return { hasAccess: isOwner, customerId: doc.customerId, refDoc: doc };
}

export const getThreadMessages = async (req, res, next) => {
  try {
    const { threadType, referenceId } = req.params;

    const access = await verifyThreadAccess(threadType, referenceId, req.user);
    if (access.notFound) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Thread reference document not found' },
      });
    }

    if (!access.hasAccess) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied: You are not authorized to view this message thread' },
      });
    }

    const messages = await OrderMessage.find({ threadType, referenceId })
      .populate('senderId', 'name email role')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: messages,
      count: messages.length,
    });
  } catch (error) {
    next(error);
  }
};

export const postThreadMessage = async (req, res, next) => {
  try {
    const { threadType, referenceId } = req.params;
    const { message, attachments = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Message content cannot be blank' },
      });
    }

    const access = await verifyThreadAccess(threadType, referenceId, req.user);
    if (access.notFound) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Thread reference document not found' },
      });
    }

    if (!access.hasAccess) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied: You are not authorized to message on this document' },
      });
    }

    const newMessage = await OrderMessage.create({
      threadType,
      referenceId,
      senderId: req.user._id,
      senderRole: req.user.role,
      senderName: req.user.name,
      message: message.trim(),
      attachments,
    });

    // Real-time broadcast to room for active viewers
    try {
      broadcastEvent(`thread:${referenceId}`, 'new_message', newMessage);
    } catch (e) {
      // Ignored
    }

    // Send notifications to counterpart
    if (req.user.role === 'CUSTOMER') {
      const admins = await User.find({ role: 'ADMIN', status: 'ACTIVE' });
      for (const admin of admins) {
        await createAndSendNotification({
          recipientId: admin._id,
          recipientRole: 'ADMIN',
          title: `New Message from ${req.user.name}`,
          message: `${req.user.name} on ${threadType.toLowerCase().replace('_', ' ')}: "${message.substring(0, 80)}..."`,
          type: 'MESSAGE_RECEIVED',
          actionUrl: `/quotations?id=${referenceId}`,
          metadata: { threadType, referenceId, messageId: newMessage._id },
        });
      }
    } else if (req.user.role === 'ADMIN' && access.customerId) {
      await createAndSendNotification({
        recipientId: access.customerId,
        recipientRole: 'CUSTOMER',
        title: 'New Message from FabricOps Admin',
        message: `FabricOps team: "${message.substring(0, 80)}..."`,
        type: 'MESSAGE_RECEIVED',
        actionUrl: `/my-quotes?id=${referenceId}`,
        metadata: { threadType, referenceId, messageId: newMessage._id },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: newMessage,
    });
  } catch (error) {
    next(error);
  }
};
