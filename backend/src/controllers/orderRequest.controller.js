import { OrderRequest, User, AuditLog, Product } from '../models/index.js';
import { createAndSendNotification } from '../services/notification.service.js';
import { logger } from '../config/logger.js';

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

