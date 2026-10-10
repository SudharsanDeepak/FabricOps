import {
  addToFinishedGoods,
  reserveRollsForDispatch,
  releaseReservedRolls,
  createDispatch,
  updateDeliveryStatus,
  recordCustomerPayment,
  getDispatches,
  getDispatchById,
  getInvoices,
  getInvoiceById,
  getFinishedGoods,
  getDispatchDashboardMetrics,
} from '../services/dispatch.service.js';

export const addToFinishedGoodsHandler = async (req, res, next) => {
  try {
    const item = await addToFinishedGoods({
      ...req.body,
      actorUser: req.user,
    });
    res.status(201).json({
      success: true,
      message: `Roll ${item.rollNumber} added to finished goods inventory`,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

export const getFinishedGoodsHandler = async (req, res, next) => {
  try {
    const { orderId, status, grade, search, page, limit } = req.query;
    const result = await getFinishedGoods({
      orderId,
      status,
      grade,
      search,
      page,
      limit,
    });
    res.json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const reserveRollsHandler = async (req, res, next) => {
  try {
    const { orderId, rollIds } = req.body;
    const result = await reserveRollsForDispatch({
      orderId,
      rollIds,
      actorUser: req.user,
    });
    res.json({
      success: true,
      message: `Reserved ${result.reservedCount} rolls for dispatch`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const releaseRollsHandler = async (req, res, next) => {
  try {
    const { rollIds } = req.body;
    const result = await releaseReservedRolls({
      rollIds,
      actorUser: req.user,
    });
    res.json({
      success: true,
      message: `Released ${result.releasedCount} reserved rolls back to available`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const createDispatchHandler = async (req, res, next) => {
  try {
    const result = await createDispatch({
      ...req.body,
      actorUser: req.user,
    });
    res.status(201).json({
      success: true,
      message: result.isDuplicate
        ? `Duplicate request intercepted: dispatch ${result.dispatch.dispatchNumber} already exists`
        : `Dispatch ${result.dispatch.dispatchNumber} created successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getDispatchesHandler = async (req, res, next) => {
  try {
    const { orderId, status, search, page, limit } = req.query;
    // If user is a customer, strictly isolate to their own dispatches
    const customerId = req.user.role === 'CUSTOMER' ? req.user._id : req.query.customerId;

    const result = await getDispatches({
      customerId,
      orderId,
      status,
      search,
      page,
      limit,
    });
    res.json({
      success: true,
      data: result.dispatches,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getDispatchByIdHandler = async (req, res, next) => {
  try {
    const customerId = req.user.role === 'CUSTOMER' ? req.user._id : null;
    const result = await getDispatchById(req.params.id, customerId);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDeliveryStatusHandler = async (req, res, next) => {
  try {
    const dispatch = await updateDeliveryStatus({
      dispatchId: req.params.id,
      ...req.body,
      actorUser: req.user,
    });
    res.json({
      success: true,
      message: `Dispatch ${dispatch.dispatchNumber} status updated to ${dispatch.status}`,
      data: dispatch,
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoicesHandler = async (req, res, next) => {
  try {
    const { orderId, paymentStatus, search, page, limit } = req.query;
    // Customer isolation
    const customerId = req.user.role === 'CUSTOMER' ? req.user._id : req.query.customerId;

    const result = await getInvoices({
      customerId,
      orderId,
      paymentStatus,
      search,
      page,
      limit,
    });
    res.json({
      success: true,
      data: result.invoices,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceByIdHandler = async (req, res, next) => {
  try {
    const customerId = req.user.role === 'CUSTOMER' ? req.user._id : null;
    const result = await getInvoiceById(req.params.id, customerId);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const recordCustomerPaymentHandler = async (req, res, next) => {
  try {
    const result = await recordCustomerPayment({
      invoiceId: req.params.id,
      ...req.body,
      actorUser: req.user,
    });
    res.status(201).json({
      success: true,
      message: `Payment ${result.payment.paymentNumber} recorded successfully. Invoice status: ${result.invoice.paymentStatus}`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getDispatchDashboardMetricsHandler = async (req, res, next) => {
  try {
    const metrics = await getDispatchDashboardMetrics();
    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
};

