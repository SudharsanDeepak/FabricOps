import {
  evaluateProductionReadiness,
  createProductionPlan,
  rescheduleProductionPlan,
  updateProductionPlanStatus,
  getProductionPlans,
  getProductionPlanById,
  getPlanningOverview,
} from '../services/planning.service.js';
import { getAdminControlTowerOverview } from '../services/timeline.service.js';

export const evaluateReadinessHandler = async (req, res, next) => {
  try {
    const { orderId } = req.query;
    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Order ID is required to evaluate readiness' },
      });
    }

    const readiness = await evaluateProductionReadiness(orderId);
    res.json({
      success: true,
      data: readiness,
    });
  } catch (error) {
    next(error);
  }
};

export const createPlanHandler = async (req, res, next) => {
  try {
    const { orderId, plannedStartDate, plannedCompletionDate, stages, status, notes } = req.body;
    const plan = await createProductionPlan({
      orderId,
      plannedStartDate,
      plannedCompletionDate,
      stages,
      status,
      notes,
      actorUser: req.user,
    });

    res.status(201).json({
      success: true,
      message: `Production plan ${plan.planNumber} created successfully`,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

export const reschedulePlanHandler = async (req, res, next) => {
  try {
    const { newStartDate, newCompletionDate, reason } = req.body;
    const plan = await rescheduleProductionPlan({
      planId: req.params.id,
      newStartDate,
      newCompletionDate,
      reason,
      actorUser: req.user,
    });

    res.json({
      success: true,
      message: `Production plan ${plan.planNumber} rescheduled successfully`,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePlanStatusHandler = async (req, res, next) => {
  try {
    const { status } = req.body;
    const plan = await updateProductionPlanStatus({
      planId: req.params.id,
      status,
      actorUser: req.user,
    });

    res.json({
      success: true,
      message: `Production plan ${plan.planNumber} status updated to ${status}`,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

export const getPlansHandler = async (req, res, next) => {
  try {
    const { orderId, status } = req.query;
    const plans = await getProductionPlans({ orderId, status });
    res.json({
      success: true,
      data: plans,
      count: plans.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getPlanByIdHandler = async (req, res, next) => {
  try {
    const plan = await getProductionPlanById(req.params.id);
    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

export const getPlanningOverviewHandler = async (req, res, next) => {
  try {
    const overview = await getPlanningOverview();
    res.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminControlTowerHandler = async (req, res, next) => {
  try {
    const data = await getAdminControlTowerOverview();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

