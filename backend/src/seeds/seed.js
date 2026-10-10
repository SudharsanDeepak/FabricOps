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
  OrderMessage,
  ProductionLog,
  ShiftHandover,
  BreakdownReport,
} from '../models/index.js';

export async function runSeed() {
  logger.info('Starting FabricOps Seed Process...');
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
  const passwordHash = await bcrypt.hash('FabricOps@123456', salt);
  const everestPasswordHash = await bcrypt.hash('Everest@123456', salt);

  const [adminUser, customerUser, operatorUser, legacyAdmin, legacyOperator] = await User.insertMany([
    {
      name: 'Prakash Sharma',
      email: 'admin@fabricops.com',
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
      email: 'rajesh.weaver@fabricops.com',
      passwordHash,
      role: 'OPERATOR',
      phone: '+91 97100 55667',
      status: 'ACTIVE',
    },
    {
      name: 'Prakash Sharma (Everest Alias)',
      email: 'admin@everesttextiles.com',
      passwordHash: everestPasswordHash,
      role: 'ADMIN',
      phone: '+91 98410 11223',
      status: 'ACTIVE',
    },
    {
      name: 'Rajesh Kumar (Everest Alias)',
      email: 'rajesh.weaver@everesttextiles.com',
      passwordHash: everestPasswordHash,
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

  await OperatorProfile.create([
    {
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
    },
    {
      userId: legacyOperator._id,
      employeeCode: 'EMP-WEAV-043',
      department: 'WEAVING',
      skillLevel: 'MASTER_WEAVER',
      hourlyWageRate: 180, // INR per hour
      emergencyContact: {
        name: 'Sunita Kumar',
        relationship: 'Spouse',
        phone: '+91 97100 88990',
      },
    },
  ]);

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

  await PurchaseOrder.create({
    poNumber: 'PO-2026-YRN-0041',
    supplierId: yarnSupplier._id,
    items: [
      {
        inventoryItemId: rawYarn40s._id,
        description: '40s Ne Combed Ring Spun Cotton Yarn - Advance Spin Order',
        quantity: 2000,
        unit: 'KILOGRAM',
        unitPrice: 315,
        lineTotal: 630000,
      },
    ],
    subtotal: 630000,
    taxAmount: 31500,
    totalAmount: 661500,
    status: 'ISSUED',
    expectedDeliveryDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
    issuedBy: adminUser._id,
    notes: 'Advance booking for upcoming seasonal poplin and shirting runs',
  });

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

  // Seed End-to-End Production Timeline Milestones
  const { initializeOrderTimeline, updateTimelineStage } = await import('../services/timeline.service.js');
  await initializeOrderTimeline(order._id);
  await updateTimelineStage({
    orderId: order._id,
    stage: 'ORDER_CONFIRMATION',
    status: 'COMPLETED',
    completedQuantity: 5000,
    actualCompletionDate: new Date(),
  });
  await updateTimelineStage({
    orderId: order._id,
    stage: 'MATERIAL_PROCUREMENT',
    status: 'COMPLETED',
    completedQuantity: 5000,
    actualCompletionDate: new Date(),
  });
  await updateTimelineStage({
    orderId: order._id,
    stage: 'MATERIAL_ISSUANCE',
    status: 'COMPLETED',
    completedQuantity: 5000,
    actualCompletionDate: new Date(),
  });
  await updateTimelineStage({
    orderId: order._id,
    stage: 'WEAVING',
    status: 'IN_PROGRESS',
    completedQuantity: 1200,
    actualStartDate: new Date(),
    responsibleMachineId: airJetLoom1._id,
    responsibleTeam: 'Weaving Shed A',
  });

  // 7b. Seed Active Customer Inquiry (PENDING_REVIEW)
  const pendingInquiry = await OrderRequest.create({
    requestNumber: 'REQ-2026-0031',
    customerId: customerUser._id,
    items: [
      {
        productId: twillProduct._id,
        targetQuantity: 4000,
        targetUnit: 'METER',
        targetPricePerUnit: 190,
        targetDeliveryDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        notes: 'Khaki Stone shade required for seasonal chino pants production run.',
        fabricSpecSnapshot: {
          gsm: 240,
          weaveType: 'TWILL',
          composition: '100% Organic Cotton',
          yarnCountWarp: '30/2 Ne',
          yarnCountWeft: '20s Ne',
          construction: '108x56',
          widthInches: 60,
          colorName: 'Khaki Stone',
        },
      },
    ],
    specificationDocuments: [
      {
        name: 'TechPack_Chino_HeavyTwill_2026.pdf',
        fileUrl: 'https://fabricops.internal/specs/TechPack_Chino_HeavyTwill.pdf',
        fileType: 'application/pdf',
        fileSize: 345000,
      },
    ],
    preferredDeliveryDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
    customerNotes: 'Please verify reed space compatibility on Picanol Rapier loom.',
    status: 'PENDING_REVIEW',
  });

  // 7c. Seed Active Quotation Under Negotiation (REVISED status with Revisions #1 and #2)
  const denimQuoteItemsRev1 = [
    {
      productId: denimProduct._id,
      fabricSpecSnapshot: {
        gsm: 410,
        weaveType: 'TWILL',
        composition: '98% Cotton / 2% Elastane',
        widthInches: 62,
        colorName: 'Deep Indigo',
      },
      quantity: 2500,
      unit: 'METER',
      unitPrice: 260,
      lineTotal: 650000,
      estimatedProductionDays: 16,
      yarnAvailableInStock: true,
    },
  ];

  const denimQuoteItemsRev2 = [
    {
      productId: denimProduct._id,
      fabricSpecSnapshot: {
        gsm: 410,
        weaveType: 'TWILL',
        composition: '98% Cotton / 2% Elastane',
        widthInches: 62,
        colorName: 'Deep Indigo',
      },
      quantity: 2500,
      unit: 'METER',
      unitPrice: 252,
      lineTotal: 630000,
      estimatedProductionDays: 14,
      yarnAvailableInStock: true,
    },
  ];

  const activeQuote = await Quotation.create({
    quotationNumber: 'QT-2026-0049',
    customerId: customerUser._id,
    items: denimQuoteItemsRev2,
    subtotal: 630000,
    taxPercent: 5,
    taxAmount: 31500,
    totalAmount: 661500,
    proposedDeliveryDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
    productionLeadTimeDays: 14,
    materialAvailability: {
      yarnInStock: true,
      onHandKg: 3200,
      reservedKg: 800,
      availableKg: 2400,
      expectedIncomingKg: 2000,
      incomingDeliveryDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
      supplierGuaranteed: false,
      shortageKg: 0,
      notes: 'Cotton yarn available in stock; Lycra core spun yarn allocated.',
    },
    assumptions: [
      'Assumes rapier loom allocation at 750 picks/min with elastane tension controller',
      'Continuous rope-dyeing cycle schedule confirmed',
      '4-Point quality grading with Grade A pass threshold',
    ],
    riskFactors: [
      'Indigo crocking fastness rating sensitive to customer post-wash rinse',
    ],
    validUntil: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
    currentRevisionNumber: 2,
    revisions: [
      {
        revisionNumber: 1,
        items: denimQuoteItemsRev1,
        subtotal: 650000,
        taxPercent: 5,
        taxAmount: 32500,
        totalAmount: 682500,
        proposedDeliveryDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
        productionLeadTimeDays: 16,
        notes: 'Initial quotation at standard rate ₹260/meter',
        revisedBy: adminUser._id,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        revisionNumber: 2,
        items: denimQuoteItemsRev2,
        subtotal: 630000,
        taxPercent: 5,
        taxAmount: 31500,
        totalAmount: 661500,
        proposedDeliveryDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
        productionLeadTimeDays: 14,
        notes: 'Revised volume discount to ₹252/meter following customer counter-offer',
        revisedBy: adminUser._id,
        createdAt: new Date(),
      },
    ],
    customerDecision: {
      decision: 'COUNTER_OFFER',
      decidedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      customerNotes: 'Apex requested ₹250/m target; mill offered ₹252/m concession.',
      counterOffer: {
        targetPrice: 656250,
        targetDeliveryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        notes: 'Customer target: ₹250/meter for 2,500m',
      },
    },
    status: 'REVISED',
    adminNotes: 'Negotiation active; customer expected to accept Rev #2.',
    createdBy: adminUser._id,
  });

  // 7d. Seed Order-Specific Message Thread
  await OrderMessage.create([
    {
      threadType: 'QUOTATION',
      referenceId: activeQuote._id,
      senderId: customerUser._id,
      senderRole: 'CUSTOMER',
      senderName: customerUser.name,
      message: 'Can we negotiate the price down to ₹250/meter if we commit to repeat quarterly runs?',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      threadType: 'QUOTATION',
      referenceId: activeQuote._id,
      senderId: adminUser._id,
      senderRole: 'ADMIN',
      senderName: adminUser.name,
      message: 'Hello Aditi, we have issued Revision #2 at ₹252/meter with a compressed 14-day production timeline. Lycra yarn lot is already allocated on Picanol Rapier #2.',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      threadType: 'ORDER_REQUEST',
      referenceId: pendingInquiry._id,
      senderId: customerUser._id,
      senderRole: 'CUSTOMER',
      senderName: customerUser.name,
      message: 'Submitted inquiry with attached Tech Pack. Looking forward to feasibility review!',
      attachments: [
        {
          name: 'TechPack_Chino_HeavyTwill_2026.pdf',
          fileUrl: 'https://fabricops.internal/specs/TechPack_Chino_HeavyTwill.pdf',
          fileType: 'application/pdf',
          fileSize: 345000,
        },
      ],
      createdAt: new Date(),
    },
  ]);

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

  await Order.findByIdAndUpdate(order._id, { $push: { productionJobIds: prodJob._id } });

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

  const eveningShift = await Shift.create({
    shiftCode: 'SHIFT-EVENING',
    name: 'EVENING',
    startTime: '14:00',
    endTime: '22:00',
    durationHours: 8,
    isActive: true,
  });

  const nightShift = await Shift.create({
    shiftCode: 'SHIFT-NIGHT',
    name: 'NIGHT',
    startTime: '22:00',
    endTime: '06:00',
    durationHours: 8,
    isActive: true,
  });

  // Assign machines to Operator Rajesh Kumar
  await OperatorProfile.updateOne(
    { userId: operatorUser._id },
    { $set: { assignedMachines: [airJetLoom1._id, rapierLoom1._id] } }
  );

  // Link airJetLoom1 to active production job and operator
  airJetLoom1.currentProductionJobId = prodJob._id;
  airJetLoom1.currentOperatorId = operatorUser._id;
  await airJetLoom1.save();

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

  // Seed sample initial production log
  await ProductionLog.create({
    jobId: prodJob._id,
    orderId: order._id,
    machineId: airJetLoom1._id,
    operatorId: operatorUser._id,
    shiftId: morningShift._id,
    shift: 'MORNING',
    metersProduced: 1200,
    wasteMeters: 18,
    durationMinutes: 240,
    downtimeMinutes: 12,
    source: 'OPERATOR',
    idempotencyKey: 'SEED-PLOG-2026-001',
    remarks: 'Morning run completed smoothly at 850 RPM with optimal warp tension',
    logDate: new Date(Date.now() - 30 * 60 * 1000),
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
  logger.info('  FabricOps Database Seed Completed Successfully!');
  logger.info('  Demo Accounts:');
  logger.info('  Admin:    admin@fabricops.com / FabricOps@123456');
  logger.info('  Customer: aditi@apexgarments.com   / FabricOps@123456');
  logger.info('  Operator: rajesh.weaver@fabricops.com / FabricOps@123456');
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

