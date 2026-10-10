import {
  createPurchaseRequest,
  getPurchaseRequests,
  approvePurchaseRequest,
  rejectPurchaseRequest,
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  cancelPurchaseOrder,
  getSuppliers,
  createSupplier,
  getProcurementOverview,
} from '../services/procurement.service.js';

export const createPurchaseRequestHandler = async (req, res, next) => {
  try {
    const { inventoryItemId, requiredQuantity, unit, reason, relatedOrderId, notes } = req.body;
    const pr = await createPurchaseRequest({
      inventoryItemId,
      requiredQuantity,
      unit,
      reason,
      relatedOrderId,
      notes,
      actorUser: req.user,
    });
    res.status(201).json({
      success: true,
      message: `Purchase request ${pr.requestNumber} created successfully`,
      data: pr,
    });
  } catch (error) {
    next(error);
  }
};

export const getPurchaseRequestsHandler = async (req, res, next) => {
  try {
    const { status } = req.query;
    const requests = await getPurchaseRequests({ status });
    res.json({
      success: true,
      data: requests,
      count: requests.length,
    });
  } catch (error) {
    next(error);
  }
};

export const approvePurchaseRequestHandler = async (req, res, next) => {
  try {
    const pr = await approvePurchaseRequest(req.params.id, req.user);
    res.json({
      success: true,
      message: `Purchase request ${pr.requestNumber} approved`,
      data: pr,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectPurchaseRequestHandler = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const pr = await rejectPurchaseRequest(req.params.id, reason, req.user);
    res.json({
      success: true,
      message: `Purchase request ${pr.requestNumber} rejected`,
      data: pr,
    });
  } catch (error) {
    next(error);
  }
};

export const createPurchaseOrderHandler = async (req, res, next) => {
  try {
    const {
      supplierId,
      purchaseRequestId,
      items,
      expectedDeliveryDate,
      allowOverReceipt,
      overReceiptReason,
      notes,
    } = req.body;

    const po = await createPurchaseOrder({
      supplierId,
      purchaseRequestId,
      items,
      expectedDeliveryDate,
      allowOverReceipt,
      overReceiptReason,
      notes,
      actorUser: req.user,
    });

    res.status(201).json({
      success: true,
      message: `Purchase order ${po.poNumber} issued successfully`,
      data: po,
    });
  } catch (error) {
    next(error);
  }
};

export const getPurchaseOrdersHandler = async (req, res, next) => {
  try {
    const { supplierId, status } = req.query;
    const orders = await getPurchaseOrders({ supplierId, status });
    res.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getPurchaseOrderByIdHandler = async (req, res, next) => {
  try {
    const po = await getPurchaseOrderById(req.params.id);
    res.json({
      success: true,
      data: po,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelPurchaseOrderHandler = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const po = await cancelPurchaseOrder(req.params.id, reason, req.user);
    res.json({
      success: true,
      message: `Purchase order ${po.poNumber} cancelled`,
      data: po,
    });
  } catch (error) {
    next(error);
  }
};

export const getSuppliersHandler = async (req, res, next) => {
  try {
    const suppliers = await getSuppliers();
    res.json({
      success: true,
      data: suppliers,
      count: suppliers.length,
    });
  } catch (error) {
    next(error);
  }
};

export const createSupplierHandler = async (req, res, next) => {
  try {
    const supplier = await createSupplier(req.body);
    res.status(201).json({
      success: true,
      message: `Supplier ${supplier.name} added successfully`,
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
};

export const getProcurementOverviewHandler = async (req, res, next) => {
  try {
    const overview = await getProcurementOverview();
    res.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    next(error);
  }
};

