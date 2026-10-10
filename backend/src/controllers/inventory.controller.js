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

