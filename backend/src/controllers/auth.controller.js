import { authService } from '../services/auth.service.js';
import { User, AuditLog } from '../models/index.js';

export const authController = {
  /**
   * POST /api/v1/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const { user, profile, token } = await authService.login(email, password, req.ip);

      authService.setTokenCookie(res, token);

      res.status(200).json({
        success: true,
        message: 'Authentication successful',
        data: { user, profile },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/auth/register-customer
   */
  async registerCustomer(req, res, next) {
    try {
      const { user, profile, token } = await authService.registerCustomer(req.body, req.ip);

      authService.setTokenCookie(res, token);

      res.status(201).json({
        success: true,
        message: 'Customer account registered successfully',
        data: { user, profile },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/auth/logout
   */
  async logout(req, res) {
    if (req.user) {
      await AuditLog.create({
        actorId: req.user._id,
        actorRole: req.user.role,
        action: 'USER_LOGOUT',
        entityType: 'User',
        entityId: req.user._id,
        ipAddress: req.ip,
        notes: `User logged out`,
      }).catch(() => {});
    }

    authService.clearTokenCookie(res);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  },

  /**
   * GET /api/v1/auth/me
   */
  async getMe(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not logged in' },
        });
      }

      const { user, profile } = await authService.getCurrentUserWithProfile(req.user._id);

      res.status(200).json({
        success: true,
        data: { user, profile },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/auth/staff (Admin Only)
   */
  async createStaffUser(req, res, next) {
    try {
      const { user, profile } = await authService.createStaffAccount(req.body, req.user, req.ip);

      res.status(201).json({
        success: true,
        message: `Staff member created with role ${user.role}`,
        data: { user, profile },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/auth/users (Admin Only)
   */
  async listUsers(req, res, next) {
    try {
      const { role, status, page = 1, limit = 20 } = req.query;
      const filter = {};
      if (role) filter.role = role;
      if (status) filter.status = status;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [users, total] = await Promise.all([
        User.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
        User.countDocuments(filter),
      ]);

      res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/v1/auth/customer-profile (Customer / Admin)
   */
  async updateCustomerProfile(req, res, next) {
    try {
      // Never trust client supplied ID: if customer, use req.user._id
      const targetUserId = req.user.role === 'ADMIN' && req.body.userId ? req.body.userId : req.user._id;

      const profile = await authService.updateCustomerProfile(targetUserId, req.body);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { profile },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/v1/auth/operators/:operatorUserId/assignments (Admin Only)
   */
  async updateOperatorAssignments(req, res, next) {
    try {
      const { operatorUserId } = req.params;
      const profile = await authService.updateOperatorAssignments(operatorUserId, req.body, req.user);

      res.status(200).json({
        success: true,
        message: 'Operator machine assignments updated',
        data: { profile },
      });
    } catch (error) {
      next(error);
    }
  },
};

