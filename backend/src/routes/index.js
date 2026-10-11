import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';
import quotationRoutes from './quotation.routes.js';
import notificationRoutes from './notification.routes.js';

// Consolidated Domain Routers
import orderRoutes, { orderRequestsRouter, messagesRouter } from './order.routes.js';
import inventoryRoutes, { procurementRouter } from './inventory.routes.js';
import operatorRoutes, { productionPlanningRouter } from './operator.routes.js';
import aiRoutes from './ai.routes.js';

const router = Router();

// Subsystem health endpoint
router.use('/health', healthRoutes);

// Authentication & Identity endpoints
router.use('/auth', authRoutes);

// Fabric Catalog & Products
router.use('/products', productRoutes);

// Customer Inquiries / Order Requests (from consolidated order.routes.js)
router.use('/order-requests', orderRequestsRouter);

// Quotations, Pricing & Negotiation
router.use('/quotations', quotationRoutes);

// Orders & Tracking (from consolidated order.routes.js)
router.use('/orders', orderRoutes);

// Order-specific Communication Messages (from consolidated order.routes.js)
router.use('/messages', messagesRouter);

// Real-Time Notifications
router.use('/notifications', notificationRoutes);

// Admin Inventory Management & Stock Movements (from consolidated inventory.routes.js)
router.use('/inventory', inventoryRoutes);

// Procurement, Purchase Requests & PO Tracking (from consolidated inventory.routes.js)
router.use('/procurement', procurementRouter);

// Production Routing & Scheduling (from consolidated operator.routes.js)
router.use('/production-planning', productionPlanningRouter);

// Factory Floor Operator Machine Dashboard & Terminals (from consolidated operator.routes.js)
router.use('/operator', operatorRoutes);

// Worker Attendance Management direct route alias
router.use('/attendance', operatorRoutes);

// AI-Powered Fabric Quality Assurance Service (FastAPI XGBoost integration)
router.use('/ai', aiRoutes);

// Root API v1 welcome & metadata
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to FabricOps API v1',
    documentation: '/api/docs',
    endpoints: {
      health: '/api/v1/health',
      auth: '/api/v1/auth',
      products: '/api/v1/products',
      orderRequests: '/api/v1/order-requests',
      quotations: '/api/v1/quotations',
      orders: '/api/v1/orders',
      messages: '/api/v1/messages',
      notifications: '/api/v1/notifications',
      inventory: '/api/v1/inventory',
      procurement: '/api/v1/procurement',
      productionPlanning: '/api/v1/production-planning',
      operator: '/api/v1/operator',
    },
  });
});

export default router;
