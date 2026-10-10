import { AuditLog, OperatorProfile } from '../models/index.js';
import { logger } from '../config/logger.js';

/**
 * Enforce role authorization against authenticated user
 * @param  {...string} allowedRoles - 'ADMIN', 'CUSTOMER', 'OPERATOR'
 */
export const requireRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required before role verification',
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(
        `RBAC Violation: User ${req.user._id} (${req.user.role}) attempted to access endpoint restricted to [${allowedRoles.join(', ')}]`
      );

      // Record security audit log
      await AuditLog.create({
        actorId: req.user._id,
        actorRole: req.user.role,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        entityType: 'Endpoint',
        entityId: req.user._id,
        ipAddress: req.ip,
        notes: `Attempted access to ${req.method} ${req.originalUrl}. Required: [${allowedRoles.join(', ')}]`,
      }).catch((err) => logger.error(`Audit logging error: ${err.message}`));

      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]`,
        },
      });
    }

    next();
  };
};

/**
 * Enforces customer data isolation:
 * Never trust customerId provided in request parameters or body.
 * For customers, automatically binds filter to their own authenticated user ID.
 */
export const enforceCustomerScope = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  if (req.user.role === 'CUSTOMER') {
    // If client provided a customerId that doesn't match their own, block it immediately
    if (req.params.customerId && req.params.customerId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Cross-customer access prohibited: You may only access your own records',
        },
      });
    }

    if (req.body.customerId && req.body.customerId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Cross-customer modification prohibited: You cannot impersonate another customer',
        },
      });
    }

    // Force server-side query filter
    req.customerFilter = { customerId: req.user._id };
  } else if (req.user.role === 'ADMIN') {
    // Admins can scope to specific customer or see all
    req.customerFilter = req.query.customerId ? { customerId: req.query.customerId } : {};
  } else {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Operators do not have access to customer documents' },
    });
  }

  next();
};

/**
 * Enforces operator machine boundary:
 * Operators may only log work or submit handovers for machines assigned to them.
 */
export const enforceOperatorMachineScope = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  if (req.user.role === 'ADMIN') {
    return next(); // Admins have factory-wide access
  }

  if (req.user.role !== 'OPERATOR') {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Only operators and admins can access floor machine operations' },
    });
  }

  const machineId = req.params.machineId || req.body.machineId;
  if (!machineId) {
    return next();
  }

  const profile = await OperatorProfile.findOne({ userId: req.user._id });
  if (!profile) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Operator profile not configured' },
    });
  }

  const isAssigned = profile.assignedMachines.some((m) => m.toString() === machineId.toString());
  if (!isAssigned) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Machine access denied: You are not assigned to operate this machine',
      },
    });
  }

  next();
};

