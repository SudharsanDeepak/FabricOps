import { InventoryItem, Machine, PurchaseOrder, Product, FinishedGoodsInventory } from '../models/index.js';
import { logger } from '../config/logger.js';

/**
 * Calculates raw yarn required in kilograms based on fabric specifications and target quantity.
 */
export function calculateYarnRequiredKg({ quantityMeters, gsm = 150, widthInches = 58, wastePercent = 5 }) {
  const widthMeters = (widthInches || 58) * 0.0254;
  const totalSquareMeters = Number(quantityMeters) * widthMeters;
  const rawWeightKg = (totalSquareMeters * Number(gsm)) / 1000;
  const withWasteAllowance = rawWeightKg * (1 + (wastePercent || 5) / 100);
  return Math.round(withWasteAllowance * 100) / 100;
}

/**
 * Checks yarn inventory feasibility, distinguishing on-hand, reserved, available, and incoming stock.
 * BUSINESS RULE: A shortage must not imply that a supplier delivery date is guaranteed.
 */
export async function checkYarnFeasibility({ fabricSpecs = {}, quantity = 1000, yarnSku = null }) {
  const requiredKg = calculateYarnRequiredKg({
    quantityMeters: quantity,
    gsm: fabricSpecs.gsm || 120,
    widthInches: fabricSpecs.widthInches || 58,
  });

  // Query RAW_YARN inventory items
  let yarnItem = null;
  if (yarnSku) {
    yarnItem = await InventoryItem.findOne({ sku: yarnSku, category: 'RAW_YARN' });
  }

  if (!yarnItem) {
    // If yarn count matches combed 40s or twill 30s
    const yarnCount = fabricSpecs.yarnCountWarp || fabricSpecs.yarnCountWeft || '';
    if (yarnCount.includes('40')) {
      yarnItem = await InventoryItem.findOne({ sku: 'YRN-C40-CMB' });
    } else if (yarnCount.includes('30') || yarnCount.includes('20')) {
      yarnItem = await InventoryItem.findOne({ sku: 'YRN-C30-ORG' });
    }
    // Fallback to any available raw yarn
    if (!yarnItem) {
      yarnItem = await InventoryItem.findOne({ category: 'RAW_YARN' });
    }
  }

  const onHandKg = yarnItem ? yarnItem.quantityOnHand : 0;
  const reservedKg = yarnItem ? yarnItem.quantityReserved : 0;
  const availableKg = Math.max(0, onHandKg - reservedKg);

  // Look up expected incoming yarn from open Purchase Orders
  let expectedIncomingKg = 0;
  const incomingPOs = [];

  if (yarnItem) {
    const openPOs = await PurchaseOrder.find({
      status: { $in: ['ISSUED', 'PARTIALLY_RECEIVED'] },
      'items.inventoryItemId': yarnItem._id,
    }).populate('supplierId', 'name supplierCode rating');

    for (const po of openPOs) {
      for (const item of po.items) {
        if (item.inventoryItemId.toString() === yarnItem._id.toString()) {
          expectedIncomingKg += item.quantity;
          incomingPOs.push({
            poNumber: po.poNumber,
            supplierName: po.supplierId?.name || 'Registered Spinner',
            expectedDeliveryDate: po.expectedDeliveryDate,
            quantity: item.quantity,
            unit: item.unit,
            status: po.status,
            // CRITICAL BUSINESS RULE:
            isGuaranteed: false,
            caveat: 'Supplier delivery date is an estimate and not contractually guaranteed',
          });
        }
      }
    }
  }

  const shortageKg = Math.max(0, Math.round((requiredKg - availableKg) * 100) / 100);
  const yarnInStock = shortageKg === 0;

  return {
    yarnSku: yarnItem?.sku || 'YRN-GENERIC',
    yarnName: yarnItem?.name || 'Standard Spun Yarn',
    yarnRequiredKg: requiredKg,
    onHandKg,
    reservedKg,
    availableKg,
    expectedIncomingKg,
    incomingPOs,
    shortageKg,
    yarnInStock,
    // BUSINESS RULE: A shortage must not imply that a supplier delivery date is guaranteed
    supplierGuaranteed: false,
    leadTimeDaysIfShortage: shortageKg > 0 ? 10 : 0,
    notes: yarnInStock
      ? `Full yarn requirement of ${requiredKg} kg is available in inventory.`
      : `Shortage of ${shortageKg} kg identified. Available stock is ${availableKg} kg against required ${requiredKg} kg. Incoming unconfirmed PO pipeline: ${expectedIncomingKg} kg.`,
  };
}

/**
 * Evaluates machine compatibility, reed space, and current workload.
 */
export async function checkMachineCompatibility({ fabricSpecs = {}, quantity = 1000 }) {
  const widthInches = fabricSpecs.widthInches || 58;

  // Retrieve loom fleet
  const looms = await Machine.find({
    type: { $in: ['AIR_JET_LOOM', 'RAPIER_LOOM', 'CIRCULAR_KNITTING'] },
  });

  const compatibleMachines = [];
  const incompatibleMachines = [];

  for (const loom of looms) {
    const reedSpace = loom.specifications?.reedSpaceInches || 75;
    const isWidthCompatible = reedSpace >= widthInches;

    const loomData = {
      machineId: loom._id,
      machineCode: loom.machineCode,
      name: loom.name,
      type: loom.type,
      reedSpaceInches: reedSpace,
      requiredWidthInches: widthInches,
      status: loom.status,
      speedRpm: loom.telemetrySnapshot?.rpm || 800,
      efficiencyPercentage: loom.telemetrySnapshot?.efficiencyPercentage || 90,
      shedLocation: `${loom.location?.shed} / ${loom.location?.bay}`,
      isCompatible: isWidthCompatible,
      incompatibilityReason: !isWidthCompatible
        ? `Loom reed space (${reedSpace}") is smaller than required fabric width (${widthInches}")`
        : null,
    };

    if (isWidthCompatible) {
      compatibleMachines.push(loomData);
    } else {
      incompatibleMachines.push(loomData);
    }
  }

  // Calculate estimated weaving days based on 400 meters/day per air-jet loom
  const dailyCapacityPerLoom = 380; // Standard meters per 2-shift day
  const effectiveLooms = Math.max(1, compatibleMachines.filter((m) => m.status === 'RUNNING' || m.status === 'IDLE').length);
  const estimatedWeavingDays = Math.max(2, Math.ceil(Number(quantity) / (dailyCapacityPerLoom * Math.min(2, effectiveLooms))));

  return {
    compatibleCount: compatibleMachines.length,
    compatibleMachines,
    incompatibleMachines,
    estimatedWeavingDays,
    recommendedMachine: compatibleMachines[0] || null,
  };
}

/**
 * Transparent delivery date calculation engine:
 * Proposes a delivery date using material lead time, machine capacity,
 * production routing, quality inspection, and dispatch preparation.
 */
export function calculateProposedTimeline({
  yarnFeasibility,
  machineFeasibility,
  quantity = 1000,
}) {
  // 1. Material lead time
  const materialLeadDays = yarnFeasibility.yarnInStock ? 0 : 8;

  // 2. Production routing
  const warpingSizingDays = 2;
  const weavingDays = machineFeasibility.estimatedWeavingDays || 7;
  const dyeingFinishingDays = 3;
  const totalProductionDays = warpingSizingDays + weavingDays + dyeingFinishingDays;

  // 3. Quality inspection
  const qcDays = 2;

  // 4. Dispatch preparation
  const dispatchDays = 1;

  // Total lead time
  const totalLeadTimeDays = materialLeadDays + totalProductionDays + qcDays + dispatchDays;
  const proposedDeliveryDate = new Date(Date.now() + totalLeadTimeDays * 24 * 60 * 60 * 1000);

  const breakdown = [
    {
      stage: 'Material Readiness',
      days: materialLeadDays,
      status: yarnFeasibility.yarnInStock ? 'READY_ON_HAND' : 'PROCUREMENT_ESTIMATE',
      details: yarnFeasibility.yarnInStock
        ? 'Raw yarn available in warehouse'
        : `Yarn procurement lead time (~${materialLeadDays} days; unconfirmed estimate)`,
    },
    {
      stage: 'Warping & Sizing',
      days: warpingSizingDays,
      status: 'SCHEDULED',
      details: 'High-speed beam warping and size bath treatment',
    },
    {
      stage: 'Loom Weaving',
      days: weavingDays,
      status: 'CAPACITY_PLANNED',
      details: `Weaving ${quantity}m on compatible high-speed looms`,
    },
    {
      stage: 'Dyeing & Stenter Finishing',
      days: dyeingFinishingDays,
      status: 'SCHEDULED',
      details: 'Continuous open-width scouring, thermo-fixation and heat setting',
    },
    {
      stage: '4-Point Quality Inspection',
      days: qcDays,
      status: 'SCHEDULED',
      details: 'Digital defect mapping, GSM check, and Grade A/B grading',
    },
    {
      stage: 'Packing & Dispatch Prep',
      days: dispatchDays,
      status: 'SCHEDULED',
      details: 'Polythene wrapping, barcode roll tagging, and transit pass',
    },
  ];

  const assumptions = [
    yarnFeasibility.yarnInStock
      ? `Raw yarn (${yarnFeasibility.yarnSku}) readily available in stock.`
      : `Assumes supplier yarn batch arrives within ${materialLeadDays} working days.`,
    `Production scheduled on ${machineFeasibility.compatibleCount} compatible weaving loom(s).`,
    'Standard factory 2-shift operating schedule without unscheduled breakdown halts.',
    '4-Point quality inspection and lab shrink/GSM testing buffer included.',
  ];

  const riskFactors = [
    ...(yarnFeasibility.shortageKg > 0
      ? [
          'Material Shortage Risk: Supplier delivery date is an estimate and not contractually guaranteed.',
        ]
      : []),
    'Machine allocation is subject to current job completions; actual start date locks upon confirmation.',
    'Quotation validity is 10 days; raw yarn market rates subject to change thereafter.',
  ];

  return {
    totalLeadTimeDays,
    proposedDeliveryDate,
    breakdown,
    assumptions,
    riskFactors,
  };
}

/**
 * Calculates Available-To-Promise (ATP) stock for published catalog items.
 */
export async function calculateProductATP(product) {
  // Check finished goods inventory on hand
  const fgRecords = await FinishedGoodsInventory.find({
    productName: product.name,
    isAllocatedToDispatch: false,
    grade: { $in: ['GRADE_A', 'GRADE_B'] },
  });

  const finishedGoodsOnHandMeters = fgRecords.reduce((sum, r) => sum + (r.netMeters || 0), 0);

  // Check yarn availability for additional production
  const yarnFeasibility = await checkYarnFeasibility({
    fabricSpecs: product.fabricSpecification || {},
    quantity: product.pricing?.minimumOrderQuantity || 500,
  });

  let indicativeLeadTimeDays = 3; // If finished fabric is ready
  let stockStatus = 'IN_STOCK';

  if (finishedGoodsOnHandMeters < (product.pricing?.minimumOrderQuantity || 500)) {
    if (yarnFeasibility.yarnInStock) {
      stockStatus = 'PRODUCIBLE';
      indicativeLeadTimeDays = 14;
    } else {
      stockStatus = 'BACKORDER_REQUIRED';
      indicativeLeadTimeDays = 24;
    }
  }

  return {
    finishedGoodsOnHandMeters,
    atpStock: finishedGoodsOnHandMeters,
    stockStatus,
    indicativeLeadTimeDays,
    yarnInStock: yarnFeasibility.yarnInStock,
    minimumOrderQuantity: product.pricing?.minimumOrderQuantity || 500,
  };
}

