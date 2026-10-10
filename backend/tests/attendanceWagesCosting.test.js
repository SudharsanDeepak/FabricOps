import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import {
  User,
  OperatorProfile,
  CustomerProfile,
  Shift,
  Attendance,
  WageStatement,
  WagePayment,
  CostEntry,
  ManufacturingCost,
  Supplier,
  PurchaseOrder,
  GoodsReceipt,
  SupplierInvoice,
  Order,
  Machine,
  BreakdownReport,
  Invoice,
  CustomerPayment,
  AuditLog,
} from '../src/models/index.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import {
  recordAttendance,
  approveOvertime,
  correctAttendance,
  calculateWageStatement,
  adjustWageStatement,
  approveWageStatement,
  disburseWagePayment,
  recordCostEntry,
  allocateManufacturingOverhead,
  getOrderCostAnalysis,
  recordSupplierInvoice,
  recordSupplierPayment,
  getExecutiveFinancialReport,
  getThreeWayReconciliation,
  getMachineUtilizationAndCostReport,
} from '../src/services/costingAndWages.service.js';

describe('Prompt 10 — Attendance, Wages, and Manufacturing Costs (FabricOps)', () => {
  let replSet;
  let adminUser, operatorUser, anotherOperatorUser, customerUser;
  let adminCookie, operatorCookie, anotherOperatorCookie, customerCookie;
  let morningShift, nightShift;
  let testMachine, testOrder, testSupplier, testPO, testGRN;

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

    // Initialize all indexes
    await User.init();
    await OperatorProfile.init();
    await Shift.init();
    await Attendance.init();
    await WageStatement.init();
    await WagePayment.init();
    await CostEntry.init();
    await ManufacturingCost.init();
    await SupplierInvoice.init();
    await Machine.init();
    await Order.init();
    await Invoice.init();
    await CustomerPayment.init();
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) {
      await replSet.stop();
    }
  });

  beforeEach(async () => {
    // Clear collections
    await Attendance.deleteMany({});
    await WageStatement.deleteMany({});
    await WagePayment.deleteMany({});
    await CostEntry.deleteMany({});
    await ManufacturingCost.deleteMany({});
    await SupplierInvoice.deleteMany({});
    await Invoice.deleteMany({});
    await CustomerPayment.deleteMany({});
    await BreakdownReport.deleteMany({});
    await AuditLog.deleteMany({});
    await Order.deleteMany({});
    await Machine.deleteMany({});
    await Shift.deleteMany({});
    await OperatorProfile.deleteMany({});
    await User.deleteMany({});
    await Supplier.deleteMany({});
    await PurchaseOrder.deleteMany({});
    await GoodsReceipt.deleteMany({});

    // Seed test users
    adminUser = await User.create({
      name: 'Operations Director',
      email: 'admin.ops@fabricops.internal',
      passwordHash: 'dummy',
      role: 'ADMIN',
    });
    adminCookie = createAuthCookie(adminUser);

    operatorUser = await User.create({
      name: 'R. Kaliappan',
      email: 'operator1@fabricops.internal',
      passwordHash: 'dummy',
      role: 'OPERATOR',
    });
    operatorCookie = createAuthCookie(operatorUser);

    anotherOperatorUser = await User.create({
      name: 'S. Muthuvel',
      email: 'operator2@fabricops.internal',
      passwordHash: 'dummy',
      role: 'OPERATOR',
    });
    anotherOperatorCookie = createAuthCookie(anotherOperatorUser);

    customerUser = await User.create({
      name: 'Garment Sourcing VP',
      email: 'buyer@globalapparel.com',
      passwordHash: 'dummy',
      role: 'CUSTOMER',
    });
    customerCookie = createAuthCookie(customerUser);

    // Seed Operator Profile with wage rate $18.50 / hr
    await OperatorProfile.create({
      userId: operatorUser._id,
      employeeCode: 'EMP-OPR-401',
      department: 'WEAVING',
      skillLevel: 'MASTER_WEAVER',
      hourlyWageRate: 18.5,
    });

    await OperatorProfile.create({
      userId: anotherOperatorUser._id,
      employeeCode: 'EMP-OPR-402',
      department: 'DYEING',
      skillLevel: 'LEVEL_2',
      hourlyWageRate: 16.0,
    });

    // Seed Shifts
    morningShift = await Shift.create({
      shiftCode: 'SFT-MORN-01',
      name: 'MORNING',
      startTime: '06:00',
      endTime: '14:00',
      durationHours: 8,
      isActive: true,
    });

    nightShift = await Shift.create({
      shiftCode: 'SFT-NITE-03',
      name: 'NIGHT',
      startTime: '22:00',
      endTime: '06:00',
      durationHours: 8,
      isActive: true,
    });

    // Seed Machine with $28.00 / hr operating rate
    testMachine = await Machine.create({
      machineCode: 'LOOM-AIR-08',
      name: 'Picanol OmniPlus Air-Jet 08',
      type: 'AIR_JET_LOOM',
      location: { shed: 'Weaving Shed B', bay: 'Bay 04' },
      status: 'RUNNING',
      hourlyOperatingRate: 28.0,
      powerRatingKw: 9.2,
      totalRunHours: 120,
      totalOutputMeters: 4500,
    });

    // Seed Order
    const mockQuotationId = new mongoose.Types.ObjectId();
    const mockProductId = new mongoose.Types.ObjectId();
    testOrder = await Order.create({
      orderNumber: 'ORD-2026-9001',
      quotationId: mockQuotationId,
      customerId: customerUser._id,
      fabricType: 'High-Density Organic Twill',
      color: 'Pantone 19-4052 Classic Navy',
      totalMetersOrdered: 2000,
      producedMeters: 2000,
      unitPrice: 12.5,
      totalPrice: 25000,
      subtotal: 23809.52,
      taxAmount: 1190.48,
      totalAmount: 25000,
      items: [
        {
          productId: mockProductId,
          quantity: 2000,
          unit: 'METER',
          unitPrice: 12.5,
          lineTotal: 25000,
        },
      ],
      status: 'CONFIRMED',
      confirmedDeliveryDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
      leadTimeWeeks: 4,
    });

    // Seed Supplier, PO & GRN
    testSupplier = await Supplier.create({
      supplierCode: 'SUP-VARD-01',
      name: 'Vardhman Premium Yarns Ltd',
      contactPerson: {
        name: 'Arun Verma',
        email: 'sales@vardhmanyarns.com',
        phone: '+91 98141 12345',
      },
    });

    const mockInventoryItemId = new mongoose.Types.ObjectId();
    testPO = await PurchaseOrder.create({
      poNumber: 'PO-2026-441',
      supplierId: testSupplier._id,
      items: [
        {
          inventoryItemId: mockInventoryItemId,
          description: '100% Combed Cotton 40s/1',
          quantity: 1000,
          unit: 'KILOGRAM',
          unitPrice: 5.5,
          lineTotal: 5500,
        },
      ],
      subtotal: 5500,
      taxAmount: 0,
      totalAmount: 5500,
      status: 'COMPLETED',
    });

    testGRN = await GoodsReceipt.create({
      grnNumber: 'GRN-2026-881',
      purchaseOrderId: testPO._id,
      supplierId: testSupplier._id,
      deliveryChallanNumber: 'DC-88102',
      receivedBy: adminUser._id,
      receivedItems: [
        {
          inventoryItemId: mockInventoryItemId,
          receivedQuantity: 1000,
          acceptedQuantity: 980,
          rejectedQuantity: 20,
          unit: 'KILOGRAM',
        },
      ],
    });
  });

  // ===========================================================================
  // TEST 1: ATTENDANCE RECORDING & PREVENTING DUPLICATE DAILY ENTRIES
  // ===========================================================================
  it('1. Records operator attendance, computes regular/overtime hours, and prevents duplicate daily entries', async () => {
    const today = new Date('2026-10-01T00:00:00.000Z');

    // 10 hours total = 8 regular + 2 overtime
    const checkIn = new Date('2026-10-01T06:00:00.000Z');
    const checkOut = new Date('2026-10-01T16:00:00.000Z');

    const att = await recordAttendance({
      operatorId: operatorUser._id,
      date: today,
      shiftId: morningShift._id,
      checkInTime: checkIn,
      checkOutTime: checkOut,
      status: 'PRESENT',
      remarks: 'Morning shift weaving run',
      actorUser: adminUser,
    });

    expect(att).toBeDefined();
    expect(att.hoursWorked).toBe(10);
    expect(att.overtimeHours).toBe(2);
    expect(att.approvedOvertimeHours).toBe(0); // Not approved yet
    expect(att.status).toBe('PRESENT');

    // Subsequent recording on the same day updates the existing record rather than creating a duplicate
    const updatedAtt = await recordAttendance({
      operatorId: operatorUser._id,
      date: today,
      shiftId: morningShift._id,
      hoursWorked: 11,
      overtimeHours: 3,
      status: 'PRESENT',
      remarks: 'Extended shift run',
      actorUser: adminUser,
    });

    expect(updatedAtt._id.toString()).toBe(att._id.toString());
    expect(updatedAtt.hoursWorked).toBe(11);
    expect(updatedAtt.overtimeHours).toBe(3);

    const count = await Attendance.countDocuments({
      operatorId: operatorUser._id,
      date: today,
    });
    expect(count).toBe(1);
  });

  // ===========================================================================
  // TEST 2: APPROVED OVERTIME & AUTHORIZED CORRECTIONS WITH AUDIT HISTORY
  // ===========================================================================
  it('2. Approves overtime and performs authorized corrections while preserving the full history snapshot', async () => {
    const today = new Date('2026-10-02T00:00:00.000Z');
    const att = await Attendance.create({
      operatorId: operatorUser._id,
      date: today,
      shiftId: morningShift._id,
      hoursWorked: 10,
      overtimeHours: 2,
      status: 'PRESENT',
    });

    // Approve overtime hours
    const approvedAtt = await approveOvertime({
      attendanceId: att._id,
      approvedOvertimeHours: 2,
      actorUser: adminUser,
      notes: 'Approved for urgent export order weaving completion',
    });

    expect(approvedAtt.approvedOvertimeHours).toBe(2);
    expect(approvedAtt.overtimeStatus).toBe('APPROVED');
    expect(approvedAtt.overtimeApprovedBy.toString()).toBe(adminUser._id.toString());

    // Authorized correction: timekeeper biometric glitch, actually worked 11 hours (3 OT)
    const correctedAtt = await correctAttendance({
      attendanceId: att._id,
      correctedHoursWorked: 11,
      correctedOvertimeHours: 3,
      reason: 'Biometric reader log discrepancy verified by security gate register',
      actorUser: adminUser,
    });

    expect(correctedAtt.hoursWorked).toBe(11);
    expect(correctedAtt.overtimeHours).toBe(3);
    expect(correctedAtt.corrections).toHaveLength(1);
    expect(correctedAtt.corrections[0].originalHoursWorked).toBe(10);
    expect(correctedAtt.corrections[0].correctedHoursWorked).toBe(11);
    expect(correctedAtt.corrections[0].reason).toContain('Biometric reader log discrepancy');
    expect(correctedAtt.corrections[0].correctedBy.toString()).toBe(adminUser._id.toString());

    // Verify audit log entry was created
    const audit = await AuditLog.findOne({ action: 'ATTENDANCE_CORRECTED' });
    expect(audit).toBeDefined();
    expect(audit.entityId.toString()).toBe(att._id.toString());
  });

  // ===========================================================================
  // TEST 3: WAGE CALCULATION WITH CONFIGURABLE RULES & CALCULATION SNAPSHOT
  // ===========================================================================
  it('3. Calculates wages using configurable rules, verified attendance, and preserves calculation snapshot', async () => {
    const startDate = new Date('2026-10-01T00:00:00.000Z');
    const endDate = new Date('2026-10-05T00:00:00.000Z');

    // Create 5 days of verified attendance for operator (Rate: $18.50 / hr)
    // Day 1-3: 8 hrs (0 OT) = 24 hrs
    // Day 4-5: 10 hrs (2 hrs OT approved each) = 16 reg + 4 approved OT
    // Total: 40 regular hours, 4 approved overtime hours
    for (let day = 1; day <= 5; day++) {
      const d = new Date(`2026-10-0${day}T00:00:00.000Z`);
      const ot = day >= 4 ? 2 : 0;
      const hours = 8 + ot;
      await Attendance.create({
        operatorId: operatorUser._id,
        date: d,
        shiftId: day === 5 ? nightShift._id : morningShift._id,
        hoursWorked: hours,
        overtimeHours: ot,
        approvedOvertimeHours: ot,
        overtimeStatus: ot > 0 ? 'APPROVED' : 'NONE',
        status: 'PRESENT',
      });
    }

    // Configurable rules:
    // Overtime multiplier: 1.5x ($18.50 * 1.5 = $27.75/hr)
    // Shift allowance: $50 (night shift bonus)
    // Production incentive: $100 (for high loom pick efficiency)
    // Deductions: $40 (Provident fund / Advance deduction)
    const statement = await calculateWageStatement({
      operatorId: operatorUser._id,
      periodStartDate: startDate,
      periodEndDate: endDate,
      overtimeMultiplier: 1.5,
      shiftAllowance: 50,
      productionIncentiveBonus: 100,
      deductions: 40,
      actorUser: adminUser,
    });

    expect(statement).toBeDefined();
    expect(statement.status).toBe('DRAFT');
    expect(statement.regularHoursWorked).toBe(40);
    expect(statement.approvedOvertimeHours).toBe(4);
    expect(statement.baseHourlyRate).toBe(18.5);

    // Formula Verification:
    // Regular Wage = 40 * 18.50 = 740.00
    // Overtime Wage = 4 * (18.50 * 1.5) = 4 * 27.75 = 111.00
    // Gross Wage = 740.00 + 111.00 + 50.00 + 100.00 = 1001.00
    // Net Payable = 1001.00 - 40.00 = 961.00
    expect(statement.regularWage).toBe(740.0);
    expect(statement.overtimeWage).toBe(111.0);
    expect(statement.grossWage).toBe(1001.0);
    expect(statement.deductions).toBe(40.0);
    expect(statement.netPayableWage).toBe(961.0);

    // Verify snapshot was captured
    expect(statement.calculationInputsSnapshot).toBeDefined();
    expect(statement.calculationInputsSnapshot.hourlyRate).toBe(18.5);
    expect(statement.calculationInputsSnapshot.overtimeMultiplier).toBe(1.5);
    expect(statement.calculationInputsSnapshot.regularHours).toBe(40);
    expect(statement.calculationInputsSnapshot.overtimeHours).toBe(4);
  });

  // ===========================================================================
  // TEST 4: WAGE STATEMENT ADJUSTMENT, APPROVAL, AND DISBURSEMENT
  // ===========================================================================
  it('4. Applies authorized adjustments, approves wage statements, and disburses payment with unique UTR', async () => {
    const startDate = new Date('2026-10-06T00:00:00.000Z');
    const endDate = new Date('2026-10-10T00:00:00.000Z');

    await Attendance.create({
      operatorId: operatorUser._id,
      date: startDate,
      shiftId: morningShift._id,
      hoursWorked: 8,
      status: 'PRESENT',
    });

    const statement = await calculateWageStatement({
      operatorId: operatorUser._id,
      periodStartDate: startDate,
      periodEndDate: endDate,
      actorUser: adminUser,
    });

    // 8 hrs * $18.50 = $148.00
    expect(statement.netPayableWage).toBe(148.0);

    // Add adjustment: +$20 tool allowance
    const adjusted = await adjustWageStatement({
      statementId: statement._id,
      adjustmentAmount: 20,
      reason: 'Special reed cleaning tool maintenance allowance',
      actorUser: adminUser,
    });

    expect(adjusted.adjustments).toHaveLength(1);
    expect(adjusted.totalAdjustmentAmount).toBe(20);
    expect(adjusted.netPayableWage).toBe(168.0); // 148 + 20

    // Reject disburse before approval
    await expect(
      disburseWagePayment({
        statementId: statement._id,
        paymentReference: 'UTR-WAGE-99901',
        actorUser: adminUser,
      })
    ).rejects.toThrow(/must be APPROVED before payment/);

    // Approve statement
    const approved = await approveWageStatement({
      statementId: statement._id,
      actorUser: adminUser,
      approvalNotes: 'Audited and verified by Mill Operations Head',
    });
    expect(approved.status).toBe('APPROVED');

    // Disburse wage payment
    const { payment, statement: paidStatement } = await disburseWagePayment({
      statementId: statement._id,
      paymentAmount: 168.0,
      paymentMethod: 'BANK_TRANSFER',
      paymentReference: 'UTR-WAGE-99901',
      bankAccountNumber: 'SBI-4401-9218',
      bankIfsc: 'SBIN0004128',
      notes: 'October Cycle 1 Wage Disbursement',
      actorUser: adminUser,
    });

    expect(payment).toBeDefined();
    expect(payment.amountPaid).toBe(168.0);
    expect(payment.paymentReference).toBe('UTR-WAGE-99901');
    expect(paidStatement.status).toBe('PAID');
    expect(paidStatement.paymentId.toString()).toBe(payment._id.toString());

    // Prevent duplicate disbursement with same UTR
    await expect(
      disburseWagePayment({
        statementId: statement._id,
        paymentAmount: 168.0,
        paymentReference: 'UTR-WAGE-99901',
        actorUser: adminUser,
      })
    ).rejects.toThrow();
  });

  // ===========================================================================
  // TEST 5: STRICT RBAC & PERSONAL WAGE INFORMATION ACCESS CONTROL
  // ===========================================================================
  it('5. Enforces strict RBAC: operators can only view their own wages; customers receive 403 Forbidden', async () => {
    const startDate = new Date('2026-10-11T00:00:00.000Z');
    const endDate = new Date('2026-10-15T00:00:00.000Z');

    await Attendance.create({
      operatorId: operatorUser._id,
      date: startDate,
      shiftId: morningShift._id,
      hoursWorked: 8,
      status: 'PRESENT',
    });

    const statement = await calculateWageStatement({
      operatorId: operatorUser._id,
      periodStartDate: startDate,
      periodEndDate: endDate,
      actorUser: adminUser,
    });

    // 1. Operator 1 requests their own statements -> 200 OK
    const resOpr1 = await request(app)
      .get('/api/v1/wages')
      .set('Cookie', operatorCookie);
    expect(resOpr1.status).toBe(200);
    expect(resOpr1.body.data).toHaveLength(1);
    expect(resOpr1.body.data[0]._id.toString()).toBe(statement._id.toString());

    // 2. Operator 2 requests statements -> gets empty list (cannot see Operator 1's statement)
    const resOpr2 = await request(app)
      .get('/api/v1/wages')
      .set('Cookie', anotherOperatorCookie);
    expect(resOpr2.status).toBe(200);
    expect(resOpr2.body.data).toHaveLength(0);

    // 3. Operator 2 tries to GET Operator 1's specific statement by ID -> 403 Forbidden
    const resOpr2Single = await request(app)
      .get(`/api/v1/wages/${statement._id}`)
      .set('Cookie', anotherOperatorCookie);
    expect(resOpr2Single.status).toBe(403);

    // 4. Customer tries to access wages -> 403 Forbidden
    const resCust = await request(app)
      .get('/api/v1/wages')
      .set('Cookie', customerCookie);
    expect(resCust.status).toBe(403);
  });

  // ===========================================================================
  // TEST 6: MANUFACTURING COST TRACKING & PREVENTING DOUBLE COUNTING
  // ===========================================================================
  it('6. Tracks yarn consumption, labour, machine, and rework costs, and prevents duplicate financial entries', async () => {
    // 1. Direct Material: Yarn issue
    const matEntry = await recordCostEntry({
      orderId: testOrder._id,
      costCategory: 'DIRECT_MATERIAL',
      costType: 'ACTUAL',
      amount: 5500.0,
      unitQuantity: 1000,
      unitOfMeasure: 'KG',
      ratePerUnit: 5.5,
      sourceReference: 'YARN-ISSUE-BATCH-401',
      description: '1000 kg combed cotton issued for weaving run',
      actorUser: adminUser,
    });
    expect(matEntry).toBeDefined();
    expect(matEntry.amount).toBe(5500.0);

    // 2. Prevent duplicate cost entry with same sourceReference
    await expect(
      recordCostEntry({
        orderId: testOrder._id,
        costCategory: 'DIRECT_MATERIAL',
        costType: 'ACTUAL',
        amount: 5500.0,
        sourceReference: 'YARN-ISSUE-BATCH-401',
        actorUser: adminUser,
      })
    ).rejects.toThrow(/Duplicate cost entry/);

    // 3. Direct Labour
    await recordCostEntry({
      orderId: testOrder._id,
      costCategory: 'DIRECT_LABOUR',
      costType: 'ACTUAL',
      amount: 1480.0,
      unitQuantity: 80,
      unitOfMeasure: 'HOURS',
      ratePerUnit: 18.5,
      sourceReference: 'LABOUR-RUN-881',
      description: '80 operator hours logged across weaving stages',
      actorUser: adminUser,
    });

    // 4. Machine Operating Cost
    await recordCostEntry({
      orderId: testOrder._id,
      costCategory: 'MACHINE_OPERATING',
      machineId: testMachine._id,
      costType: 'ACTUAL',
      amount: 2240.0,
      unitQuantity: 80,
      unitOfMeasure: 'HOURS',
      ratePerUnit: 28.0,
      sourceReference: 'MACHINE-RUN-LOOM-08-JOB-1',
      description: '80 machine run hours @ $28.00/hr on Picanol Air-Jet Loom',
      actorUser: adminUser,
    });

    // 5. Finishing / Dyeing
    await recordCostEntry({
      orderId: testOrder._id,
      costCategory: 'DYEING_FINISHING',
      costType: 'ACTUAL',
      amount: 1200.0,
      unitQuantity: 2000,
      unitOfMeasure: 'METERS',
      ratePerUnit: 0.6,
      sourceReference: 'FINISHING-STENTER-JOB-4',
      description: 'Stenter finishing and heat setting @ $0.60/m',
      actorUser: adminUser,
    });

    // 6. Scrap & Rework
    await recordCostEntry({
      orderId: testOrder._id,
      costCategory: 'SCRAP_AND_WASTE',
      costType: 'ACTUAL',
      amount: 350.0,
      unitQuantity: 40,
      unitOfMeasure: 'METERS',
      ratePerUnit: 8.75,
      sourceReference: 'REWORK-SCRAP-DEFECT-12',
      description: '40 meters oil stain defective cut-outs scrap cost',
      actorUser: adminUser,
    });

    const analysis = await getOrderCostAnalysis(testOrder._id);
    expect(analysis.costEntries).toHaveLength(5);
    expect(analysis.manufacturingCost.actualRawMaterialCost).toBe(5500.0);
    expect(analysis.manufacturingCost.actualLaborCost).toBe(1480.0);
    expect(analysis.manufacturingCost.actualMachineCost).toBe(2240.0);
    expect(analysis.manufacturingCost.actualFinishingCost).toBe(1200.0);
    expect(analysis.manufacturingCost.actualScrapAndReworkCost).toBe(350.0);
  });

  // ===========================================================================
  // TEST 7: ALLOCATED OVERHEAD USING EXPLICIT DOCUMENTED METHOD
  // ===========================================================================
  it('7. Allocates manufacturing overhead using documented per-meter rate and syncs total actual costs', async () => {
    // Documented method: $0.35 per meter produced on 2000 meters = $700.00
    const ovhEntry = await allocateManufacturingOverhead({
      orderId: testOrder._id,
      overheadRatePerMeter: 0.35,
      method: 'METERS_PRODUCED_ALLOCATION',
      actorUser: adminUser,
    });

    expect(ovhEntry).toBeDefined();
    expect(ovhEntry.amount).toBe(700.0);
    expect(ovhEntry.costCategory).toBe('ALLOCATED_OVERHEAD');
    expect(ovhEntry.allocationMethod).toBe('METERS_PRODUCED_ALLOCATION');

    const mCost = await ManufacturingCost.findOne({ orderId: testOrder._id });
    expect(mCost.actualOverheadCost).toBe(700.0);
    expect(mCost.overheadRateApplied).toBe(0.35);
  });

  // ===========================================================================
  // TEST 8: FINANCIAL REPORTING: ESTIMATED VS ACTUAL, GROSS MARGIN, INVOICED VS PAID
  // ===========================================================================
  it('8. Compares estimated vs actual costs, calculates gross margin, and clearly distinguishes invoiced vs received cash', async () => {
    // Generate a commercial invoice of $25,000 for the order
    const mockDispatchId = new mongoose.Types.ObjectId();
    const invoice = await Invoice.create({
      invoiceNumber: 'INV-2026-9001',
      orderId: testOrder._id,
      customerId: customerUser._id,
      dispatchId: mockDispatchId,
      subtotal: 23809.52,
      taxAmount: 1190.48,
      totalInvoiceAmount: 25000.0,
      amountPaid: 10000.0, // Partial payment cleared
      balanceDue: 15000.0,
      paymentStatus: 'PARTIALLY_PAID',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // Record partial customer payment of $10,000
    await CustomerPayment.create({
      paymentNumber: 'PAY-2026-9001',
      invoiceId: invoice._id,
      orderId: testOrder._id,
      customerId: customerUser._id,
      amountPaid: 10000.0,
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: 'UTR-CUST-WIRE-7701',
      paidAt: new Date(),
      status: 'CLEARED',
      recordedBy: adminUser._id,
    });

    // Seed material and labour actual costs for order
    await recordCostEntry({
      orderId: testOrder._id,
      costCategory: 'DIRECT_MATERIAL',
      costType: 'ACTUAL',
      amount: 8000.0,
      sourceReference: 'YARN-TEST-8000',
      actorUser: adminUser,
    });

    await recordCostEntry({
      orderId: testOrder._id,
      costCategory: 'DIRECT_LABOUR',
      costType: 'ACTUAL',
      amount: 3000.0,
      sourceReference: 'LABOUR-TEST-3000',
      actorUser: adminUser,
    });

    await allocateManufacturingOverhead({
      orderId: testOrder._id,
      overheadRatePerMeter: 0.5,
      actorUser: adminUser,
    }); // 2000m * $0.50 = $1,000

    const analysis = await getOrderCostAnalysis(testOrder._id);
    const mc = analysis.manufacturingCost;

    // Total Actual Cost = 8000 + 3000 + 1000 = $12,000
    expect(mc.totalActualCost).toBe(12000.0);

    // Billed Revenue = $25,000. Received Cash = $10,000. Outstanding Receivables = $15,000.
    expect(mc.billedRevenue).toBe(25000.0);
    expect(mc.receivedRevenue).toBe(10000.0);
    expect(mc.outstandingCustomerBalance).toBe(15000.0);

    // Gross Margin = 25000 - 12000 = $13,000 (52.0%)
    expect(mc.grossMarginAmount).toBe(13000.0);
    expect(mc.grossMarginPercentage).toBe(52.0);

    // Query executive financial report
    const report = await getExecutiveFinancialReport();
    expect(report.commercial.totalInvoicedRevenue).toBe(25000.0);
    expect(report.commercial.totalCustomerCashReceived).toBe(10000.0);
    expect(report.commercial.totalCustomerReceivables).toBe(15000.0);
    expect(report.profitability.grossMargin).toBe(13000.0);
    expect(report.commercial.distinctionNote).toContain('Issued customer invoice creates an account receivable');
  });

  // ===========================================================================
  // TEST 9: SUPPLIER INVOICES & 3-WAY RECONCILIATION MATRIX
  // ===========================================================================
  it('9. Reconciles supplier POs, receipts, supplier invoices, wage liabilities, and customer receipts', async () => {
    // Record Supplier Invoice against PO ($5,500 for 1000 kg yarn)
    const supInv = await recordSupplierInvoice({
      invoiceNumber: 'SUP-INV-2026-9901',
      supplierId: testSupplier._id,
      purchaseOrderId: testPO._id,
      goodsReceiptId: testGRN._id,
      invoicedQuantity: 1000,
      unit: 'KG',
      unitPrice: 5.5,
      subtotal: 5500.0,
      taxAmount: 275.0,
      totalAmount: 5775.0,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      actorUser: adminUser,
    });

    expect(supInv).toBeDefined();
    expect(supInv.totalAmount).toBe(5775.0);
    expect(supInv.paymentStatus).toBe('UNPAID');

    // Record partial supplier payment of $3,000
    const updatedSupInv = await recordSupplierPayment({
      supplierInvoiceId: supInv._id,
      paymentReference: 'UTR-SUP-NEFT-5510',
      amount: 3000.0,
      actorUser: adminUser,
    });

    expect(updatedSupInv.paidAmount).toBe(3000.0);
    expect(updatedSupInv.balanceDue).toBe(2775.0);
    expect(updatedSupInv.paymentStatus).toBe('PARTIALLY_PAID');

    // Run 3-Way Reconciliation
    const matrix = await getThreeWayReconciliation();

    expect(matrix.procurementStream).toBeDefined();
    expect(matrix.procurementStream.authorizedPurchaseOrderValue).toBe(5500.0);
    expect(matrix.procurementStream.supplierInvoicesReceived).toBe(5775.0);
    expect(matrix.procurementStream.supplierPaymentsDisbursed).toBe(3000.0);
    expect(matrix.procurementStream.outstandingSupplierPayables).toBe(2775.0);

    expect(matrix.laborStream).toBeDefined();
    expect(matrix.customerStream).toBeDefined();
  });

  // ===========================================================================
  // TEST 10: MACHINE FLEET OUTPUT, UTILIZATION %, DOWNTIME, AND OPERATING COSTS
  // ===========================================================================
  it('10. Reports machine-wise output, utilization percentage, downtime, and operating costs', async () => {
    // Record a breakdown downtime report of 8 hours (450 mins = 7.5 hrs) for the machine
    await BreakdownReport.create({
      reportNumber: 'BRK-2026-004',
      machineId: testMachine._id,
      breakdownType: 'MECHANICAL',
      description: 'Main rapier drive gear teeth wear and timing belt slip',
      reportedBy: operatorUser._id,
      status: 'RESOLVED',
      downtimeMinutes: 450,
    });

    const report = await getMachineUtilizationAndCostReport();

    expect(report.fleetSummary.totalMachines).toBeGreaterThanOrEqual(1);
    expect(report.fleetSummary.fleetOutputMeters).toBe(4500);
    expect(report.fleetSummary.fleetRunHours).toBe(120);

    const m = report.machines.find((x) => x.machineCode === 'LOOM-AIR-08');
    expect(m).toBeDefined();
    expect(m.totalRunHours).toBe(120);
    expect(m.downtimeHours).toBe(7.5);
    expect(m.hourlyOperatingRate).toBe(28.0);
    // Operating cost = 120 hrs * $28.00 = $3360.00
    expect(m.operatingCost).toBe(3360.0);
    // Utilization = (120 / 720) * 100 = 16.67%
    expect(m.utilizationPercentage).toBe(16.67);
  });
});
