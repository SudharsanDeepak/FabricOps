import { Order, Quotation, CustomerProfile, User } from '../models/index.js';
import { confirmOrderTransaction } from '../services/transaction.service.js';
import { createAndSendNotification } from '../services/notification.service.js';
import { logger } from '../config/logger.js';

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
      message: `Your fabric order ${order.orderNumber} has been officially locked into the Everest Mills production schedule. Target dispatch: ${new Date(order.confirmedDeliveryDate).toISOString().split('T')[0]}.`,
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
        companyName: 'Everest Textile Mills Limited',
        division: 'Weaving & Dyeing Operations',
        gstin: '33AAACE2026M1Z8',
        cin: 'L17111TZ2026PLC009988',
        millAddress: 'SF 42/1, Sengunthar Industrial Corridor, Tirupur, Tamil Nadu - 641602, India',
        phone: '+91 (421) 224-5500',
        email: 'orders@everesttextiles.com',
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

