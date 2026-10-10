import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Package,
  Layers,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Eye,
  Activity,
  Cpu,
  Truck,
  FileText,
  Sliders,
  History,
  AlertCircle,
  Check,
  X,
  Sparkles,
  Scissors,
  Wrench,
  TrendingUp,
  Percent,
  Barcode,
  Calendar,
  User,
  Info,
  Maximize2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { api } from '../../lib/api';

const DEFECT_CATEGORIES = [
  { value: 'HOLE', label: 'Hole / Puncture', defaultPoints: 4, severity: 'CRITICAL' },
  { value: 'SLUB_NEP', label: 'Slub / Nep / Yarn Bunch', defaultPoints: 2, severity: 'MINOR' },
  { value: 'BROKEN_PICK', label: 'Broken Pick / Missing Weft', defaultPoints: 3, severity: 'MAJOR' },
  { value: 'WEFT_BAR', label: 'Weft Bar / Shading Defect', defaultPoints: 3, severity: 'MAJOR' },
  { value: 'OIL_STAIN', label: 'Machine Oil / Grease Stain', defaultPoints: 2, severity: 'MINOR' },
  { value: 'UNEVEN_WEAVING', label: 'Uneven Weaving / Tension Streak', defaultPoints: 4, severity: 'CRITICAL' },
  { value: 'WARP_FLOAT', label: 'Warp Float / Loose End', defaultPoints: 2, severity: 'MINOR' },
  { value: 'MISPICK', label: 'Mispick / Pattern Disruption', defaultPoints: 3, severity: 'MAJOR' },
  { value: 'STAIN', label: 'Dye / Color Staining', defaultPoints: 2, severity: 'MINOR' },
  { value: 'COARSE_YARN', label: 'Coarse / Irregular Yarn', defaultPoints: 1, severity: 'MINOR' },
  { value: 'SNAG', label: 'Pulled Thread / Snag', defaultPoints: 1, severity: 'MINOR' },
  { value: 'KNOT', label: 'Coarse Knot / Joint', defaultPoints: 1, severity: 'MINOR' },
  { value: 'CONTAMINATION', label: 'Foreign Fiber Contamination', defaultPoints: 3, severity: 'MAJOR' },
  { value: 'OTHER', label: 'Other Visual Defect', defaultPoints: 2, severity: 'MINOR' },
];

const REWORK_TYPES = [
  { value: 'MENDING_DARNING', label: 'Mending & Darning (Weft/Warp Repair)' },
  { value: 'SPOT_CLEANING', label: 'Spot Cleaning (Oil/Dirt Removal)' },
  { value: 'HEAT_SETTING_STENTER', label: 'Heat-Setting / Stenter Straightening' },
  { value: 'RE_WASHING', label: 'Scouring & Re-washing' },
  { value: 'CROPPING_SHEARING', label: 'Cropping & Shearing' },
  { value: 'RE_DYEING', label: 'Stripping & Re-dyeing' },
  { value: 'TRIMMING_SPLITTING', label: 'Trimming Defective Section' },
];

export function AdminQualityControlPage() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'rolls' | 'rework' | 'ai-vision'
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [rolls, setRolls] = useState([]);
  const [reworkQueue, setReworkQueue] = useState([]);
  const [aiDefects, setAiDefects] = useState([]);
  const [orders, setOrders] = useState([]);
  const [machines, setMachines] = useState([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showDoffModal, setShowDoffModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [selectedRollForInspection, setSelectedRollForInspection] = useState(null);
  const [isReinspectionFlow, setIsReinspectionFlow] = useState(false);
  const [reworkEventIdForInspection, setReworkEventIdForInspection] = useState(null);

  const [showTraceabilityModal, setShowTraceabilityModal] = useState(false);
  const [traceabilityData, setTraceabilityData] = useState(null);
  const [loadingTraceability, setLoadingTraceability] = useState(false);

  const [showAuthorizeReworkModal, setShowAuthorizeReworkModal] = useState(false);
  const [selectedReworkItem, setSelectedReworkItem] = useState(null);

  const [showCompleteReworkModal, setShowCompleteReworkModal] = useState(false);

  // Forms
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Doff Form
  const [doffForm, setDoffForm] = useState({
    rollNumber: '',
    orderId: '',
    loomMachineId: '',
    grossMeters: 100,
    netMeters: 100,
    widthInchesActual: 58,
    gsmActual: 130,
    weightKg: 25,
    yarnBatchNumbers: 'LOT-CTN-88, LOT-POLY-04',
    warpBeamId: 'BEAM-01',
    notes: '',
  });

  // 4-Point Inspection Form
  const [inspectionForm, setInspectionForm] = useState({
    inspectedLengthMeters: 100,
    fabricWidthInches: 58,
    defects: [],
    verdictOverride: '',
    reworkType: 'MENDING_DARNING',
    reworkInstructions: '',
  });

  // Authorize Rework Form
  const [authReworkForm, setAuthReworkForm] = useState({
    reworkInstructions: '',
  });

  // Complete Rework Form
  const [completeReworkForm, setCompleteReworkForm] = useState({
    actionTaken: '',
    metersAfterRework: 100,
    notes: '',
  });

  // Fetch all QC data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      const [metricsRes, rollsRes, reworkRes, aiRes, ordersRes, machinesRes] = await Promise.all([
        api.get('/quality/dashboard'),
        api.get(`/quality/rolls?status=${statusFilter}&grade=${gradeFilter}&search=${encodeURIComponent(searchQuery)}`),
        api.get('/quality/rework'),
        api.get('/quality/defects/ai'),
        api.get('/orders'),
        api.get('/quality/machines'),
      ]);

      setMetrics(metricsRes.data || null);
      setRolls(rollsRes.data || []);
      setReworkQueue(reworkRes.data || []);
      setAiDefects(aiRes.data || []);
      setOrders(ordersRes.data || []);
      setMachines(machinesRes.data || []);
    } catch (err) {
      console.error('Failed to load quality control data:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to load QC data' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, gradeFilter, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Traceability modal
  const handleOpenTraceability = async (rollIdOrNumber) => {
    try {
      setLoadingTraceability(true);
      setShowTraceabilityModal(true);
      const res = await api.get(`/quality/rolls/${rollIdOrNumber}/traceability`);
      setTraceabilityData(res.data);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load roll traceability' });
      setShowTraceabilityModal(false);
    } finally {
      setLoadingTraceability(false);
    }
  };

  // Open Inspection modal
  const handleOpenInspection = (roll, isReinspect = false, reworkEventId = null) => {
    setSelectedRollForInspection(roll);
    setIsReinspectionFlow(isReinspect);
    setReworkEventIdForInspection(reworkEventId);
    setInspectionForm({
      inspectedLengthMeters: roll.netMeters || roll.grossMeters || 100,
      fabricWidthInches: roll.widthInchesActual || 58,
      defects: [],
      verdictOverride: '',
      reworkType: 'MENDING_DARNING',
      reworkInstructions: '',
    });
    setShowInspectionModal(true);
  };

  // Calculate ASTM D5430 4-Point formula live
  const calculateInspectionScore = () => {
    const lengthM = Number(inspectionForm.inspectedLengthMeters) || 100;
    const widthIn = Number(inspectionForm.fabricWidthInches) || 58;
    const totalPoints = inspectionForm.defects.reduce((acc, d) => acc + (Number(d.penaltyPoints) || 1), 0);

    const pointsPer100 = (totalPoints * 100 * 39.37) / (lengthM * widthIn);
    const roundedPoints = parseFloat(pointsPer100.toFixed(2));

    let autoVerdict = 'PASSED';
    let autoGrade = 'GRADE_A';

    if (roundedPoints <= 20) {
      autoVerdict = 'PASSED';
      autoGrade = 'GRADE_A';
    } else if (roundedPoints <= 28) {
      autoVerdict = 'PASSED';
      autoGrade = 'GRADE_B';
    } else {
      autoVerdict = 'REWORK_REQUIRED';
      autoGrade = 'REJECT';
    }

    return {
      totalPoints,
      pointsPer100: roundedPoints,
      autoVerdict,
      autoGrade,
    };
  };

  const inspectionScore = calculateInspectionScore();

  // Add a defect row to the inspection form
  const handleAddDefectRow = () => {
    setInspectionForm((prev) => ({
      ...prev,
      defects: [
        ...prev.defects,
        {
          id: Date.now(),
          defectCategory: 'HOLE',
          meterPosition: 10,
          warpOrWeft: 'WARP',
          zone: 'CENTER_BODY',
          severity: 'CRITICAL',
          penaltyPoints: 4,
          affectedLengthMeters: 0.1,
          notes: '',
        },
      ],
    }));
  };

  const handleUpdateDefectRow = (index, field, value) => {
    setInspectionForm((prev) => {
      const updated = [...prev.defects];
      updated[index] = { ...updated[index], [field]: value };

      // If category changed, set sensible default points and severity
      if (field === 'defectCategory') {
        const catObj = DEFECT_CATEGORIES.find((c) => c.value === value);
        if (catObj) {
          updated[index].penaltyPoints = catObj.defaultPoints;
          updated[index].severity = catObj.severity;
        }
      }

      return { ...prev, defects: updated };
    });
  };

  const handleRemoveDefectRow = (index) => {
    setInspectionForm((prev) => {
      const updated = [...prev.defects];
      updated.splice(index, 1);
      return { ...prev, defects: updated };
    });
  };

  // Submit Doff Form
  const handleDoffRoll = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setMessage({ type: '', text: '' });

      const batchArray = doffForm.yarnBatchNumbers
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await api.post('/quality/rolls', {
        rollNumber: doffForm.rollNumber || undefined,
        orderId: doffForm.orderId,
        loomMachineId: doffForm.loomMachineId,
        grossMeters: Number(doffForm.grossMeters),
        netMeters: Number(doffForm.netMeters),
        widthInchesActual: Number(doffForm.widthInchesActual),
        gsmActual: Number(doffForm.gsmActual),
        weightKg: Number(doffForm.weightKg),
        genealogy: {
          yarnBatchNumbers: batchArray,
          warpBeamId: doffForm.warpBeamId,
        },
        notes: doffForm.notes,
      });

      setMessage({ type: 'success', text: 'Fabric roll created & doffed successfully!' });
      setShowDoffModal(false);
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to doff roll' });
    } finally {
      setActionLoading(false);
    }
  };

  // Submit 4-Point Inspection
  const handleSubmitInspection = async (e) => {
    e.preventDefault();
    if (!selectedRollForInspection) return;

    try {
      setActionLoading(true);
      setMessage({ type: '', text: '' });

      const payload = {
        fabricRollId: selectedRollForInspection._id,
        inspectedLengthMeters: Number(inspectionForm.inspectedLengthMeters),
        fabricWidthInches: Number(inspectionForm.fabricWidthInches),
        defects: inspectionForm.defects.map((d) => ({
          defectCategory: d.defectCategory,
          location: {
            meterPosition: Number(d.meterPosition),
            warpOrWeft: d.warpOrWeft,
            zone: d.zone,
          },
          severity: d.severity,
          penaltyPoints: Number(d.penaltyPoints),
          affectedLengthMeters: Number(d.affectedLengthMeters || 0.1),
          notes: d.notes,
        })),
        isReinspection: isReinspectionFlow,
        reworkEventId: reworkEventIdForInspection || undefined,
        reworkInstructions: inspectionForm.reworkInstructions,
      };

      const res = await api.post('/quality/inspections', payload);

      setMessage({
        type: 'success',
        text: `Inspection recorded! Verdict: ${res.data?.inspection?.verdict} (Grade: ${res.data?.roll?.grade})`,
      });
      setShowInspectionModal(false);
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to record inspection' });
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Authorize Rework
  const handleAuthorizeRework = async (e) => {
    e.preventDefault();
    if (!selectedReworkItem) return;

    try {
      setActionLoading(true);
      await api.patch(`/quality/rework/${selectedReworkItem._id}/authorize`, {
        reworkInstructions: authReworkForm.reworkInstructions,
      });
      setMessage({ type: 'success', text: `Rework ${selectedReworkItem.reworkNumber} authorized successfully!` });
      setShowAuthorizeReworkModal(false);
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to authorize rework' });
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Complete Rework
  const handleCompleteRework = async (e) => {
    e.preventDefault();
    if (!selectedReworkItem) return;

    try {
      setActionLoading(true);
      await api.patch(`/quality/rework/${selectedReworkItem._id}/complete`, {
        actionTaken: completeReworkForm.actionTaken,
        metersAfterRework: Number(completeReworkForm.metersAfterRework),
        notes: completeReworkForm.notes,
      });
      setMessage({
        type: 'success',
        text: `Rework ${selectedReworkItem.reworkNumber} marked completed! Ready for reinspection cycle.`,
      });
      setShowCompleteReworkModal(false);
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to complete rework' });
    } finally {
      setActionLoading(false);
    }
  };

  // Verify / Dismiss AI Defect
  const handleVerifyAiDefect = async (defectId, isConfirmed) => {
    try {
      setActionLoading(true);
      const dismissReason = !isConfirmed ? 'Dismissed as false positive / sensor noise by inspector' : undefined;
      await api.patch(`/quality/defects/${defectId}/verify`, {
        isConfirmed,
        dismissReason,
      });
      setMessage({
        type: 'success',
        text: isConfirmed ? 'AI detection verified as inspector defect.' : 'AI prediction dismissed as false positive.',
      });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to verify AI defect' });
    } finally {
      setActionLoading(false);
    }
  };

  // Simulate an AI Camera Defect Detection for test/demo
  const handleSimulateAiObservation = async () => {
    try {
      setActionLoading(true);
      if (rolls.length === 0) {
        throw new Error('Please doff at least one roll first to simulate AI telemetry.');
      }
      const targetRoll = rolls[0];
      await api.post('/quality/defects', {
        source: 'AI_VISION_PREDICTION',
        fabricRollId: targetRoll._id,
        orderId: targetRoll.orderId?._id || targetRoll.orderId,
        machineId: targetRoll.loomMachineId?._id || targetRoll.loomMachineId,
        defectCategory: 'BROKEN_PICK',
        location: {
          meterPosition: Math.floor(Math.random() * 80) + 5,
          warpOrWeft: 'WEFT',
          zone: 'CENTER_BODY',
        },
        severity: 'MAJOR',
        penaltyPoints: 3,
        confidenceScore: 0.94,
        evidenceReference: {
          imageUri: 's3://fabricops-vision/cam-04/snap-9921.jpg',
          spectralWavelengthNm: 550,
          notes: 'High-speed camera detected missing pick anomaly at 850 RPM',
        },
      });
      setMessage({
        type: 'success',
        text: 'Simulated real-time AI computer vision detection stream received!',
      });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Simulation error' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white shadow">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Quality Control & Roll Traceability
              </h1>
              <p className="text-sm text-slate-500">
                ASTM D5430 4-Point System • Complete Yarn Batch Genealogy • AI Defect Telemetry & Gated Dispatch
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={() => {
              if (orders.length > 0) setDoffForm((p) => ({ ...p, orderId: orders[0]._id }));
              if (machines.length > 0) setDoffForm((p) => ({ ...p, loomMachineId: machines[0]._id }));
              setShowDoffModal(true);
            }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4" />
            <span>+ Doff Fabric Roll</span>
          </Button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {message.text && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between text-sm ${
            message.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'error' ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage({ type: '', text: '' })}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-2 rounded-t-lg shadow-sm">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>Quality Analytics & Pareto</span>
        </button>

        <button
          onClick={() => setActiveTab('rolls')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'rolls'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Rolls & Inspection Terminal</span>
          <Badge variant="secondary" className="ml-1 text-[11px]">
            {rolls.length}
          </Badge>
        </button>

        <button
          onClick={() => setActiveTab('rework')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'rework'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Scissors className="h-4 w-4" />
          <span>Rework & Reinspection Queue</span>
          {reworkQueue.filter((r) => r.status !== 'COMPLETED').length > 0 && (
            <Badge variant="warning" className="ml-1 text-[11px]">
              {reworkQueue.filter((r) => r.status !== 'COMPLETED').length} Pending
            </Badge>
          )}
        </button>

        <button
          onClick={() => setActiveTab('ai-vision')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'ai-vision'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sparkles className="h-4 w-4 text-purple-600" />
          <span>AI Vision & Sensor Stream</span>
          {aiDefects.filter((d) => !d.isVerifiedByInspector).length > 0 && (
            <Badge variant="destructive" className="ml-1 text-[11px]">
              {aiDefects.filter((d) => !d.isVerifiedByInspector).length} Unverified
            </Badge>
          )}
        </button>
      </div>

      {/* TAB 1: OVERVIEW & PARETO ANALYTICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      First-Pass Yield (FPY)
                    </p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">
                      {metrics?.overview?.firstPassYield ?? 100}%
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Rolls passing Cycle 1 without mending</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Commercial Pass Rate
                    </p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">
                      {metrics?.overview?.passPercentage ?? 0}%
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Grade A ({metrics?.overview?.gradeARolls || 0}) • Grade B ({metrics?.overview?.gradeBRolls || 0})
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Active Rework / Mending
                    </p>
                    <p className="text-3xl font-bold text-amber-600 mt-1">
                      {metrics?.overview?.reworkRolls ?? 0}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {metrics?.reworkSummary?.inProgress ?? 0} on shopfloor • {metrics?.overview?.reworkSuccessRate ?? 100}% recovery
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                    <Scissors className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Scrap / Rejection Rate
                    </p>
                    <p className="text-3xl font-bold text-rose-600 mt-1">
                      {metrics?.overview?.rejectedRolls ?? 0}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Strictly dispatch-locked rolls
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
                    <XCircle className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Two-Column Analytics: Pareto & Machine Rankings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Defect Pareto Analysis */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                  <span>Defect Pareto Breakdown (ASTM D5430)</span>
                  <Badge variant="outline" className="text-xs font-normal">
                    Verified Defects Only
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Pareto distribution of weave, yarn, and finishing defects across all active orders.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics?.defectCategoryCounts && Object.keys(metrics.defectCategoryCounts).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(metrics.defectCategoryCounts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([cat, count]) => {
                        const totalDefects = Object.values(metrics.defectCategoryCounts).reduce(
                          (a, b) => a + b,
                          0
                        );
                        const pct = Math.round((count / (totalDefects || 1)) * 100);
                        const catLabel =
                          DEFECT_CATEGORIES.find((c) => c.value === cat)?.label || cat;

                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="text-slate-800">{catLabel}</span>
                              <span className="text-slate-500">
                                {count} incidents ({pct}%)
                              </span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    No verified defects recorded in current time window. High quality performance!
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Machine Defect Rankings */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                  <span>Machine Defect Rankings (Loom Fleet)</span>
                  <Badge variant="outline" className="text-xs font-normal">
                    Penalty Density Ranking
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Identifies loom frames and spinning frames generating highest defect penalty density.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics?.machineTrends && metrics.machineTrends.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {metrics.machineTrends.map((mach) => (
                      <div key={mach._id} className="py-2.5 flex items-center justify-between text-sm">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{mach.machineCode}</span>
                            <span className="text-xs text-slate-500">({mach.name})</span>
                          </div>
                          <span className="text-xs text-slate-400">
                            {mach.totalRolls} rolls doffed • Type: {mach.type}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900">
                            {mach.totalPenaltyPoints} pts
                          </span>
                          <p className="text-xs text-slate-500">
                            Avg: {mach.avgPointsPerRoll} pts/roll
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    No machine defect trends available.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: ROLLS & INSPECTION TERMINAL */}
      {activeTab === 'rolls' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search Roll #, Yarn Batch, Loom Code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm outline-none border-none bg-transparent placeholder-slate-400"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 outline-none"
              >
                <option value="ALL">All Inspection Statuses</option>
                <option value="GREY_OFF_LOOM">Grey Off Loom (Pending)</option>
                <option value="IN_INSPECTION">In Inspection</option>
                <option value="GRADE_A">Grade A (Passed)</option>
                <option value="GRADE_B">Grade B (Passed)</option>
                <option value="REWORK_REQUIRED">Rework Required</option>
                <option value="REJECTED_SCRAP">Rejected Scrap</option>
                <option value="PACKED_FOR_DISPATCH">Packed for Dispatch</option>
              </select>

              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="text-xs rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 outline-none"
              >
                <option value="ALL">All Grades</option>
                <option value="GRADE_A">Grade A</option>
                <option value="GRADE_B">Grade B</option>
                <option value="REJECT">Reject</option>
                <option value="UNGRADED">Ungraded</option>
              </select>
            </div>
          </div>

          {/* Rolls Table */}
          <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 shadow-sm">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Roll Identifier & Doff</th>
                  <th className="px-4 py-3">Sales Order</th>
                  <th className="px-4 py-3">Loom Machine</th>
                  <th className="px-4 py-3">Length & Weight</th>
                  <th className="px-4 py-3">Grade & Cycle</th>
                  <th className="px-4 py-3">ASTM Score</th>
                  <th className="px-4 py-3">Dispatch Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rolls.length > 0 ? (
                  rolls.map((roll) => {
                    const isDispatchEligible = ['GRADE_A', 'GRADE_B', 'PACKED_FOR_DISPATCH'].includes(
                      roll.status
                    );

                    return (
                      <tr key={roll._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-blue-600">
                              {roll.rollNumber}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Doffed: {new Date(roll.doffTimestamp || roll.createdAt).toLocaleDateString()}
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-800">
                            {roll.orderId?.orderNumber || 'STOCK_RUN'}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs font-normal">
                            {roll.loomMachineId?.machineCode || roll.genealogy?.loomCode || 'Loom'}
                          </Badge>
                        </td>

                        <td className="px-4 py-3 text-xs">
                          <div>
                            <span className="font-semibold text-slate-800">{roll.netMeters}m</span>
                            <span className="text-slate-400"> (Gross: {roll.grossMeters}m)</span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {roll.widthInchesActual}" width • {roll.weightKg} kg
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {roll.grade === 'GRADE_A' && (
                              <Badge variant="success">Grade A</Badge>
                            )}
                            {roll.grade === 'GRADE_B' && (
                              <Badge variant="warning">Grade B</Badge>
                            )}
                            {roll.grade === 'REJECT' && (
                              <Badge variant="destructive">Reject</Badge>
                            )}
                            {roll.grade === 'UNGRADED' && (
                              <Badge variant="secondary">Ungraded</Badge>
                            )}

                            {roll.inspectionCount > 1 && (
                              <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                                Cycle {roll.inspectionCount}
                              </Badge>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-xs">
                          {roll.latestInspectionId ? (
                            <div>
                              <span className="font-semibold text-slate-900">
                                {roll.latestInspectionId.pointsPer100SqMeters} pts/100m²
                              </span>
                              <p className="text-[11px] text-slate-500">
                                Total: {roll.latestInspectionId.totalPenaltyPoints} pts
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Not inspected</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {isDispatchEligible ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" /> Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              <XCircle className="h-3 w-3" /> Blocked
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenInspection(roll, roll.inspectionCount > 0, null)}
                              className="text-xs h-7 px-2.5 flex items-center gap-1 bg-white hover:bg-slate-50"
                            >
                              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                              <span>{roll.inspectionCount > 0 ? 'Reinspect' : 'Inspect'}</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenTraceability(roll.rollNumber)}
                              className="text-xs h-7 px-2.5 flex items-center gap-1 text-slate-700 hover:text-slate-900"
                            >
                              <History className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Trace</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="px-4 py-12 text-center text-slate-400 text-sm">
                      No fabric rolls matching current filter. Click "+ Doff Fabric Roll" to record roll production.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REWORK & REINSPECTION QUEUE */}
      {activeTab === 'rework' && (
        <div className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span>Shopfloor Mending & Rework Pipeline</span>
                <Badge variant="outline" className="text-xs font-normal">
                  Zero Data Loss: Historical Inspections Preserved
                </Badge>
              </CardTitle>
              <CardDescription>
                Authorized mending events, darning, spot cleaning, and scheduled reinspection cycles without overwriting earlier defect histories.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reworkQueue.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Rework ID</th>
                        <th className="px-4 py-3">Fabric Roll</th>
                        <th className="px-4 py-3">Rework Type</th>
                        <th className="px-4 py-3">Instructions & Reason</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Resulting Verdict</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reworkQueue.map((item) => (
                        <tr key={item._id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3 font-mono font-bold text-xs text-slate-900">
                            {item.reworkNumber}
                          </td>

                          <td className="px-4 py-3">
                            <span className="font-semibold text-blue-600">
                              {item.fabricRollId?.rollNumber}
                            </span>
                            <p className="text-[11px] text-slate-400">
                              Initial Points: {item.inspectionId?.totalPenaltyPoints || 0} pts
                            </p>
                          </td>

                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-xs">
                              {REWORK_TYPES.find((t) => t.value === item.reworkType)?.label || item.reworkType}
                            </Badge>
                          </td>

                          <td className="px-4 py-3 text-xs max-w-xs">
                            <p className="font-medium text-slate-800">{item.reworkInstructions}</p>
                            {item.actionTaken && (
                              <p className="text-[11px] text-emerald-600 mt-0.5">
                                Action: {item.actionTaken}
                              </p>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {item.status === 'REQUESTED' && (
                              <Badge variant="warning">Awaiting Authorization</Badge>
                            )}
                            {item.status === 'IN_PROGRESS' && (
                              <Badge variant="default">Mending in Progress</Badge>
                            )}
                            {item.status === 'COMPLETED' && (
                              <Badge variant="success">Rework Completed</Badge>
                            )}
                          </td>

                          <td className="px-4 py-3 text-xs">
                            {item.resultingVerdict === 'PASSED' ? (
                              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Passed Reinspection
                              </span>
                            ) : item.status === 'COMPLETED' ? (
                              <span className="text-purple-600 font-semibold flex items-center gap-1">
                                <Activity className="h-3.5 w-3.5" /> Ready for Reinspection
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Pending Mending</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {item.status === 'REQUESTED' && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedReworkItem(item);
                                    setAuthReworkForm({
                                      reworkInstructions: item.reworkInstructions,
                                    });
                                    setShowAuthorizeReworkModal(true);
                                  }}
                                  className="text-xs h-7 px-2.5 bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  Authorize
                                </Button>
                              )}

                              {item.status === 'IN_PROGRESS' && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedReworkItem(item);
                                    setCompleteReworkForm({
                                      actionTaken: 'Mended slubs and steam pressed',
                                      metersAfterRework: item.fabricRollId?.netMeters || 100,
                                      notes: '',
                                    });
                                    setShowCompleteReworkModal(true);
                                  }}
                                  className="text-xs h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  Complete Mending
                                </Button>
                              )}

                              {item.status === 'COMPLETED' && item.resultingVerdict === 'PENDING_REINSPECTION' && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleOpenInspection(item.fabricRollId, true, item._id)
                                  }
                                  className="text-xs h-7 px-2.5 bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                  Reinspect (Cycle 2)
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No active rework events. Quality is on target.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: AI & SENSOR DEFECT STREAM */}
      {activeTab === 'ai-vision' && (
        <div className="space-y-4">
          {/* Safety Integrity Notice */}
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 flex items-start gap-3">
            <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">FabricOps Safety Integrity & AI Provenance Protocol</p>
              <p className="text-blue-700 text-xs mt-0.5 leading-relaxed">
                Computer-vision and loom optoelectronic sensor observations are logged as advisory detections with confidence scores.
                To maintain ISO/ASTM compliance, <strong>an unverified AI prediction is NEVER treated as a confirmed defect</strong> nor does it alter roll commercial grading until validated by a certified inspector.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSimulateAiObservation}
              disabled={actionLoading}
              className="ml-auto shrink-0 bg-white text-blue-700 border-blue-300 hover:bg-blue-50 text-xs"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1 text-purple-600" />
              Simulate Camera Event
            </Button>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Live Defect Observation Telemetry Stream
              </CardTitle>
              <CardDescription>
                High-speed optical camera and loom sensor telemetry streams waiting for inspector review.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {aiDefects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {aiDefects.map((defect) => {
                    const confidencePct = Math.round((defect.confidenceScore || 0.9) * 100);
                    return (
                      <div
                        key={defect._id}
                        className="p-4 rounded-lg border border-slate-200 bg-white shadow-sm space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-purple-700">
                            {defect.defectCode}
                          </span>
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              confidencePct >= 90
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {confidencePct}% Confidence
                          </span>
                        </div>

                        <div>
                          <p className="font-semibold text-slate-900 text-sm">
                            {DEFECT_CATEGORIES.find((c) => c.value === defect.defectCategory)?.label || defect.defectCategory}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Roll: <span className="font-mono font-medium text-slate-700">{defect.fabricRollId?.rollNumber}</span> • Machine: <span className="font-medium text-slate-700">{defect.machineId?.machineCode}</span>
                          </p>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded text-xs text-slate-600 space-y-1">
                          <div className="flex justify-between">
                            <span>Position:</span>
                            <span className="font-semibold text-slate-800">{defect.location?.meterPosition}m</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Zone / Warp-Weft:</span>
                            <span className="font-medium text-slate-700">{defect.location?.warpOrWeft} • {defect.location?.zone}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Penalty Weight:</span>
                            <span className="font-bold text-rose-600">{defect.penaltyPoints} Points</span>
                          </div>
                        </div>

                        {defect.evidenceReference?.imageUri && (
                          <p className="text-[11px] text-slate-400 truncate">
                            Evidence: {defect.evidenceReference.imageUri}
                          </p>
                        )}

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          {defect.isVerifiedByInspector ? (
                            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Verified by Inspector
                            </span>
                          ) : (
                            <div className="flex items-center gap-2 w-full">
                              <Button
                                size="sm"
                                onClick={() => handleVerifyAiDefect(defect._id, true)}
                                disabled={actionLoading}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7"
                              >
                                Verify Defect
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleVerifyAiDefect(defect._id, false)}
                                disabled={actionLoading}
                                className="flex-1 text-slate-600 hover:text-rose-600 text-xs h-7"
                              >
                                Dismiss
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No pending AI vision observations. Click "Simulate Camera Event" above to evaluate real-time telemetry.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: INTERACTIVE 4-POINT INSPECTION TERMINAL           */}
      {/* ========================================================= */}
      {showInspectionModal && selectedRollForInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-lg">
                    {isReinspectionFlow ? 'Reinspection Terminal (Cycle 2)' : '4-Point Quality Inspection Terminal'}
                  </span>
                  <Badge variant="outline" className="font-mono bg-blue-50 text-blue-700 border-blue-200">
                    {selectedRollForInspection.rollNumber}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  ASTM D5430 Standard Method • Roll Length: {inspectionForm.inspectedLengthMeters}m • Width: {inspectionForm.fabricWidthInches}"
                </p>
              </div>
              <button
                onClick={() => setShowInspectionModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitInspection} className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Inspection Roll Dimensions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Inspected Length (Meters)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={inspectionForm.inspectedLengthMeters}
                    onChange={(e) =>
                      setInspectionForm((p) => ({ ...p, inspectedLengthMeters: e.target.value }))
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Fabric Width (Inches)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={inspectionForm.fabricWidthInches}
                    onChange={(e) =>
                      setInspectionForm((p) => ({ ...p, fabricWidthInches: e.target.value }))
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white"
                  />
                </div>
              </div>

              {/* Live 4-Point Scoreboard */}
              <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-lg">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">
                    ASTM D5430 Formula Score
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-3xl font-extrabold text-blue-400">
                      {inspectionScore.pointsPer100}
                    </span>
                    <span className="text-xs text-slate-300">points / 100 sq. meters</span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Total Penalty Points</p>
                    <p className="text-xl font-bold">{inspectionScore.totalPoints} pts</p>
                  </div>

                  <div className="border-l border-slate-700 pl-6">
                    <p className="text-xs text-slate-400 mb-1">Calculated Verdict</p>
                    {inspectionScore.autoGrade === 'GRADE_A' && (
                      <Badge variant="success" className="text-xs px-3 py-1 font-bold">
                        GRADE A (PASSED)
                      </Badge>
                    )}
                    {inspectionScore.autoGrade === 'GRADE_B' && (
                      <Badge variant="warning" className="text-xs px-3 py-1 font-bold">
                        GRADE B (COMMERCIAL)
                      </Badge>
                    )}
                    {inspectionScore.autoGrade === 'REJECT' && (
                      <Badge variant="destructive" className="text-xs px-3 py-1 font-bold">
                        REWORK REQUIRED / REJECT
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Defect Logger Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Defect Observations Log ({inspectionForm.defects.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      1 pt: &lt;3" • 2 pts: 3"-6" • 3 pts: 6"-9" • 4 pts: &gt;9" or hole
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddDefectRow}
                    className="text-xs flex items-center gap-1 bg-white hover:bg-slate-50 text-blue-600 border-blue-200"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Defect Observation</span>
                  </Button>
                </div>

                {inspectionForm.defects.length > 0 ? (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {inspectionForm.defects.map((defect, idx) => (
                      <div
                        key={defect.id || idx}
                        className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center text-xs"
                      >
                        <div className="sm:col-span-3">
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase">
                            Defect Category
                          </label>
                          <select
                            value={defect.defectCategory}
                            onChange={(e) =>
                              handleUpdateDefectRow(idx, 'defectCategory', e.target.value)
                            }
                            className="mt-0.5 w-full rounded border border-slate-300 p-1 bg-white text-xs"
                          >
                            {DEFECT_CATEGORIES.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase">
                            Meter Position
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={defect.meterPosition}
                            onChange={(e) =>
                              handleUpdateDefectRow(idx, 'meterPosition', e.target.value)
                            }
                            className="mt-0.5 w-full rounded border border-slate-300 p-1 bg-white text-xs"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase">
                            Zone / Direction
                          </label>
                          <select
                            value={defect.zone}
                            onChange={(e) => handleUpdateDefectRow(idx, 'zone', e.target.value)}
                            className="mt-0.5 w-full rounded border border-slate-300 p-1 bg-white text-xs"
                          >
                            <option value="CENTER_BODY">Center Body</option>
                            <option value="LEFT_SELVEDGE">Left Selvedge</option>
                            <option value="RIGHT_SELVEDGE">Right Selvedge</option>
                            <option value="FULL_WIDTH">Full Width</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase">
                            Penalty (1-4 pts)
                          </label>
                          <select
                            value={defect.penaltyPoints}
                            onChange={(e) =>
                              handleUpdateDefectRow(idx, 'penaltyPoints', e.target.value)
                            }
                            className="mt-0.5 w-full rounded border border-slate-300 p-1 bg-white font-bold text-rose-600 text-xs"
                          >
                            <option value="1">1 Point</option>
                            <option value="2">2 Points</option>
                            <option value="3">3 Points</option>
                            <option value="4">4 Points (Critical)</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase">
                            Notes / Evidence
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Broken warp end"
                            value={defect.notes || ''}
                            onChange={(e) => handleUpdateDefectRow(idx, 'notes', e.target.value)}
                            className="mt-0.5 w-full rounded border border-slate-300 p-1 bg-white text-xs"
                          />
                        </div>

                        <div className="sm:col-span-1 text-right pt-3">
                          <button
                            type="button"
                            onClick={() => handleRemoveDefectRow(idx)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 p-6 rounded-lg border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                    No defects added yet. If roll is defect-free (Grade A), click Submit below.
                  </div>
                )}
              </div>

              {/* Conditional Rework Instructions if score > 28 */}
              {inspectionScore.autoVerdict === 'REWORK_REQUIRED' && (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-3">
                  <div className="flex items-center gap-2 text-amber-800 text-sm font-semibold">
                    <Scissors className="h-4 w-4 text-amber-600" />
                    <span>Roll Exceeds 28 pts/100m² - Rework / Mending Triggered</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Prescribed Rework Treatment
                      </label>
                      <select
                        value={inspectionForm.reworkType}
                        onChange={(e) =>
                          setInspectionForm((p) => ({ ...p, reworkType: e.target.value }))
                        }
                        className="mt-1 w-full rounded border border-slate-300 p-1.5 bg-white text-xs"
                      >
                        {REWORK_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Mending & Darning Instructions (Required)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Darn weft mispicks from 15m to 18m with matching yarn"
                        value={inspectionForm.reworkInstructions}
                        onChange={(e) =>
                          setInspectionForm((p) => ({ ...p, reworkInstructions: e.target.value }))
                        }
                        className="mt-1 w-full rounded border border-slate-300 p-1.5 bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowInspectionModal(false)}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {actionLoading ? 'Recording...' : 'Lock Inspection & Grade Roll'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: DEEP ROLL TRACEABILITY EXPLORER                  */}
      {/* ========================================================= */}
      {showTraceabilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <Barcode className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-lg">
                      Deep Fabric Roll Traceability Explorer
                    </span>
                    <Badge variant="outline" className="font-mono bg-blue-50 text-blue-700">
                      {traceabilityData?.roll?.rollNumber}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    Full genealogical provenance from yarn lot supplier to loom machine and multi-cycle quality inspection history.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowTraceabilityModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-sm">
              {loadingTraceability || !traceabilityData ? (
                <div className="py-24 text-center text-slate-500">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                  <span>Loading complete genealogical provenance tree...</span>
                </div>
              ) : (
                <>
                  {/* Dispatch Safety Gate Banner */}
                  <div
                    className={`p-4 rounded-xl flex items-center justify-between ${
                      traceabilityData.summary?.isEligibleForDispatch
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                        : 'bg-rose-50 text-rose-900 border border-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {traceabilityData.summary?.isEligibleForDispatch ? (
                        <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="h-6 w-6 text-rose-600 shrink-0" />
                      )}
                      <div>
                        <p className="font-bold text-sm">
                          {traceabilityData.summary?.isEligibleForDispatch
                            ? 'DISPATCH APPROVED - Commercial Quality Gate Passed'
                            : 'DISPATCH BLOCKED - Strict Gating Prevention Enforced'}
                        </p>
                        <p className="text-xs opacity-90 mt-0.5">
                          {traceabilityData.summary?.isEligibleForDispatch
                            ? `Roll certified as ${traceabilityData.roll.grade}. Authorized for delivery note generation and shipping.`
                            : `Roll status is ${traceabilityData.roll.status} (Grade: ${traceabilityData.roll.grade}). Unapproved rolls are blocked from dispatch transactions.`}
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant={traceabilityData.summary?.isEligibleForDispatch ? 'success' : 'destructive'}
                      className="text-xs px-3 py-1 font-bold uppercase"
                    >
                      {traceabilityData.roll.status}
                    </Badge>
                  </div>

                  {/* Visual Genealogy Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Originating Order */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                      <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs uppercase tracking-wider">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span>Originating Sales Order</span>
                      </div>
                      <p className="text-base font-bold text-slate-900">
                        {traceabilityData.order?.orderNumber || 'STOCK ORDER'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Fabric: {traceabilityData.order?.fabricType || 'Cotton Poplin'} • Color: {traceabilityData.order?.color || 'White'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Target Date: {traceabilityData.order?.confirmedDeliveryDate ? new Date(traceabilityData.order.confirmedDeliveryDate).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>

                    {/* Loom Machine & Stage */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                      <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs uppercase tracking-wider">
                        <Cpu className="h-4 w-4 text-purple-600" />
                        <span>Loom Fleet & Production Run</span>
                      </div>
                      <p className="text-base font-bold text-slate-900">
                        {traceabilityData.machine?.machineCode || traceabilityData.roll.genealogy?.loomCode}
                      </p>
                      <p className="text-xs text-slate-500">
                        Type: {traceabilityData.machine?.type || 'Air Jet Loom'} • Dept: {traceabilityData.machine?.department || 'WEAVING'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Warp Beam: {traceabilityData.roll.genealogy?.warpBeamId || 'BEAM-01'}
                      </p>
                    </div>

                    {/* Dimensions & Weight */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                      <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs uppercase tracking-wider">
                        <Package className="h-4 w-4 text-emerald-600" />
                        <span>Roll Metric Dimensions</span>
                      </div>
                      <p className="text-base font-bold text-slate-900">
                        {traceabilityData.roll.netMeters} m Net
                      </p>
                      <p className="text-xs text-slate-500">
                        Gross: {traceabilityData.roll.grossMeters} m • Width: {traceabilityData.roll.widthInchesActual}"
                      </p>
                      <p className="text-xs text-slate-500">
                        Weight: {traceabilityData.roll.weightKg} kg • GSM: {traceabilityData.roll.gsmActual}
                      </p>
                    </div>
                  </div>

                  {/* Upstream Traceability: Yarn Batches & Suppliers */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <Truck className="h-4 w-4 text-blue-600" />
                      <span>Upstream Yarn Batch Provenance & Suppliers</span>
                    </h4>

                    {traceabilityData.yarnBatches && traceabilityData.yarnBatches.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {traceabilityData.yarnBatches.map((batch) => (
                          <div
                            key={batch._id}
                            className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-start justify-between text-xs"
                          >
                            <div>
                              <span className="font-mono font-bold text-blue-700">
                                {batch.batchNumber}
                              </span>
                              <p className="font-medium text-slate-800 mt-1">
                                Supplier: {batch.supplierId?.name || 'Premier Spinning Mills'}
                              </p>
                              <p className="text-slate-500 text-[11px]">
                                Code: {batch.supplierId?.supplierCode || 'SUP-01'} • Rating: {batch.supplierId?.rating || 4.8}★
                              </p>
                            </div>
                            <Badge variant="outline" className="text-[11px]">
                              {batch.inventoryItemId?.yarnType || 'Combed Cotton'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
                        Recorded Yarn Batches:{' '}
                        <span className="font-mono font-semibold text-slate-700">
                          {traceabilityData.roll.genealogy?.yarnBatchNumbers?.join(', ') || 'LOT-CTN-DEFAULT'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Multi-Cycle Inspection History (Preserving Cycle 1 & Cycle 2) */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>Chronological Quality Inspection Cycles ({traceabilityData.inspections.length})</span>
                    </h4>

                    {traceabilityData.inspections.length > 0 ? (
                      <div className="space-y-2">
                        {traceabilityData.inspections.map((insp) => (
                          <div
                            key={insp._id}
                            className="p-3 rounded-lg border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{insp.inspectionNumber}</span>
                                <Badge
                                  variant="outline"
                                  className={
                                    insp.inspectionCycle > 1
                                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                                      : 'bg-blue-50 text-blue-700 border-blue-200'
                                  }
                                >
                                  Cycle {insp.inspectionCycle} {insp.isReinspection ? '(Reinspection)' : '(Initial)'}
                                </Badge>
                                <Badge
                                  variant={insp.verdict === 'PASSED' ? 'success' : 'destructive'}
                                >
                                  {insp.verdict}
                                </Badge>
                              </div>
                              <p className="text-slate-500 text-[11px] mt-1">
                                Inspected by: {insp.inspectorId?.name || 'Certified QC Inspector'} • {new Date(insp.inspectionDate).toLocaleString()}
                              </p>
                            </div>

                            <div className="sm:text-right">
                              <span className="font-extrabold text-sm text-slate-900">
                                {insp.pointsPer100SqMeters} pts/100m²
                              </span>
                              <p className="text-[11px] text-slate-500">
                                Total Penalty: {insp.totalPenaltyPoints} pts • Grade: {insp.grade}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic text-xs">No inspections logged yet for this roll.</p>
                    )}
                  </div>

                  {/* Defect Map / Items */}
                  {traceabilityData.defectObservations.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span>Defect Observations Across Roll Meters ({traceabilityData.defectObservations.length})</span>
                      </h4>

                      <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 font-semibold text-slate-700 border-b border-slate-200">
                            <tr>
                              <th className="p-2.5">Meter Position</th>
                              <th className="p-2.5">Category</th>
                              <th className="p-2.5">Zone & Direction</th>
                              <th className="p-2.5">Penalty</th>
                              <th className="p-2.5">Source Provenance</th>
                              <th className="p-2.5">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {traceabilityData.defectObservations.map((d) => (
                              <tr key={d._id}>
                                <td className="p-2.5 font-bold text-slate-800">
                                  {d.location?.meterPosition} m
                                </td>
                                <td className="p-2.5 font-medium text-slate-900">
                                  {DEFECT_CATEGORIES.find((c) => c.value === d.defectCategory)?.label || d.defectCategory}
                                </td>
                                <td className="p-2.5 text-slate-600">
                                  {d.location?.warpOrWeft} • {d.location?.zone}
                                </td>
                                <td className="p-2.5 font-bold text-rose-600">
                                  {d.penaltyPoints} pts ({d.severity})
                                </td>
                                <td className="p-2.5">
                                  <Badge variant="outline" className="text-[10px]">
                                    {d.source}
                                  </Badge>
                                </td>
                                <td className="p-2.5">
                                  <Badge
                                    variant={d.status === 'ACTIVE' ? 'destructive' : 'secondary'}
                                    className="text-[10px]"
                                  >
                                    {d.status}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Rework Events History */}
                  {traceabilityData.reworkEvents.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <Scissors className="h-4 w-4 text-purple-600" />
                        <span>Shopfloor Rework & Mending Record</span>
                      </h4>

                      <div className="space-y-2">
                        {traceabilityData.reworkEvents.map((rw) => (
                          <div
                            key={rw._id}
                            className="p-3 rounded-lg border border-slate-200 bg-purple-50/40 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-purple-800">{rw.reworkNumber}</span>
                              <Badge variant="outline" className="bg-white">
                                {rw.status}
                              </Badge>
                            </div>
                            <p className="font-medium text-slate-800">
                              Treatment: {rw.reworkType} • Instructions: {rw.reworkInstructions}
                            </p>
                            {rw.actionTaken && (
                              <p className="text-emerald-700">Action: {rw.actionTaken}</p>
                            )}
                            <p className="text-slate-400 text-[11px]">
                              Authorized by: {rw.authorizedBy?.name || 'Quality Lead'} • Net Meters: {rw.metersAfterRework || traceabilityData.roll.netMeters}m
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <Button onClick={() => setShowTraceabilityModal(false)}>Close Explorer</Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: DOFF NEW FABRIC ROLL                             */}
      {/* ========================================================= */}
      {showDoffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Doff New Fabric Roll</h3>
                <p className="text-xs text-slate-500">Record off-loom doffing with complete genealogy</p>
              </div>
              <button onClick={() => setShowDoffModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDoffRoll} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase">
                  Roll Identifier (Optional - auto-generated if blank)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ROL-202610-001"
                  value={doffForm.rollNumber}
                  onChange={(e) => setDoffForm((p) => ({ ...p, rollNumber: e.target.value }))}
                  className="mt-1 w-full rounded border border-slate-300 p-2 bg-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase">
                    Sales Order Reference *
                  </label>
                  <select
                    required
                    value={doffForm.orderId}
                    onChange={(e) => setDoffForm((p) => ({ ...p, orderId: e.target.value }))}
                    className="mt-1 w-full rounded border border-slate-300 p-2 bg-white text-xs"
                  >
                    <option value="">Select Order...</option>
                    {orders.map((o) => (
                      <option key={o._id} value={o._id}>
                        {o.orderNumber} ({o.fabricType || 'Cotton'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase">
                    Loom Machine *
                  </label>
                  <select
                    required
                    value={doffForm.loomMachineId}
                    onChange={(e) => setDoffForm((p) => ({ ...p, loomMachineId: e.target.value }))}
                    className="mt-1 w-full rounded border border-slate-300 p-2 bg-white text-xs"
                  >
                    <option value="">Select Loom...</option>
                    {machines.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.machineCode} - {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase">
                    Gross Length (Meters) *
                  </label>
                  <input
                    type="number"
                    required
                    value={doffForm.grossMeters}
                    onChange={(e) =>
                      setDoffForm((p) => ({
                        ...p,
                        grossMeters: e.target.value,
                        netMeters: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded border border-slate-300 p-2 bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase">
                    Net Meters
                  </label>
                  <input
                    type="number"
                    value={doffForm.netMeters}
                    onChange={(e) => setDoffForm((p) => ({ ...p, netMeters: e.target.value }))}
                    className="mt-1 w-full rounded border border-slate-300 p-2 bg-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase">Width (in)</label>
                  <input
                    type="number"
                    value={doffForm.widthInchesActual}
                    onChange={(e) =>
                      setDoffForm((p) => ({ ...p, widthInchesActual: e.target.value }))
                    }
                    className="mt-1 w-full rounded border border-slate-300 p-2 bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase">GSM</label>
                  <input
                    type="number"
                    value={doffForm.gsmActual}
                    onChange={(e) => setDoffForm((p) => ({ ...p, gsmActual: e.target.value }))}
                    className="mt-1 w-full rounded border border-slate-300 p-2 bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase">Weight (kg)</label>
                  <input
                    type="number"
                    value={doffForm.weightKg}
                    onChange={(e) => setDoffForm((p) => ({ ...p, weightKg: e.target.value }))}
                    className="mt-1 w-full rounded border border-slate-300 p-2 bg-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase">
                  Yarn Batch References (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="LOT-CTN-88, LOT-POLY-04"
                  value={doffForm.yarnBatchNumbers}
                  onChange={(e) =>
                    setDoffForm((p) => ({ ...p, yarnBatchNumbers: e.target.value }))
                  }
                  className="mt-1 w-full rounded border border-slate-300 p-2 bg-white text-xs font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowDoffModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {actionLoading ? 'Doffing...' : 'Confirm Doff'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: AUTHORIZE REWORK                                 */}
      {/* ========================================================= */}
      {showAuthorizeReworkModal && selectedReworkItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">
              Authorize Rework {selectedReworkItem.reworkNumber}
            </h3>
            <p className="text-xs text-slate-500">
              Roll: {selectedReworkItem.fabricRollId?.rollNumber} • Treatment: {selectedReworkItem.reworkType}
            </p>

            <form onSubmit={handleAuthorizeRework} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase">
                  Mending & Treatment Instructions
                </label>
                <textarea
                  rows="3"
                  required
                  value={authReworkForm.reworkInstructions}
                  onChange={(e) =>
                    setAuthReworkForm((p) => ({ ...p, reworkInstructions: e.target.value }))
                  }
                  className="mt-1 w-full rounded border border-slate-300 p-2 bg-white text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAuthorizeReworkModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {actionLoading ? 'Authorizing...' : 'Authorize Shopfloor Mending'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: COMPLETE REWORK                                  */}
      {/* ========================================================= */}
      {showCompleteReworkModal && selectedReworkItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">
              Complete Mending & Release to Reinspection
            </h3>
            <p className="text-xs text-slate-500">
              Rework: {selectedReworkItem.reworkNumber} • Roll: {selectedReworkItem.fabricRollId?.rollNumber}
            </p>

            <form onSubmit={handleCompleteRework} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase">
                  Action Taken by Mender
                </label>
                <input
                  type="text"
                  required
                  value={completeReworkForm.actionTaken}
                  onChange={(e) =>
                    setCompleteReworkForm((p) => ({ ...p, actionTaken: e.target.value }))
                  }
                  className="mt-1 w-full rounded border border-slate-300 p-2 bg-white text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase">
                  Meters Remaining After Mending (Net Meters)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={completeReworkForm.metersAfterRework}
                  onChange={(e) =>
                    setCompleteReworkForm((p) => ({ ...p, metersAfterRework: e.target.value }))
                  }
                  className="mt-1 w-full rounded border border-slate-300 p-2 bg-white text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCompleteReworkModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {actionLoading ? 'Completing...' : 'Mark Complete'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminQualityControlPage;

