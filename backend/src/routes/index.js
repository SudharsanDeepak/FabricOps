import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';

const router = Router();

// Subsystem health endpoint
router.use('/health', healthRoutes);

// Authentication & Identity endpoints
router.use('/auth', authRoutes);

// Root API v1 welcome & metadata
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Everest Textile OS API v1',
    documentation: '/api/docs',
    endpoints: {
      health: '/api/v1/health',
      auth: '/api/v1/auth',
      quotations: '/api/v1/quotations',
      orders: '/api/v1/orders',
      inventory: '/api/v1/inventory',
      production: '/api/v1/production',
      machines: '/api/v1/machines',
      qc: '/api/v1/qc',
      dispatch: '/api/v1/dispatch',
      reports: '/api/v1/reports',
    },
  });
});

export default router;

