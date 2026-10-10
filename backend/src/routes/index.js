import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';
import orderRequestRoutes from './orderRequest.routes.js';
import quotationRoutes from './quotation.routes.js';
import orderRoutes from './order.routes.js';
import messageRoutes from './message.routes.js';
import notificationRoutes from './notification.routes.js';
import inventoryRoutes from './inventory.routes.js';
import procurementRoutes from './procurement.routes.js';
import productionPlanningRoutes from './productionPlanning.routes.js';
import operatorRoutes from './operator.routes.js';

const router = Router();

// Subsystem health endpoint
router.use('/health', healthRoutes);

// Authentication & Identity endpoints
router.use('/auth', authRoutes);

// Fabric Catalog & Products
router.use('/products', productRoutes);

// Customer Inquiries / Order Requests
router.use('/order-requests', orderRequestRoutes);

// Quotations, Pricing & Negotiation
router.use('/quotations', quotationRoutes);

// Orders & Tracking
router.use('/orders', orderRoutes);

// Order-specific Communication Messages
router.use('/messages', messageRoutes);

// Real-Time Notifications
router.use('/notifications', notificationRoutes);

// Admin Inventory Management & Stock Movements
router.use('/inventory', inventoryRoutes);

// Procurement, Purchase Requests & PO Tracking
router.use('/procurement', procurementRoutes);

// Production Routing & Scheduling
router.use('/production-planning', productionPlanningRoutes);

// Factory Floor Operator Machine Dashboard & Terminals
router.use('/operator', operatorRoutes);

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
