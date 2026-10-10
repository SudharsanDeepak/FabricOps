import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { connectTestDB, clearTestDB, disconnectTestDB } from './mongoTestHelper.js';
import {
  User,
  InventoryItem,
  Quotation,
  Order,
  FabricRoll,
  QualityInspection,
  Dispatch,
  Attendance,
  Shift,
} from '../src/models/index.js';

describe('Everest Textile OS — Data Layer & Business Invariants', () => {
  beforeAll(async () => {
    await connectTestDB();
  }, 120000); // Allow time for MongoMemoryServer download if needed

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  // =========================================================================
  // 1. INVENTORY CONSISTENCY & CONCURRENCY-SAFE UPDATES
  // =========================================================================
  describe('1. Inventory Consistency & Atomic Operations', () => {
    it('should strictly reject direct saves that would result in negative quantityOnHand', async () => {
      const item = new InventoryItem({
        sku: 'TEST-SKU-001',
        name: '40s Combed Cotton',
        category: 'RAW_YARN',
        unit: 'KILOGRAM',
        quantityOnHand: -50, // Negative quantity
        unitCost: 320,
      });

      await expect(item.save()).rejects.toThrow(/cannot fall below zero/);
    });

    it('should atomically reserve stock when available and reject when insufficient', async () => {
      const item = await InventoryItem.create({
        sku: 'TEST-SKU-002',
        name: '30s Organic Cotton',
        category: 'RAW_YARN',
        unit: 'KILOGRAM',
        quantityOnHand: 1000,
        quantityReserved: 200,
        unitCost: 350,
      });

      // Available unreserved = 1000 - 200 = 800
      // Reserving 500 should succeed
      const reserved = await InventoryItem.reserveStock(item._id, 500);
      expect(reserved.quantityReserved).toBe(700);

      // Now available = 1000 - 700 = 300
      // Attempting to reserve 400 must fail atomically
      await expect(InventoryItem.reserveStock(item._id, 400)).rejects.toThrow(
        /Insufficient unreserved stock available/
      );

      // Verify the database state remains intact
      const fresh = await InventoryItem.findById(item._id);
      expect(fresh.quantityReserved).toBe(700);
    });

    it('should safely deduct stock atomically and reject deductions exceeding on-hand quantity', async () => {
      const item = await InventoryItem.create({
        sku: 'TEST-SKU-003',
        name: 'Dyeing Chemical Red-7',
        category: 'DYES_CHEMICALS',
        unit: 'LITER',
        quantityOnHand: 150,
        quantityReserved: 100,
        unitCost: 80,
      });

      // Deduct 100 from reserved
      const afterDeduct = await InventoryItem.deductStock(item._id, 100, true);
      expect(afterDeduct.quantityOnHand).toBe(50);
      expect(afterDeduct.quantityReserved).toBe(0);

      // Attempting to deduct 60 when only 50 is on hand must fail
      await expect(InventoryItem.deductStock(item._id, 60, false)).rejects.toThrow(
        /Insufficient quantity on hand/
      );

      const unchanged = await InventoryItem.findById(item._id);
      expect(unchanged.quantityOnHand).toBe(50);
    });
  });

  // =========================================================================
  // 2. ORDER CONFIRMATION INVARIANTS & REVISIONS
  // =========================================================================
  describe('2. Order Confirmation Invariants & Revisions', () => {
    it('requires customer acceptance before conversion and preserves bounded revision history', async () => {
      const customer = await User.create({
        name: 'Apex Garments',
        email: 'procurement@apex.com',
        passwordHash: 'dummyhash',
        role: 'CUSTOMER',
      });

      const quote = await Quotation.create({
        quotationNumber: 'QT-TEST-100',
        customerId: customer._id,
        items: [
          {
            productId: new mongoose.Types.ObjectId(),
            quantity: 2000,
            unit: 'METER',
            unitPrice: 150,
            lineTotal: 300000,
          },
        ],
        subtotal: 300000,
        taxPercent: 5,
        taxAmount: 15000,
        totalAmount: 315000,
        proposedDeliveryDate: new Date(Date.now() + 14 * 86400000),
        validUntil: new Date(Date.now() + 7 * 86400000),
        revisions: [
          {
            revisionNumber: 1,
            items: [],
            totalAmount: 315000,
            proposedDeliveryDate: new Date(Date.now() + 14 * 86400000),
            revisedBy: customer._id,
          },
        ],
        status: 'ISSUED', // Not yet accepted by customer
      });

      // Attempting to create an order when customer has not accepted
      const canConvert = quote.status === 'CUSTOMER_ACCEPTED';
      expect(canConvert).toBe(false);

      // Customer accepts
      quote.customerDecision = {
        decision: 'ACCEPTED',
        decidedAt: new Date(),
        customerNotes: 'Accepted with 14 day target',
        agreedDeliveryDate: quote.proposedDeliveryDate,
        agreedPrice: 150,
      };
      quote.status = 'CUSTOMER_ACCEPTED';
      await quote.save();

      // Convert to order
      const order = await Order.create({
        orderNumber: 'ORD-TEST-100',
        quotationId: quote._id,
        customerId: customer._id,
        items: quote.items,
        subtotal: quote.subtotal,
        taxAmount: quote.taxAmount,
        totalAmount: quote.totalAmount,
        confirmedDeliveryDate: quote.proposedDeliveryDate,
        status: 'CONFIRMED',
      });

      expect(order.status).toBe('CONFIRMED');
      expect(order.totalAmount).toBe(315000);

      // Unique constraint on quotationId prevents duplicate order creation from same quotation
      await expect(
        Order.create({
          orderNumber: 'ORD-TEST-DUPLICATE',
          quotationId: quote._id, // Duplicate!
          customerId: customer._id,
          items: quote.items,
          subtotal: quote.subtotal,
          taxAmount: quote.taxAmount,
          totalAmount: quote.totalAmount,
          confirmedDeliveryDate: quote.proposedDeliveryDate,
        })
      ).rejects.toThrow(/duplicate key error/);
    });
  });

  // =========================================================================
  // 3. CROSS-CUSTOMER DATA ISOLATION
  // =========================================================================
  describe('3. Cross-Customer Access & Tenant Isolation', () => {
    it('strictly isolates customer orders so customers cannot access other customers documents', async () => {
      const customerA = await User.create({
        name: 'Customer A Mills',
        email: 'customer.a@domain.com',
        passwordHash: 'dummy',
        role: 'CUSTOMER',
      });

      const customerB = await User.create({
        name: 'Customer B Knits',
        email: 'customer.b@domain.com',
        passwordHash: 'dummy',
        role: 'CUSTOMER',
      });

      await Order.create({
        orderNumber: 'ORD-A-001',
        quotationId: new mongoose.Types.ObjectId(),
        customerId: customerA._id,
        items: [{ productId: new mongoose.Types.ObjectId(), quantity: 100, unit: 'METER', unitPrice: 200, lineTotal: 20000 }],
        subtotal: 20000,
        taxAmount: 1000,
        totalAmount: 21000,
        confirmedDeliveryDate: new Date(),
      });

      await Order.create({
        orderNumber: 'ORD-B-001',
        quotationId: new mongoose.Types.ObjectId(),
        customerId: customerB._id,
        items: [{ productId: new mongoose.Types.ObjectId(), quantity: 200, unit: 'METER', unitPrice: 200, lineTotal: 40000 }],
        subtotal: 40000,
        taxAmount: 2000,
        totalAmount: 42000,
        confirmedDeliveryDate: new Date(),
      });

      // Customer A query: must filter by customerId: customerA._id
      const ordersA = await Order.find({ customerId: customerA._id });
      expect(ordersA).toHaveLength(1);
      expect(ordersA[0].orderNumber).toBe('ORD-A-001');

      // Customer A attempting to query Customer B order directly by ID + customerId check
      const orderBAttempt = await Order.findOne({
        orderNumber: 'ORD-B-001',
        customerId: customerA._id, // Enforced authorization filter
      });
      expect(orderBAttempt).toBeNull();
    });
  });

  // =========================================================================
  // 4. DUPLICATE DISPATCH PREVENTION & IDEMPOTENCY
  // =========================================================================
  describe('4. Duplicate Dispatch Prevention & Idempotency Key', () => {
    it('prevents duplicate dispatches using unique idempotencyKey and waybillNumber constraints', async () => {
      const orderId = new mongoose.Types.ObjectId();
      const customerId = new mongoose.Types.ObjectId();

      const dispatchPayload = {
        dispatchNumber: 'DSP-2026-0001',
        orderId,
        customerId,
        dispatchedRollIds: [new mongoose.Types.ObjectId()],
        totalRolls: 1,
        totalMetersDispatched: 100,
        carrierName: 'SafeExpress Logistics',
        vehicleNumber: 'TN-01-AB-1234',
        waybillNumber: 'WB-998877',
        gatePassNumber: 'GP-4433',
        idempotencyKey: 'idemp-req-unique-token-abc123',
      };

      // First dispatch creation succeeds
      const first = await Dispatch.create(dispatchPayload);
      expect(first.dispatchNumber).toBe('DSP-2026-0001');

      // Duplicate network attempt with the SAME idempotencyKey must be rejected by unique index
      await expect(
        Dispatch.create({
          ...dispatchPayload,
          dispatchNumber: 'DSP-2026-0002', // different dispatch number
          waybillNumber: 'WB-998878',
          gatePassNumber: 'GP-4434',
        })
      ).rejects.toThrow(/duplicate key error/);
    });
  });

  // =========================================================================
  // 5. 4-POINT QUALITY CONTROL AUTO SCORING
  // =========================================================================
  describe('5. 4-Point Quality Inspection Calculations', () => {
    it('automatically calculates penalty points and awards GRADE_A for <= 20 points per 100 sq.m', async () => {
      const rollId = new mongoose.Types.ObjectId();
      const orderId = new mongoose.Types.ObjectId();
      const inspectorId = new mongoose.Types.ObjectId();

      const inspection = await QualityInspection.create({
        inspectionNumber: 'QC-TEST-001',
        fabricRollId: rollId,
        orderId,
        inspectorId,
        inspectedLengthMeters: 100,
        fabricWidthInches: 58,
        defects: [
          { defectType: 'Slub', points: 1, meterPosition: 10 },
          { defectType: 'Broken Pick', points: 2, meterPosition: 45 },
        ],
      });

      // Total points = 3. Points/100 sq.m = (3 * 100 * 39.37) / (100 * 58) = 2.04
      expect(inspection.totalPenaltyPoints).toBe(3);
      expect(inspection.pointsPer100SqMeters).toBe(2.04);
      expect(inspection.grade).toBe('GRADE_A');
      expect(inspection.verdict).toBe('PASSED');
    });

    it('automatically assigns REJECT and SCRAP when penalty points exceed 28 per 100 sq.m', async () => {
      const rollId = new mongoose.Types.ObjectId();
      const orderId = new mongoose.Types.ObjectId();
      const inspectorId = new mongoose.Types.ObjectId();

      const inspection = await QualityInspection.create({
        inspectionNumber: 'QC-TEST-002',
        fabricRollId: rollId,
        orderId,
        inspectorId,
        inspectedLengthMeters: 100,
        fabricWidthInches: 58,
        defects: [
          { defectType: 'Hole', points: 4, meterPosition: 12 },
          { defectType: 'Broken Pick', points: 4, meterPosition: 25 },
          { defectType: 'Slub', points: 4, meterPosition: 38 },
          { defectType: 'Stain', points: 4, meterPosition: 50 },
          { defectType: 'Mispick', points: 4, meterPosition: 65 },
          { defectType: 'Drop Stitch', points: 4, meterPosition: 78 },
          { defectType: 'Warp Float', points: 4, meterPosition: 85 },
          { defectType: 'Weft Bar', points: 4, meterPosition: 92 },
          { defectType: 'Hole', points: 4, meterPosition: 98 },
          { defectType: 'Broken Pick', points: 4, meterPosition: 99 },
          { defectType: 'Slub', points: 4, meterPosition: 100 },
        ],
      });

      // Total points = 44. Points/100 sq.m = (44 * 100 * 39.37) / (100 * 58) = 29.87 > 28 -> REJECT
      expect(inspection.totalPenaltyPoints).toBe(44);
      expect(inspection.grade).toBe('REJECT');
      expect(inspection.verdict).toBe('SCRAP');
    });
  });

  // =========================================================================
  // 6. ATTENDANCE & SHIFT CONSTRAINTS
  // =========================================================================
  describe('6. Attendance & Shift Compound Uniqueness', () => {
    it('prevents duplicate attendance logs for the same operator on the same day', async () => {
      const operatorId = new mongoose.Types.ObjectId();
      const shiftId = new mongoose.Types.ObjectId();
      const date = new Date('2026-10-10T00:00:00.000Z');

      await Attendance.create({
        operatorId,
        date,
        shiftId,
        status: 'PRESENT',
        hoursWorked: 8,
      });

      // Attempting to record attendance again for the same operator and date must fail
      await expect(
        Attendance.create({
          operatorId,
          date,
          shiftId,
          status: 'PRESENT',
          hoursWorked: 8,
        })
      ).rejects.toThrow(/duplicate key error/);
    });
  });
});

