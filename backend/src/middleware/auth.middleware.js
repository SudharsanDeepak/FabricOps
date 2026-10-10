import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/index.js';

export const authenticateToken = async (req, res, next) => {
  try {
    // 1. Extract token from HTTP-only cookie first, then Bearer header fallback
    let token = req.cookies?.[env.COOKIE_NAME];

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      req.user = null;
      return next();
    }

    // 2. Verify signature & expiration
    const decoded = jwt.verify(token, env.JWT_SECRET);

    // 3. Retrieve user from database to verify active status
    const user = await User.findById(decoded.id);
    if (!user || user.status !== 'ACTIVE') {
      req.user = null;
      return next();
    }

    req.user = user;
    next();
  } catch (error) {
    // Expired or malformed token
    req.user = null;
    next();
  }
};

export const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please log in to access this resource.',
      },
    });
  }
  next();
};

