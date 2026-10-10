import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import {
  User,
  CustomerProfile,
  Product,
  InventoryItem,
  Machine,
  PurchaseOrder,
  OrderRequest,
  Quotation,
  Order,
  OrderMessage,
  AuditLog,
} from '../src/models/index.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';

describe('Prompt 4 — Customer Ordering & Quotation Negotiation Workflow', () => {
  let replSet;
  let adminUser, customerA, customerB;
  let adminToken, customerAToken, customerBToken;
  let testProduct, testYarnItem, testLoom;

  const createAuthCookie = (user) => {
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    return `${env.COOKIE_NAME}=${token}`;
  };

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    // Initialize all model indexes for unique constraints
    await User.init();
    await Product.init();
    await InventoryItem.init();
    await Machine.init();
    await PurchaseOrder.init();
    await OrderRequest.init();
    await Quotation.init();
    await Order.init();
    await OrderMessage.init();
    await AuditLog.init();
  }, 120000);

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (replSet) {
      await replSet.stop();
    }
  });

  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }

    // Seed test users
    adminUser = await User.create({
      name: 'Mill General Manager',
      email: 'admin.quote@fabricops.com',
      passwordHash: 'dummy-hash',
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    adminToken = createAuthCookie(adminUser);

    customerA = await User.create({
      name: 'Apex Garments Procurement',
      email: 'aditi.quote@apex.com',
      passwordHash: 'dummy-hash',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    });
    customerAToken = createAuthCookie(customerA);

    await CustomerProfile.create({
      userId: customerA._id,
      customerCode: 'CUST-APEX-01',
      companyName: 'Apex Garments Pvt Ltd',
      taxId: '33AABCA1234F1Z5',
      creditLimit: 1500000,
      paymentTermsDays: 30,
    });

    customerB = await User.create({
      name: 'Zenith Apparel Buyer',
      email: 'zenith.quote@zenith.com',
      passwordHash: 'dummy-hash',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    });
    customerBToken = createAuthCookie(customerB);

    // Seed test product
    testProduct = await Product.create({
      productCode: 'FAB-POP-40S',
      name: 'Combed Cotton Poplin 40s',
      category: 'FINISHED_FABRIC',
      isPublished: true,
      pricing: { basePricePerUnit: 140, currency: 'INR', minimumOrderQuantity: 500 },
      fabricSpecification: {
        gsm: 120,
        weaveType: 'PLAIN',
        composition: '100% Cotton',
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
    });

    // Seed raw yarn inventory
    testYarnItem = await InventoryItem.create({
      sku: 'YRN-C40-CMB',
      name: '40s Ne Combed Ring Spun Yarn',
      category: 'RAW_YARN',
      unit: 'KILOGRAM',
      quantityOnHand: 2000,
      quantityReserved: 500,
      unitCost: 320,
    });

    // Seed machine loom
    testLoom = await Machine.create({
      machineCode: 'LOOM-AJ-01',
      name: 'Tsudakoma ZAX9100 Air-Jet Loom',
      type: 'AIR_JET_LOOM',
      location: { shed: 'Weaving Shed 1', bay: 'Bay 104' },
      status: 'RUNNING',
      specifications: { reedSpaceInches: 75, maxRpm: 1000 },
      telemetrySnapshot: { rpm: 850, picksPerMinute: 820, efficiencyPercentage: 94 },
    });
  });

  it('1. Customer browses published catalog with ATP stock, colours, MOQ and lead times', async () => {
    const res = await request(app).get('/api/v1/products');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);

    const product = res.body.data[0];
    expect(product.productCode).toBe('FAB-POP-40S');
    expect(product.colours).toHaveLength(2);
    expect(product.pricing.minimumOrderQuantity).toBe(500);

    // ATP calculation
    expect(product.atp).toBeDefined();
    expect(product.atp.stockStatus).toBe('PRODUCIBLE'); // Yarn is available in stock
    expect(product.atp.yarnInStock).toBe(true);
    expect(product.atp.indicativeLeadTimeDays).toBe(14);
  });

  it('2. Customer submits order inquiry with specifications, documents, and preferred delivery date', async () => {
    const inquiryPayload = {
      items: [
        {
          productId: testProduct._id,
          targetQuantity: 3000,
          targetUnit: 'METER',
          targetPricePerUnit: 135,
          notes: 'Special optic white finish for spring shirting collection',
          fabricSpecSnapshot: {
            colorName: 'Optic White',
            gsm: 120,
            widthInches: 58,
          },
        },
      ],
      specificationDocuments: [
        {
          name: 'TechPack-Spring2026.pdf',
          fileUrl: 'https://fabricops.s3.amazonaws.com/specs/techpack-01.pdf',
          fileType: 'application/pdf',
          fileSize: 204800,
        },
      ],
      preferredDeliveryDate: new Date(Date.now() + 20 * 86400000).toISOString(),
      customerNotes: 'Require lab dip approval prior to bulk lot weaving',
    };

    const res = await request(app)
      .post('/api/v1/order-requests')
      .set('Cookie', customerAToken)
      .send(inquiryPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requestNumber).toMatch(/^REQ-/);
    expect(res.body.data.status).toBe('PENDING_REVIEW');
    expect(res.body.data.specificationDocuments).toHaveLength(1);

    // Confirm customer isolation: Customer B cannot view Customer A request
    const getRes = await request(app)
      .get(`/api/v1/order-requests/${res.body.data._id}`)
      .set('Cookie', customerBToken);

    expect(getRes.status).toBe(404);
  });

  it('3. Admin checks yarn stock breakdown, machine compatibility, and timeline formula', async () => {
    const res = await request(app)
      .get(`/api/v1/quotations/feasibility?productId=${testProduct._id}&quantity=3000&gsm=120&widthInches=58`)
      .set('Cookie', adminToken);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { yarnFeasibility, machineFeasibility, timeline } = res.body.data;

    // Yarn stock breakdown
    expect(yarnFeasibility.onHandKg).toBe(2000);
    expect(yarnFeasibility.reservedKg).toBe(500);
    expect(yarnFeasibility.availableKg).toBe(1500);
    expect(yarnFeasibility.yarnInStock).toBe(true); // 3000m @ 120 GSM = ~556 kg < 1500 kg available
    expect(yarnFeasibility.supplierGuaranteed).toBe(false); // Business rule: shortage must not imply guaranteed supplier delivery

    // Machine compatibility
    expect(machineFeasibility.compatibleCount).toBe(1);
    expect(machineFeasibility.compatibleMachines[0].machineCode).toBe('LOOM-AJ-01');
    expect(machineFeasibility.compatibleMachines[0].reedSpaceInches).toBe(75);

    // Timeline calculation
    expect(timeline.totalLeadTimeDays).toBeGreaterThan(0);
    expect(timeline.breakdown).toBeInstanceOf(Array);
    expect(timeline.assumptions.length).toBeGreaterThan(0);
  });

  it('4. Admin issues quotation with transparent assumptions & risks, and then issues a revision preserving history', async () => {
    // 1. Issue initial quotation (Rev 1)
    const quotePayload = {
      customerId: customerA._id,
      items: [
        {
          productId: testProduct._id,
          quantity: 3000,
          unit: 'METER',
          unitPrice: 140,
          fabricSpecSnapshot: {
            gsm: 120,
            widthInches: 58,
            composition: '100% Cotton',
            colorName: 'Optic White',
          },
        },
      ],
      proposedDeliveryDate: new Date(Date.now() + 18 * 86400000).toISOString(),
      productionLeadTimeDays: 14,
      taxPercent: 5,
      assumptions: ['Assumes Tsudakoma Air-Jet loom allocation at 820 picks/min'],
      riskFactors: ['Yarn lot shade variation within 0.5 Delta-E threshold'],
      adminNotes: 'Initial offer with 5% GST',
    };

    const createRes = await request(app)
      .post('/api/v1/quotations')
      .set('Cookie', adminToken)
      .send(quotePayload);

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.currentRevisionNumber).toBe(1);
    expect(createRes.body.data.revisions).toHaveLength(1);
    expect(createRes.body.data.status).toBe('ISSUED');

    const quotationId = createRes.body.data._id;

    // 2. Revise quotation (Rev 2) - business rule: preserve previous revision rather than overwrite
    const revisionPayload = {
      items: [
        {
          productId: testProduct._id,
          quantity: 3000,
          unit: 'METER',
          unitPrice: 136, // Discounted price per negotiation
          fabricSpecSnapshot: {
            gsm: 120,
            widthInches: 58,
            composition: '100% Cotton',
            colorName: 'Optic White',
          },
        },
      ],
      proposedDeliveryDate: new Date(Date.now() + 16 * 86400000).toISOString(),
      productionLeadTimeDays: 12,
      notes: 'Revised unit price from ₹140 to ₹136 and expedited production to 12 days',
    };

    const reviseRes = await request(app)
      .post(`/api/v1/quotations/${quotationId}/revise`)
      .set('Cookie', adminToken)
      .send(revisionPayload);

    expect(reviseRes.status).toBe(200);
    expect(reviseRes.body.data.currentRevisionNumber).toBe(2);
    expect(reviseRes.body.data.revisions).toHaveLength(2); // Revision 1 preserved!
    expect(reviseRes.body.data.revisions[0].items[0].unitPrice).toBe(140);
    expect(reviseRes.body.data.revisions[1].items[0].unitPrice).toBe(136);
    expect(reviseRes.body.data.status).toBe('REVISED');
  });

  it('5. Customer negotiates (Counter-offer) and accepts quotation', async () => {
    // Issue quote
    const quote = await Quotation.create({
      quotationNumber: 'QT-TEST-9901',
      customerId: customerA._id,
      items: [
        {
          productId: testProduct._id,
          quantity: 2000,
          unit: 'METER',
          unitPrice: 145,
          lineTotal: 290000,
        },
      ],
      subtotal: 290000,
      taxPercent: 5,
      taxAmount: 14500,
      totalAmount: 304500,
      proposedDeliveryDate: new Date(Date.now() + 15 * 86400000),
      validUntil: new Date(Date.now() + 10 * 86400000),
      status: 'ISSUED',
    });

    // 1. Customer submits counter-offer
    const counterRes = await request(app)
      .post(`/api/v1/quotations/${quote._id}/decision`)
      .set('Cookie', customerAToken)
      .send({
        decision: 'COUNTER_OFFER',
        customerNotes: 'Can you match ₹138/meter for 2,000 meters?',
        counterOffer: {
          targetPrice: 289800,
          notes: 'Targeting ₹138/m',
        },
      });

    expect(counterRes.status).toBe(200);
    expect(counterRes.body.data.customerDecision.decision).toBe('COUNTER_OFFER');

    // 2. Customer accepts quotation
    const acceptRes = await request(app)
      .post(`/api/v1/quotations/${quote._id}/decision`)
      .set('Cookie', customerAToken)
      .send({
        decision: 'ACCEPTED',
        customerNotes: 'Final terms approved. Proceed with weaving schedule.',
      });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.status).toBe('CUSTOMER_ACCEPTED');
    expect(acceptRes.body.data.customerDecision.decision).toBe('ACCEPTED');
    expect(acceptRes.body.data.customerDecision.agreedPrice).toBe(304500);
  });

  it('6. Atomic Order Confirmation with ACID transaction, inventory reservation, and idempotency protection', async () => {
    const acceptedQuote = await Quotation.create({
      quotationNumber: 'QT-TEST-ACID-01',
      customerId: customerA._id,
      items: [
        {
          productId: testProduct._id,
          fabricSpecSnapshot: {
            gsm: 120,
            widthInches: 58,
            composition: '100% Cotton',
          },
          quantity: 2000,
          unit: 'METER',
          unitPrice: 140,
          lineTotal: 280000,
        },
      ],
      subtotal: 280000,
      taxPercent: 5,
      taxAmount: 14000,
      totalAmount: 294000,
      proposedDeliveryDate: new Date(Date.now() + 14 * 86400000),
      validUntil: new Date(Date.now() + 10 * 86400000),
      status: 'CUSTOMER_ACCEPTED',
      customerDecision: {
        decision: 'ACCEPTED',
        agreedDeliveryDate: new Date(Date.now() + 14 * 86400000),
        agreedPrice: 294000,
      },
    });

    const idempotencyKey = 'idemp-quote-test-token-777';

    // 1. Confirm Order
    const confirmRes1 = await request(app)
      .post('/api/v1/orders/confirm')
      .set('Cookie', customerAToken)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        quotationId: acceptedQuote._id,
      });

    expect(confirmRes1.status).toBe(201);
    expect(confirmRes1.body.data.status).toBe('CONFIRMED');
    expect(confirmRes1.body.data.totalAmount).toBe(294000);

    const createdOrder = confirmRes1.body.data;

    // Check quotation status transitioned to CONVERTED_TO_ORDER
    const updatedQuote = await Quotation.findById(acceptedQuote._id);
    expect(updatedQuote.status).toBe('CONVERTED_TO_ORDER');

    // Check yarn stock reserved atomically
    const yarnItem = await InventoryItem.findById(testYarnItem._id);
    expect(yarnItem.quantityReserved).toBeGreaterThan(500); // 500 initial + newly reserved yarn

    // 2. Repeated confirmation request must return existing order without creating a duplicate
    const confirmRes2 = await request(app)
      .post('/api/v1/orders/confirm')
      .set('Cookie', customerAToken)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        quotationId: acceptedQuote._id,
      });

    expect(confirmRes2.status).toBe(201);
    expect(confirmRes2.body.data._id).toBe(createdOrder._id);

    // Verify exactly ONE order exists for this quotation
    const totalOrdersForQuote = await Order.countDocuments({ quotationId: acceptedQuote._id });
    expect(totalOrdersForQuote).toBe(1);
  });

  it('7. Order message thread persists in MongoDB with ownership enforcement', async () => {
    // 1. Customer A sends message on their inquiry
    const msgRes = await request(app)
      .post(`/api/v1/messages/QUOTATION/${testProduct._id}`)
      .set('Cookie', customerAToken)
      .send({
        message: 'Could you please confirm if optical brightener is GOTS certified?',
        attachments: [
          {
            name: 'GOTS_Compliance_Requirement.pdf',
            fileUrl: 'https://cdn.apex.com/compliance.pdf',
            fileType: 'application/pdf',
          },
        ],
      });

    // Thread reference is product or quote, but if customer doesn't own doc, blocked
    // Let's create an actual OrderRequest owned by customer A
    const orderReq = await OrderRequest.create({
      requestNumber: 'REQ-MSG-001',
      customerId: customerA._id,
      items: [
        {
          productId: testProduct._id,
          targetQuantity: 1000,
          targetUnit: 'METER',
        },
      ],
    });

    const msgResValid = await request(app)
      .post(`/api/v1/messages/ORDER_REQUEST/${orderReq._id}`)
      .set('Cookie', customerAToken)
      .send({
        message: 'Can we weave this on Tsudakoma Air-Jet for smoother feel?',
      });

    expect(msgResValid.status).toBe(201);
    expect(msgResValid.body.data.message).toBe('Can we weave this on Tsudakoma Air-Jet for smoother feel?');
    expect(msgResValid.body.data.senderRole).toBe('CUSTOMER');

    // Customer B attempts to view or post on Customer A message thread -> 403 Forbidden
    const crossRes = await request(app)
      .get(`/api/v1/messages/ORDER_REQUEST/${orderReq._id}`)
      .set('Cookie', customerBToken);

    expect(crossRes.status).toBe(403);

    // Admin can view Customer A thread
    const adminGetMsg = await request(app)
      .get(`/api/v1/messages/ORDER_REQUEST/${orderReq._id}`)
      .set('Cookie', adminToken);

    expect(adminGetMsg.status).toBe(200);
    expect(adminGetMsg.body.data).toHaveLength(1);
  });

  it('8. Customer accesses authorized printable order confirmation document', async () => {
    const quote = await Quotation.create({
      quotationNumber: 'QT-DOC-001',
      customerId: customerA._id,
      items: [
        {
          productId: testProduct._id,
          quantity: 2000,
          unit: 'METER',
          unitPrice: 140,
          lineTotal: 280000,
        },
      ],
      subtotal: 280000,
      taxPercent: 5,
      taxAmount: 14000,
      totalAmount: 294000,
      proposedDeliveryDate: new Date(Date.now() + 14 * 86400000),
      validUntil: new Date(Date.now() + 10 * 86400000),
      status: 'CONVERTED_TO_ORDER',
    });

    const order = await Order.create({
      orderNumber: 'ORD-2026-DOC-01',
      quotationId: quote._id,
      customerId: customerA._id,
      items: [
        {
          productId: testProduct._id,
          quantity: 2000,
          unit: 'METER',
          unitPrice: 140,
          lineTotal: 280000,
          fabricSpecSnapshot: {
            gsm: 120,
            weaveType: 'PLAIN',
            composition: '100% Combed Cotton',
            widthInches: 58,
            colorName: 'Optic White',
          },
        },
      ],
      subtotal: 280000,
      taxAmount: 14000,
      totalAmount: 294000,
      confirmedDeliveryDate: new Date(Date.now() + 14 * 86400000),
      status: 'CONFIRMED',
    });

    const docRes = await request(app)
      .get(`/api/v1/orders/${order._id}/document`)
      .set('Cookie', customerAToken);

    expect(docRes.status).toBe(200);
    expect(docRes.body.success).toBe(true);
    expect(docRes.body.data.documentType).toBe('OFFICIAL_ORDER_CONFIRMATION');
    expect(docRes.body.data.millDetails.companyName).toBe('FabricOps Limited');
    expect(docRes.body.data.buyerDetails.companyName).toBe('Apex Garments Pvt Ltd');
    expect(docRes.body.data.financials.totalAmount).toBe(294000);
    expect(docRes.body.data.millAuthorizedSignatory).toBeDefined();
  });
});

