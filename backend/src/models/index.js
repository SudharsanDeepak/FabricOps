// ==========================================
// FABRICOPS CONSOLIDATED DOMAIN MODELS REGISTRY
// ==========================================

// 1. Core User & Identity
export {
  User,
  CustomerProfile,
  OperatorProfile,
  RolePermission,
  Attendance,
  WageCalculation,
  AuditLog,
} from './User.js';

// 2. Product Catalog & Fabric Specifications
export { Product } from './Product.js';

// 3. Procurement, Suppliers & Purchase Requests
export {
  Supplier,
  PurchaseRequest,
  PurchaseOrder,
} from './PurchaseOrder.js';

// 4. Inventory, Stock Movements & Material Batches
export { InventoryItem } from './InventoryItem.js';
export { YarnBatch } from './YarnBatch.js';
export { GoodsReceipt } from './GoodsReceipt.js';
export { StockMovement } from './StockMovement.js';
export { FabricRoll } from './FabricRoll.js';
export { FinishedGoodsInventory } from './FinishedGoodsInventory.js';
export { Dispatch } from './Dispatch.js';

// 5. Orders, Customer Inquiries, Messages & Tracking
export {
  Order,
  OrderRequest,
  OrderMessage,
  OrderTimelineEvent,
} from './Order.js';

// 6. Quotations, Invoicing, Costing & Payments
export {
  Quotation,
  ManufacturingCost,
  Invoice,
  CustomerPayment,
} from './Quotation.js';

// 7. Plant Machines & Manufacturing Operations
export { Machine } from './Machine.js';
export { ProductionPlan } from './ProductionPlan.js';
export { ProductionJob } from './ProductionJob.js';
export { ProductionLog } from './ProductionLog.js';
export { ShiftHandover } from './ShiftHandover.js';
export { BreakdownReport } from './BreakdownReport.js';
export { QualityInspection } from './QualityInspection.js';
export { Shift } from './Shift.js';

// 8. Notifications
export { Notification } from './Notification.js';
