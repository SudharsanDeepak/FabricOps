import {
  getInventoryStockLevels,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  recordGoodsReceiptTransaction,
  issueMaterialToProduction,
  adjustStockPhysicalAudit,
  getStockMovements,
  getShortageSummary,
} from '../services/inventory.service.js';

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

// ==========================================
// 1. INVENTORY STOCK & RAW MATERIALS
// ==========================================

export const getInventoryHandler = async (req, res, next) => {
  try {
    const { search, category, lowStockOnly } = req.query;
    const result = await getInventoryStockLevels({ search, category, lowStockOnly });
    res.json({
      success: true,
      data: result.items,
      summary: result.summary,
    });
  } catch (error) {
    next(error);
  }
};

export const getInventoryItemByIdHandler = async (req, res, next) => {
  try {
    const item = await getInventoryItemById(req.params.id);
    res.json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

export const createInventoryItemHandler = async (req, res, next) => {
  try {
    const item = await createInventoryItem(req.body, req.user);
    res.status(201).json({
      success: true,
      message: `Inventory item ${item.sku} created successfully`,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

export const updateInventoryItemHandler = async (req, res, next) => {
  try {
    const item = await updateInventoryItem(req.params.id, req.body, req.user);
    res.json({
      success: true,
      message: `Inventory item ${item.sku} updated successfully`,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

export const recordGoodsReceiptHandler = async (req, res, next) => {
  try {
    const {
      purchaseOrderId,
      deliveryChallanNumber,
      receivedDate,
      items,
      allowOverReceipt,
      overReceiptReason,
      remarks,
    } = req.body;

    const result = await recordGoodsReceiptTransaction({
      purchaseOrderId,
      deliveryChallanNumber,
      receivedDate,
      items,
      allowOverReceipt,
      overReceiptReason,
      remarks,
      actorUser: req.user,
    });

    res.status(201).json({
      success: true,
      message: `Goods receipt ${result.goodsReceipt.grnNumber} recorded successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const issueMaterialHandler = async (req, res, next) => {
  try {
    const { orderId, productionJobId, inventoryItemId, quantity, unit, reason } = req.body;
    const result = await issueMaterialToProduction({
      orderId,
      productionJobId,
      inventoryItemId,
      quantity,
      unit,
      reason,
      actorUser: req.user,
    });

    res.status(201).json({
      success: true,
      message: `Material successfully issued to production`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const adjustStockHandler = async (req, res, next) => {
  try {
    const { inventoryItemId, deltaAmount, reason } = req.body;
    const result = await adjustStockPhysicalAudit({
      inventoryItemId,
      deltaAmount,
      reason,
      actorUser: req.user,
    });

    res.json({
      success: true,
      message: `Stock successfully adjusted for ${result.inventoryItem.sku}`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getStockMovementsHandler = async (req, res, next) => {
  try {
    const { inventoryItemId, movementType, limit, page } = req.query;
    const result = await getStockMovements({ inventoryItemId, movementType, limit, page });
    res.json({
      success: true,
      data: result.movements,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getShortageSummaryHandler = async (req, res, next) => {
  try {
    const result = await getShortageSummary();
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. PROCUREMENT & PURCHASE ORDERS
// ==========================================

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
