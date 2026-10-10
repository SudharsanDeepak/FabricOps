import {
  getAdminDashboardAnalytics,
  getCustomerDashboardAnalytics,
  getOperatorDashboardAnalytics,
} from '../services/analytics.service.js';

/**
 * Controller to fetch Admin executive dashboard analytics
 */
export async function getAdminDashboard(req, res, next) {
  try {
    const data = await getAdminDashboardAnalytics();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to fetch Customer dashboard analytics (scoped to logged-in customer)
 */
export async function getCustomerDashboard(req, res, next) {
  try {
    const customerId = req.user._id;
    const data = await getCustomerDashboardAnalytics(customerId);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to fetch Operator factory-floor dashboard analytics (scoped to logged-in operator)
 */
export async function getOperatorDashboard(req, res, next) {
  try {
    const operatorId = req.user._id;
    const data = await getOperatorDashboardAnalytics(operatorId);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Unified dashboard endpoint: automatically dispatches according to user role
 */
export async function getCurrentUserDashboard(req, res, next) {
  try {
    let data;
    if (req.user.role === 'ADMIN') {
      data = await getAdminDashboardAnalytics();
    } else if (req.user.role === 'CUSTOMER') {
      data = await getCustomerDashboardAnalytics(req.user._id);
    } else if (req.user.role === 'OPERATOR') {
      data = await getOperatorDashboardAnalytics(req.user._id);
    } else {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Unknown or unauthorized user role' },
      });
    }

    res.json({
      success: true,
      role: req.user.role,
      data,
    });
  } catch (error) {
    next(error);
  }
}

