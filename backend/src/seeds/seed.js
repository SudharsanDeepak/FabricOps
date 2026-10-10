import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import {
  User,
  CustomerProfile,
  OperatorProfile,
  RolePermission,
  Product,
  Supplier,
  InventoryItem,
  YarnBatch,
  PurchaseOrder,
  Machine,
  OrderRequest,
  Quotation,
  Order,
  ProductionJob,
  FabricRoll,
  QualityInspection,
  FinishedGoodsInventory,
  Shift,
  Attendance,
  AuditLog,
} from '../models/index.js';

export async function runSeed() {
  logger.info('Starting Everest Textile OS Seed Process...');
  await connectDB();

  // 1. Clear existing documents in development environment
  logger.info('Clearing collections...');
  const collections = Object.values(mongoose.connection.collections);
  for (const collection of collections) {
    await collection.deleteMany({});
  }

  // 2. Seed Role Permissions
  logger.info('Seeding Role Permissions...');
  await RolePermission.insertMany([
    {
      role: 'ADMIN',
      permissions: [
        'users:manage',
        'orders:manage',
        'quotations:manage',
        'inventory:manage',
        'machines:manage',
        'qc:manage',
        'dispatches:manage',
        'finance:manage',
        'wages:manage',
        'reports:view',
      ],
      description: 'Full administrative access across factory operations',
    },
    {
      role: 'CUSTOMER',
      permissions: [
        'catalog:view',
        'quotations:request',
        'quotations:decide',
        'orders:view_own',
        'dispatches:track_own',
        'invoices:view_own',
      ],
      description: 'B2B Apparel Customer access restricted to own records',
    },
    {
      role: 'OPERATOR',
      permissions: [
        'machines:view_assigned',
        'production:log_shift',
        'breakdowns:report',
        'handover:submit',
        'attendance:view_own',
      ],
      description: 'Factory floor loom and spinning operator terminal',
    },
  ]);

  // 3. Seed Users & Profiles
  logger.info('Seeding Users & Profiles...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Everest@123456', salt);

  const [adminUser, customerUser, operatorUser] = await User.insertMany([
    {
      name: 'Prakash Sharma',
      email: 'admin@everesttextiles.com',
      passwordHash,
      role: 'ADMIN',
      phone: '+91 98410 11223',
      status: 'ACTIVE',
    },
    {
      name: 'Aditi Rao (Apex Garments)',
      email: 'aditi@apexgarments.com',
      passwordHash,
      role: 'CUSTOMER',
      phone: '+91 98450 33445',
      status: 'ACTIVE',
    },
    {
      name: 'Rajesh Kumar',
      email: 'rajesh.weaver@everesttextiles.com',
      passwordHash,
      role: 'OPERATOR',
      phone: '+91 97100 55667',
      status: 'ACTIVE',
    },
  ]);

  await CustomerProfile.create({
    userId: customerUser._id,
    customerCode: 'CUST-APEX-001',
    companyName: 'Apex Garments Private Limited',
    taxId: '33AABCA1234F1Z5',
    billingAddress: {
      street: '14 Industrial Estate, Guindy',
      city: 'Chennai',
      state: 'Tamil Nadu',
      postalCode: '600032',
      country: 'India',
    },
    shippingAddress: {
      street: 'Gate 3, Warehouse Hub, Sriperumbudur',
      city: 'Kanchipuram',
      state: 'Tamil Nadu',
      postalCode: '602105',
      country: 'India',
    },
    creditLimit: 2500000,
    paymentTermsDays: 30,
    contactPerson: {
      name: 'Aditi Rao',
      designation: 'Procurement Director',
      phone: '+91 98450 33445',
      email: 'aditi@apexgarments.com',
    },
  });

  await OperatorProfile.create({
    userId: operatorUser._id,
    employeeCode: 'EMP-WEAV-042',
    department: 'WEAVING',
    skillLevel: 'MASTER_WEAVER',
    hourlyWageRate: 180, // INR per hour
    emergencyContact: {
      name: 'Sunita Kumar',
      relationship: 'Spouse',
      phone: '+91 97100 88990',
    },
  });

  // 4. Seed Products
  logger.info('Seeding Fabric Catalog...');
  const [poplinProduct, twillProduct, denimProduct] = await Product.insertMany([
    {
      productCode: 'FAB-POP-40S',
      name: 'Premium Combed Cotton Poplin 40s',
      category: 'FINISHED_FABRIC',
      description: 'Crisp, high-density shirting fabric woven from 100% long-staple combed cotton.',
      isPublished: true,
      pricing: { basePricePerUnit: 145, currency: 'INR', minimumOrderQuantity: 1000 },
      fabricSpecification: {
        gsm: 120,
        weaveType: 'PLAIN',
        composition: '100% Combed Cotton',
        yarnCountWarp: '40s Ne',
        yarnCountWeft: '40s Ne',
        construction: '132x72',
        widthInches: 58,
      },
      colours: [
        { name: 'Optic White', pantoneCode: '11-0601 TCX', hexCode: '#F4F5F0' },
        { name: 'Navy Blue', pantoneCode: '19-4024 TCX', hexCode: '#1B2A4A' },
      ],
      measurementUnit: 'METER',
    },
    {
      productCode: 'FAB-TWL-30S',
      name: 'Organic Cotton Twill 3/1 Heavy Chino',
      category: 'FINISHED_FABRIC',
      description: 'Durable 3/1 twill fabric ideal for premium trousers, workwear, and overshirts.',
      isPublished: true,
      pricing: { basePricePerUnit: 195, currency: 'INR', minimumOrderQuantity: 800 },
      fabricSpecification: {
        gsm: 240,
        weaveType: 'TWILL',
        composition: '100% Organic Cotton',
        yarnCountWarp: '30/2 Ne',
        yarnCountWeft: '20s Ne',
        construction: '108x56',
        widthInches: 60,
      },
      colours: [
        { name: 'Khaki Stone', pantoneCode: '16-1109 TCX', hexCode: '#B8A88E' },
        { name: 'Olive Drab', pantoneCode: '18-0527 TCX', hexCode: '#4C5135' },
      ],
      measurementUnit: 'METER',
    },
    {
      productCode: 'FAB-DNM-12OZ',
      name: 'Ring-Spun Indigo Denim 12oz',
      category: 'FINISHED_FABRIC',
      description: 'Authentic 3/1 right-hand twill denim with rope-dyed indigo warp.',
      isPublished: true,
      pricing: { basePricePerUnit: 260, currency: 'INR', minimumOrderQuantity: 1500 },
      fabricSpecification: {
        gsm: 410,
        weaveType: 'TWILL',
        composition: '98% Cotton / 2% Elastane',
        yarnCountWarp: '10s Ring Spun',
        yarnCountWeft: '12s + 70D Lycra',
        construction: '72x48',
        widthInches: 62,
      },
      colours: [{ name: 'Deep Indigo', pantoneCode: '19-3928 TCX', hexCode: '#1A2849' }],
      measurementUnit: 'METER',
    },
  ]);

  // 5. Seed Suppliers & Raw Yarn Inventory
  logger.info('Seeding Suppliers and Raw Materials...');
  const [yarnSupplier] = await Supplier.insertMany([
    {
      supplierCode: 'SUP-SPIN-01',
      name: 'Coimbatore Super Spinning Mills Ltd.',
      contactPerson: { name: 'K. Senthil', phone: '+91 94430 77123', email: 'sales@super-spinning.com' },
      taxId: '33AABCS8899E1Z4',
      address: { street: 'Avanashi Road', city: 'Coimbatore', state: 'Tamil Nadu', postalCode: '641018' },
      suppliedCategories: ['SPUN_YARN'],
      rating: 4.8,
      paymentTermsDays: 45,
    },
  ]);

  const [rawYarn40s, rawYarn30s] = await InventoryItem.insertMany([
    {
      sku: 'YRN-C40-CMB',
      name: '40s Ne Combed Ring Spun Cotton Yarn',
      category: 'RAW_YARN',
      unit: 'KILOGRAM',
      quantityOnHand: 4500,
      quantityReserved: 1200,
      minimumReorderLevel: 1000,
      unitCost: 320,
      warehouseLocation: 'Shed-A / Row-3',
    },
    {
      sku: 'YRN-C30-ORG',
      name: '30/2 Ne Organic Certified Cotton Yarn',
      category: 'RAW_YARN',
      unit: 'KILOGRAM',
      quantityOnHand: 3200,
      quantityReserved: 800,
      minimumReorderLevel: 800,
      unitCost: 380,
      warehouseLocation: 'Shed-A / Row-5',
    },
  ]);

  const [batch01] = await YarnBatch.insertMany([
    {
      batchNumber: 'LOT-2026-C40-089',
      supplierId: yarnSupplier._id,
      inventoryItemId: rawYarn40s._id,
      yarnSpecification: { count: '40s Ne', blend: '100% Giza Cotton', origin: 'Egypt/Gujarat', lotNumber: 'LT-8902' },
      receivedQuantity: 3000,
      remainingQuantity: 2100,
      unit: 'KILOGRAM',
      unitPrice: 320,
      testReport: { moisturePercentage: 7.8, csp: 2850, twistPerInch: 26.5, strengthPassed: true },
    },
  ]);

  // 6. Seed Machines
  logger.info('Seeding Machine Fleet...');
  const [airJetLoom1, rapierLoom1] = await Machine.insertMany([
    {
      machineCode: 'LOOM-AJ-01',
      name: 'Tsudakoma ZAX9100 Air-Jet Loom',
      type: 'AIR_JET_LOOM',
      location: { shed: 'Weaving Shed 1', bay: 'Bay 104' },
      status: 'RUNNING',
      telemetrySnapshot: { rpm: 850, picksPerMinute: 820, efficiencyPercentage: 94.2, lastPingAt: new Date() },
      specifications: { reedSpaceInches: 75, maxRpm: 1000, yearOfManufacture: 2022, manufacturer: 'Tsudakoma Corp' },
      totalRunHours: 14200,
    },
    {
      machineCode: 'LOOM-RP-02',
      name: 'Picanol OptiMax-i Rapier Loom',
      type: 'RAPIER_LOOM',
      location: { shed: 'Weaving Shed 2', bay: 'Bay 208' },
      status: 'IDLE',
      telemetrySnapshot: { rpm: 0, picksPerMinute: 0, efficiencyPercentage: 0, lastPingAt: new Date() },
      specifications: { reedSpaceInches: 82, maxRpm: 750, yearOfManufacture: 2023, manufacturer: 'Picanol Group' },
      totalRunHours: 8900,
    },
  ]);

  // 7. Seed Quotation and Confirmed Order Flow
  logger.info('Seeding Quotation -> Order Flow...');
  const quoteItems = [
    {
      productId: poplinProduct._id,
      fabricSpecSnapshot: {
        gsm: 120,
        weaveType: 'PLAIN',
        composition: '100% Combed Cotton',
        widthInches: 58,
        colorName: 'Optic White',
      },
      quantity: 5000,
      unit: 'METER',
      unitPrice: 140,
      lineTotal: 700000,
      estimatedProductionDays: 12,
      yarnAvailableInStock: true,
    },
  ];

  const subtotal = 700000;
  const taxAmount = 35000; // 5% GST
  const totalAmount = 735000;

  const quote = await Quotation.create({
    quotationNumber: 'QT-2026-0042',
    customerId: customerUser._id,
    items: quoteItems,
    subtotal,
    taxPercent: 5,
    taxAmount,
    totalAmount,
    proposedDeliveryDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
    validUntil: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    currentRevisionNumber: 1,
    revisions: [
      {
        revisionNumber: 1,
        items: quoteItems,
        totalAmount,
        proposedDeliveryDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
        notes: 'Initial quotation with 5,000 meters high-density poplin shirting',
        revisedBy: adminUser._id,
      },
    ],
    customerDecision: {
      decision: 'ACCEPTED',
      decidedAt: new Date(),
      customerNotes: 'Price and 18-day timeline approved. Please proceed with weaving.',
      agreedDeliveryDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
      agreedPrice: 140,
    },
    status: 'CONVERTED_TO_ORDER',
    createdBy: adminUser._id,
  });

  const order = await Order.create({
    orderNumber: 'ORD-2026-0018',
    quotationId: quote._id,
    customerId: customerUser._id,
    items: quoteItems,
    subtotal,
    taxAmount,
    totalAmount,
    confirmedDeliveryDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
    status: 'IN_PRODUCTION',
    paymentStatus: 'PENDING',
  });

  // 8. Seed Production Job, Fabric Rolls, and 4-Point QC
  logger.info('Seeding Production Floor & Quality Inspections...');
  const prodJob = await ProductionJob.create({
    jobNumber: 'JOB-WEAV-2026-101',
    orderId: order._id,
    machineId: airJetLoom1._id,
    stage: 'WEAVING',
    targetQuantity: 5000,
    producedQuantity: 1200,
    wasteQuantity: 18,
    unit: 'METER',
    status: 'RUNNING',
    assignedOperatorIds: [operatorUser._id],
    actualStartDate: new Date(),
  });

  order.productionJobIds.push(prodJob._id);
  await order.save();

  // Create fabric rolls
  const roll01 = await FabricRoll.create({
    rollNumber: 'ROLL-2026-0901',
    productionJobId: prodJob._id,
    orderId: order._id,
    loomMachineId: airJetLoom1._id,
    genealogy: {
      yarnBatchNumbers: [batch01.batchNumber],
      warpBeamId: 'BEAM-042',
      loomCode: airJetLoom1.machineCode,
      operatorIds: [operatorUser._id],
    },
    grossMeters: 102,
    netMeters: 100,
    weightKg: 12.1,
    gsmActual: 121,
    widthInchesActual: 58.2,
    grade: 'GRADE_A',
    status: 'PACKED_FOR_DISPATCH',
  });

  await QualityInspection.create({
    inspectionNumber: 'QC-2026-0044',
    fabricRollId: roll01._id,
    orderId: order._id,
    inspectorId: adminUser._id,
    inspectedLengthMeters: 100,
    fabricWidthInches: 58,
    defects: [
      { defectType: 'Slub', points: 1, meterPosition: 22.4, severity: 'MINOR' },
      { defectType: 'Broken Pick', points: 2, meterPosition: 68.1, severity: 'MINOR' },
    ],
    // Total points = 3. Points per 100 sq.m = (3 * 100 * 39.37) / (100 * 58) = 2.03 -> Grade A
  });

  await FinishedGoodsInventory.create({
    fabricRollId: roll01._id,
    rollNumber: roll01.rollNumber,
    orderId: order._id,
    productName: poplinProduct.name,
    grade: 'GRADE_A',
    netMeters: 100,
    weightKg: 12.1,
    warehouseLocation: 'FG-Bay-A / Shelf-04',
    isAllocatedToDispatch: false,
  });

  // 9. Seed Shift and Attendance
  logger.info('Seeding Shifts and Attendance...');
  const morningShift = await Shift.create({
    shiftCode: 'SHIFT-MORNING',
    name: 'MORNING',
    startTime: '06:00',
    endTime: '14:00',
    durationHours: 8,
    isActive: true,
  });

  const todayMidnight = new Date();
  todayMidnight.setUTCHours(0, 0, 0, 0);

  await Attendance.create({
    operatorId: operatorUser._id,
    date: todayMidnight,
    shiftId: morningShift._id,
    checkInTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
    status: 'PRESENT',
    hoursWorked: 4,
    overtimeHours: 0,
    verifiedBy: adminUser._id,
  });

  // 10. Audit Log
  await AuditLog.create({
    actorId: adminUser._id,
    actorRole: 'ADMIN',
    action: 'INITIAL_FACTORY_DATABASE_SEEDED',
    entityType: 'System',
    entityId: adminUser._id,
    previousState: null,
    newState: { recordsCount: 'Complete production suite initialized' },
    notes: 'Development seed script executed successfully',
  });

  logger.info('===============================================================');
  logger.info('  Everest Textile OS Database Seed Completed Successfully!');
  logger.info('  Demo Accounts:');
  logger.info('  Admin:    admin@everesttextiles.com / Everest@123456');
  logger.info('  Customer: aditi@apexgarments.com   / Everest@123456');
  logger.info('  Operator: rajesh.weaver@everesttextiles.com / Everest@123456');
  logger.info('===============================================================');

  await disconnectDB();
}

// Allow running directly via CLI
if (process.argv[1]?.endsWith('seed.js')) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error(`Seed failed: ${err.message}`);
      process.exit(1);
    });
}

