import { Quotation, OrderRequest, Product } from '../models/index.js';
import {
  evaluateFeasibilityForSpecs,
  createQuotation,
  reviseQuotation,
  recordCustomerDecision,
} from '../services/quotation.service.js';

export const getFeasibilityCheck = async (req, res, next) => {
  try {
    const { orderRequestId, productId, quantity, gsm, widthInches, yarnCountWarp, yarnCountWeft } = req.query;

    let targetSpecs = {
      gsm: gsm ? Number(gsm) : 120,
      widthInches: widthInches ? Number(widthInches) : 58,
      yarnCountWarp,
      yarnCountWeft,
    };
    let targetQuantity = quantity ? Number(quantity) : 1000;

    if (orderRequestId) {
      const orderRequest = await OrderRequest.findById(orderRequestId).populate('items.productId');
      if (!orderRequest) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Order request not found' },
        });
      }
      const item = orderRequest.items[0];
      if (item) {
        targetSpecs = {
          gsm: item.fabricSpecSnapshot?.gsm || item.productId?.fabricSpecification?.gsm || 120,
          widthInches: item.fabricSpecSnapshot?.widthInches || item.productId?.fabricSpecification?.widthInches || 58,
          yarnCountWarp: item.fabricSpecSnapshot?.yarnCountWarp || item.productId?.fabricSpecification?.yarnCountWarp,
          yarnCountWeft: item.fabricSpecSnapshot?.yarnCountWeft || item.productId?.fabricSpecification?.yarnCountWeft,
          weaveType: item.fabricSpecSnapshot?.weaveType || item.productId?.fabricSpecification?.weaveType,
          composition: item.fabricSpecSnapshot?.composition || item.productId?.fabricSpecification?.composition,
        };
        targetQuantity = item.targetQuantity || 1000;
      }
    } else if (productId) {
      const product = await Product.findById(productId);
      if (product) {
        targetSpecs = {
          gsm: product.fabricSpecification?.gsm || 120,
          widthInches: product.fabricSpecification?.widthInches || 58,
          yarnCountWarp: product.fabricSpecification?.yarnCountWarp,
          yarnCountWeft: product.fabricSpecification?.yarnCountWeft,
          weaveType: product.fabricSpecification?.weaveType,
          composition: product.fabricSpecification?.composition,
        };
      }
    }

    const feasibility = await evaluateFeasibilityForSpecs({
      fabricSpecs: targetSpecs,
      quantity: targetQuantity,
    });

    res.json({
      success: true,
      data: {
        targetSpecs,
        targetQuantity,
        ...feasibility,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createQuotationHandler = async (req, res, next) => {
  try {
    const {
      orderRequestId,
      customerId,
      items,
      taxPercent,
      proposedDeliveryDate,
      productionLeadTimeDays,
      validUntilDays,
      materialAvailability,
      assumptions,
      riskFactors,
      adminNotes,
    } = req.body;

    if (!customerId || !items || !items.length) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Customer ID and at least one item are required' },
      });
    }

    const quotation = await createQuotation({
      orderRequestId,
      customerId,
      items,
      taxPercent: taxPercent !== undefined ? Number(taxPercent) : 5,
      proposedDeliveryDate,
      productionLeadTimeDays,
      validUntilDays,
      materialAvailability,
      assumptions,
      riskFactors,
      adminNotes,
      createdBy: req.user,
    });

    res.status(201).json({
      success: true,
      message: `Quotation ${quotation.quotationNumber} issued successfully`,
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
};

export const getQuotationsHandler = async (req, res, next) => {
  try {
    const filter = { ...req.customerFilter };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const quotations = await Quotation.find(filter)
      .populate('customerId', 'name email phone')
      .populate('orderRequestId', 'requestNumber')
      .populate('items.productId', 'productCode name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: quotations,
      count: quotations.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getQuotationByIdHandler = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, ...req.customerFilter };

    const quotation = await Quotation.findOne(filter)
      .populate('customerId', 'name email phone')
      .populate('orderRequestId')
      .populate('items.productId', 'productCode name fabricSpecification pricing colours')
      .populate('revisions.revisedBy', 'name role')
      .populate('createdBy', 'name email');

    if (!quotation) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Quotation not found or access denied' },
      });
    }

    res.json({
      success: true,
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
};

export const reviseQuotationHandler = async (req, res, next) => {
  try {
    const {
      items,
      taxPercent,
      proposedDeliveryDate,
      productionLeadTimeDays,
      materialAvailability,
      assumptions,
      riskFactors,
      notes,
    } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'At least one line item is required for revision' },
      });
    }

    const quotation = await reviseQuotation({
      quotationId: req.params.id,
      items,
      taxPercent: taxPercent !== undefined ? Number(taxPercent) : 5,
      proposedDeliveryDate,
      productionLeadTimeDays,
      materialAvailability,
      assumptions,
      riskFactors,
      notes,
      actorUser: req.user,
    });

    res.json({
      success: true,
      message: `Quotation ${quotation.quotationNumber} revised to revision #${quotation.currentRevisionNumber}`,
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
};

export const customerDecisionHandler = async (req, res, next) => {
  try {
    const { decision, customerNotes, counterOffer } = req.body;

    const allowed = ['ACCEPTED', 'REJECTED', 'COUNTER_OFFER'];
    if (!allowed.includes(decision)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DECISION', message: `Decision must be one of: ${allowed.join(', ')}` },
      });
    }

    const quotation = await recordCustomerDecision({
      quotationId: req.params.id,
      customerId: req.user._id,
      decision,
      customerNotes,
      counterOffer,
      actorUser: req.user,
    });

    res.json({
      success: true,
      message: `Quotation decision recorded: ${decision}`,
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
};

