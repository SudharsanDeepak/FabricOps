import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Cpu,
  FileText,
  Flame,
  Hash,
  HelpCircle,
  Layers,
  Loader2,
  LogIn,
  LogOut,
  Minus,
  Package,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Truck,
  UserCheck,
  Wifi,
  WifiOff,
  Wrench,
  X
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';


// ==========================================
// 1. OPERATOR TASK BOARD VIEW
// ==========================================
export function OperatorTaskBoardView({
  onStartJob,
  onPauseJob,
  onResumeJob,
  onCompleteJob,
  onLogMeters,
  onReportIssue,
  socketConnected,
}) {
  const [loading, setLoading] = useState(true);
  const [boardData, setBoardData] = useState(null);
  const [error, setError] = useState(null);

  const fetchBoard = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      setError(null);
      const res = await api.get('/operator/task-board');
      if (res.success && res.data) {
        setBoardData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load operator task board');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  // Subscribe to operator floor room for real-time live board sync
  useEffect(() => {
    const socket = getSocket();

    const handleFloorUpdate = () => {
      fetchBoard(true);
    };

    socket.emit('join_room', { room: 'operator_floor' });
    socket.on('production:job_updated', handleFloorUpdate);
    socket.on('production:log_recorded', handleFloorUpdate);
    socket.on('machine:status_changed', handleFloorUpdate);
    socket.on('timeline_updated', handleFloorUpdate);

    return () => {
      socket.emit('leave_room', { room: 'operator_floor' });
      socket.off('production:job_updated', handleFloorUpdate);
      socket.off('production:log_recorded', handleFloorUpdate);
      socket.off('machine:status_changed', handleFloorUpdate);
      socket.off('timeline_updated', handleFloorUpdate);
    };
  }, [fetchBoard]);

  if (loading && !boardData) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400 text-xs gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span>Loading factory assignments, loom tasks, and active work orders...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-xs text-rose-800">
        <AlertTriangle className="h-8 w-8 text-rose-600 mx-auto mb-2" />
        <p className="font-bold">{error}</p>
        <Button onClick={() => fetchBoard()} size="sm" className="mt-3 bg-rose-600 hover:bg-rose-700 text-white">
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry Loading Board
        </Button>
      </div>
    );
  }

  const { operator, assignedMachines = [], activeWork = [], upcomingTasks = [], timelineTasks = [], floorSummary = {} } = boardData || {};

  return (
    <div className="space-y-6">
      {/* 1. Task Board Status Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-800 bg-[#0D1220] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Active Work</span>
            <Play className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div className="text-2xl font-black font-mono text-white">
            {floorSummary.activeCount ?? activeWork.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Assigned running / paused jobs</p>
        </Card>

        <Card className="p-4 border-slate-800 bg-[#0D1220] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Assigned Looms</span>
            <Cpu className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-700">
            {floorSummary.totalAssigned ?? assignedMachines.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Online machine terminals</p>
        </Card>

        <Card className="p-4 border-slate-800 bg-[#0D1220] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Upcoming Queue</span>
            <Clock className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-700">
            {floorSummary.pendingCount ?? upcomingTasks.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Queued routing operations</p>
        </Card>

        <Card className="p-4 border-slate-800 bg-[#0D1220] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Today's Output</span>
            <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <div className="text-2xl font-black font-mono text-indigo-700">
            {(floorSummary.completedToday || 0).toLocaleString()} M
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Recorded shift meters</p>
        </Card>
      </div>

      {/* 2. Active Work & Current Assignments (Main requirement) */}
      <Card className="border-slate-800 shadow-sm overflow-hidden bg-[#0D1220]">
        <CardHeader className="bg-slate-900/60 p-4 border-b border-slate-800 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">
              Current Work & Active Machine Assignments
            </CardTitle>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchBoard(true)}
            className="text-xs h-7 gap-1"
          >
            <RefreshCw className="h-3 w-3" /> Sync Board
          </Button>
        </CardHeader>
        <CardContent className="p-4">
          {activeWork.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <p className="font-semibold text-slate-400">No active work orders currently assigned to your terminals.</p>
              <p className="mt-1">Check upcoming tasks below or request assignments from the production planner.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeWork.map((job) => {
                const target = job.targetQuantity || 0;
                const completed = job.completedQuantity || 0;
                const remaining = job.remainingQuantity != null ? job.remainingQuantity : Math.max(0, target - completed);
                const percent = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;
                const isRunning = job.status === 'RUNNING';
                const isPaused = job.status === 'PAUSED';

                return (
                  <div
                    key={job._id}
                    className={`p-4 rounded-xl border transition-all text-xs ${
                      isRunning
                        ? 'border-blue-400 bg-[#5227FF]/15/20 shadow-xs'
                        : isPaused
                        ? 'border-amber-300 bg-amber-50/20'
                        : 'border-slate-800 bg-[#0D1220]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white font-mono text-sm">
                            {job.jobNumber || 'WO-JOB'}
                          </span>
                          <span className="text-slate-400 font-mono text-xs">
                            Order: {job.orderId?.orderNumber || 'SALES-ORDER'}
                          </span>
                          <Badge
                            className={`text-[10px] font-mono ${
                              isRunning
                                ? 'bg-emerald-600 text-white animate-pulse'
                                : isPaused
                                ? 'bg-amber-600 text-white'
                                : 'bg-slate-200 text-slate-300'
                            }`}
                          >
                            {job.status}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">
                          Fabric: <strong className="text-slate-200">{job.fabricSpecification?.fabricName || 'Oxford Woven Cotton'}</strong> &bull; {job.fabricSpecification?.gsm || 180} GSM &bull; {job.fabricSpecification?.weaveType || 'PLAIN'} &bull; {job.fabricSpecification?.color || 'Bleached'}
                        </p>
                      </div>

                      {/* Machine Badge */}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-mono bg-[#0D1220]">
                          <Cpu className="h-3 w-3 mr-1 text-blue-600" />
                          Loom: {job.machineId?.machineCode || 'LOOM-01'}
                        </Badge>
                        <Badge variant="secondary" className="text-xs font-mono">
                          {job.stage || 'WEAVING'}
                        </Badge>
                      </div>
                    </div>

                    {/* Quantities & Progress */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-b border-slate-100 font-mono text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] block font-sans uppercase">Target Quantity</span>
                        <span className="font-bold text-white">{target.toLocaleString()} M</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block font-sans uppercase">Completed</span>
                        <span className="font-bold text-emerald-700">{completed.toLocaleString()} M</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block font-sans uppercase">Remaining</span>
                        <span className="font-bold text-[#FF9FFC]">{remaining.toLocaleString()} M</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block font-sans uppercase">Next Process</span>
                        <span className="font-sans font-semibold text-slate-200">
                          {job.nextProcess || 'DYEING & FINISHING'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar & Actions */}
                    <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 sm:w-1/2">
                        <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                          <span>Job Progress</span>
                          <span className="font-bold text-slate-200">{percent}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {job.status === 'PENDING' && (
                          <Button
                            size="sm"
                            onClick={() => onStartJob(job)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1 shadow-xs"
                          >
                            <Play className="h-3.5 w-3.5" /> Start Task
                          </Button>
                        )}
                        {isRunning && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => onPauseJob(job)}
                              className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 gap-1 shadow-xs"
                            >
                              <Pause className="h-3.5 w-3.5" /> Pause
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => onLogMeters(job)}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 gap-1 shadow-xs"
                            >
                              <Plus className="h-3.5 w-3.5" /> Record Meters
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => onCompleteJob(job)}
                              className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 gap-1 shadow-xs"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Finish Job
                            </Button>
                          </>
                        )}
                        {isPaused && (
                          <Button
                            size="sm"
                            onClick={() => onResumeJob(job)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 gap-1 shadow-xs"
                          >
                            <Play className="h-3.5 w-3.5" /> Resume Task
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Manufacturing Stages & Order Timeline Tasks */}
      {timelineTasks.length > 0 && (
        <Card className="border-slate-800 shadow-sm bg-[#0D1220] overflow-hidden">
          <CardHeader className="bg-slate-900/60 p-4 border-b border-slate-800">
            <CardTitle className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600" />
              <span>Department Manufacturing Stage Assignments</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {timelineTasks.map((t, idx) => (
                <div
                  key={t._id || idx}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-mono text-sm">
                        {t.stage?.replace('_', ' ')}
                      </span>
                      <span className="text-slate-400 font-mono">
                        Order #{t.orderId?.orderNumber || 'ORDER'}
                      </span>
                      <Badge
                        className={`text-[10px] ${
                          t.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {t.status}
                      </Badge>
                      {t.isDelayed && (
                        <Badge className="bg-rose-600 text-white text-[10px]">
                          DELAY RISK
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3 font-mono">
                      <span>Target: {t.targetQuantity?.toLocaleString()} {t.unit}</span>
                      <span>&bull;</span>
                      <span>Produced: {t.completedQuantity?.toLocaleString()} {t.unit}</span>
                      {t.responsibleMachine && (
                        <>
                          <span>&bull;</span>
                          <span>Machine: {t.responsibleMachine}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {t.isDelayed && t.delayReason && (
                    <div className="text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 text-[11px]">
                      <strong>Delay:</strong> {t.delayReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. Upcoming Tasks & Loom Health Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Tasks */}
        <Card className="border-slate-800 shadow-sm bg-[#0D1220]">
          <CardHeader className="bg-slate-900/60 p-4 border-b border-slate-800">
            <CardTitle className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span>Upcoming Task Routing Queue ({upcomingTasks.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {upcomingTasks.length === 0 ? (
              <p className="text-slate-400 text-xs py-4 text-center">No upcoming tasks queued in your work center.</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingTasks.map((task) => (
                  <div
                    key={task._id}
                    className="p-3 rounded-lg border border-slate-800 bg-[#0D1220] flex items-center justify-between text-xs hover:border-slate-700"
                  >
                    <div>
                      <span className="font-mono font-bold text-slate-200">{task.jobNumber || 'TASK'}</span>
                      <p className="text-[11px] text-slate-500">
                        {task.fabricSpecification?.fabricName || 'Standard Plain Weave'} &bull; {task.targetQuantity?.toLocaleString()} M
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      QUEUED
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assigned Machines Snapshot */}
        <Card className="border-slate-800 shadow-sm bg-[#0D1220]">
          <CardHeader className="bg-slate-900/60 p-4 border-b border-slate-800">
            <CardTitle className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="h-4 w-4 text-blue-600" />
              <span>Assigned Machine Telemetry Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {assignedMachines.length === 0 ? (
              <p className="text-slate-400 text-xs py-4 text-center">No looms assigned to this terminal.</p>
            ) : (
              <div className="space-y-2.5">
                {assignedMachines.map((m) => (
                  <div
                    key={m._id}
                    className="p-3 rounded-lg border border-slate-800 bg-[#0D1220] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white">{m.machineCode}</span>
                        <span className="text-slate-500 text-[11px]">{m.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Picks: {m.telemetrySnapshot?.picksPerMinute || 0} ppm &bull; Efficiency: {m.telemetrySnapshot?.efficiencyPercentage || 0}%
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        className={`text-[10px] ${
                          m.status === 'RUNNING'
                            ? 'bg-emerald-600 text-white'
                            : m.status === 'BREAKDOWN'
                            ? 'bg-rose-600 text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {m.status}
                      </Badge>
                      {m.status === 'RUNNING' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onReportIssue(m._id)}
                          className="text-[10px] h-6 px-1.5 text-rose-600 hover:bg-rose-50"
                        >
                          Report Fault
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ==========================================
// 1.B. OPERATOR ATTENDANCE & TIMESHEET VIEW
// ==========================================
export function OperatorAttendanceTimesheetView({ attendance, isClockedIn, onClockToggle, clockLoading }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTimesheet = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/operator/attendance');
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load timesheet:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimesheet();
  }, [fetchTimesheet]);

  return (
    <div className="space-y-4">
      {/* Punch Clock Card */}
      <div className="p-5 rounded-2xl bg-[#0D1220] border border-slate-800/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isClockedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-300'}`}>
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-white text-base">Terminal Punch Clock</h3>
              <Badge className={isClockedIn ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-300'}>
                {isClockedIn ? 'CLOCKED IN' : 'CLOCKED OUT'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {attendance?.checkInTime
                ? `Clocked in at ${new Date(attendance.checkInTime).toLocaleTimeString('en-US')}`
                : 'Not clocked in yet today'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={onClockToggle}
            disabled={clockLoading}
            className={`min-h-[44px] px-6 font-bold text-xs rounded-xl shadow-md ${
              isClockedIn
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
            }`}
          >
            {clockLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : isClockedIn ? (
              <LogOut className="h-4 w-4 mr-2" />
            ) : (
              <LogIn className="h-4 w-4 mr-2" />
            )}
            {isClockedIn ? 'Clock Out of Floor' : 'Clock In to Floor'}
          </Button>
        </div>
      </div>

      {/* Timesheet Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-[#0D1220] border border-slate-800/80 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recorded Shifts</span>
          <span className="text-2xl font-black text-white font-mono mt-0.5 block">
            {data?.summary?.totalRecords || 0}
          </span>
          <span className="text-xs text-slate-500 font-medium">Last 30 Calendar Days</span>
        </div>
        <div className="p-4 rounded-xl bg-[#0D1220] border border-slate-800/80 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Work Hours</span>
          <span className="text-2xl font-black text-blue-600 font-mono mt-0.5 block">
            {data?.summary?.totalHoursWorked || 0} hrs
          </span>
          <span className="text-xs text-slate-500 font-medium">Logged Floor Time</span>
        </div>
        <div className="p-4 rounded-xl bg-[#0D1220] border border-slate-800/80 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Overtime Hours</span>
          <span className="text-2xl font-black text-emerald-600 font-mono mt-0.5 block">
            +{data?.summary?.totalOvertime || 0} hrs
          </span>
          <span className="text-xs text-slate-500 font-medium">Beyond 8h Standard Shift</span>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-[#0D1220] rounded-2xl border border-slate-800/90 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Punch Log History (30 Days)</h4>
          <Button variant="ghost" size="sm" onClick={fetchTimesheet} className="h-7 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : !data?.records || data.records.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-medium">
            No punch logs found for your account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#090D17] text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800/80">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-3">Shift</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Check-In</th>
                  <th className="py-3 px-3">Check-Out</th>
                  <th className="py-3 px-3">Regular Hours</th>
                  <th className="py-3 px-3">Overtime</th>
                  <th className="py-3 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium font-mono text-[11px]">
                {data.records.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-900/60/70">
                    <td className="py-3 px-4 font-sans font-bold text-slate-200">
                      {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-3 font-sans font-semibold text-slate-400">
                      {r.shiftId?.name || 'MORNING'}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-sans ${
                        r.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="py-3 px-3 font-bold text-white">{r.hoursWorked || 0} hrs</td>
                    <td className="py-3 px-3 text-emerald-700 font-bold">
                      {r.overtimeHours > 0 ? `+${r.overtimeHours}h` : '—'}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-500 italic max-w-xs truncate">
                      {r.remarks || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 2. OPERATOR DASHBOARD PAGE
// ==========================================
export function OperatorDashboardPage({ activeTab = 'my-machines', onNavigateSection }) {
  const { user, profile } = useAuth();
  const [activeViewTab, setActiveViewTab] = useState(activeTab || 'my-machines');

  useEffect(() => {
    if (activeTab) setActiveViewTab(activeTab);
  }, [activeTab]);

  // Core floor state
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Modals state
  const [transitionModal, setTransitionModal] = useState({ open: false, job: null, action: null });
  const [prodLogModal, setProdLogModal] = useState({ open: false, job: null });
  const [breakdownModal, setBreakdownModal] = useState({ open: false, machineId: null });
  const [handoverModal, setHandoverModal] = useState({ open: false, machineId: null });
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

  // Production Log Form
  const [prodForm, setProdForm] = useState({
    metersProduced: 100,
    wasteMeters: 2,
    durationMinutes: 60,
    downtimeMinutes: 0,
    remarks: '',
    shift: 'MORNING',
    overrunAuthorized: false,
    overrunReason: '',
    idempotencyKey: '',
  });

  // Breakdown Form
  const [breakdownForm, setBreakdownForm] = useState({
    breakdownType: 'MECHANICAL',
    severity: 'MEDIUM',
    description: '',
    missingMaterial: { name: '', qty: '', unit: 'KILOGRAM' },
  });

  // Handover Form
  const [handoverForm, setHandoverForm] = useState({
    incomingOperatorId: '',
    metersRunningAtHandover: 0,
    remainingWarpBeamPercentage: 50,
    selectedIssues: [],
    customIssue: '',
    outgoingNotes: '',
  });

  // Clock in/out
  const [clockLoading, setClockLoading] = useState(false);

  // Show toast notification helper
  const showToast = useCallback((msg, type = 'info') => {
    setToastMessage({ msg, type, id: Date.now() });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.msg === msg ? null : prev));
    }, 4500);
  }, []);

  // Fetch full floor state
  const loadDashboard = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      setError(null);
      const res = await api.get('/operator/dashboard');
      if (res.success && res.data) {
        setDashboardData(res.data);
        if (!selectedMachineId && res.data.assignedMachines?.length > 0) {
          setSelectedMachineId(res.data.assignedMachines[0]._id);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load floor telemetry');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [selectedMachineId]);

  // Initial load
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Real-Time Socket.IO Synchronization
  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    if (socket.connected) setSocketConnected(true);

    // Real-time floor events
    socket.on('production:job_updated', (data) => {
      showToast(`Task ${data.jobNumber || ''} updated to ${data.status} by ${data.updatedBy}`, 'info');
      loadDashboard(true);
    });

    socket.on('machine:status_changed', (data) => {
      showToast(`Loom ${data.machineCode} status changed to ${data.status}`, 'info');
      loadDashboard(true);
    });

    socket.on('production:log_recorded', (data) => {
      showToast(`+${data.metersProduced}m recorded for Loom. Total: ${data.cumulativeProduced || ''}m`, 'success');
      loadDashboard(true);
    });

    socket.on('machine:breakdown_reported', (data) => {
      showToast(`ALERT: ${data.breakdownType} reported on ${data.machineCode}!`, 'danger');
      loadDashboard(true);
    });

    socket.on('shift:handover_created', (data) => {
      showToast(`Shift handover completed on ${data.machineCode}`, 'info');
      loadDashboard(true);
    });

    socket.on('attendance:updated', () => {
      loadDashboard(true);
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('production:job_updated');
      socket.off('machine:status_changed');
      socket.off('production:log_recorded');
      socket.off('machine:breakdown_reported');
      socket.off('shift:handover_created');
      socket.off('attendance:updated');
    };
  }, [loadDashboard, showToast]);

  // Selected Machine Context
  const selectedMachine = useMemo(() => {
    if (!dashboardData?.assignedMachines) return null;
    return (
      dashboardData.assignedMachines.find((m) => m._id === selectedMachineId) ||
      dashboardData.assignedMachines[0] ||
      null
    );
  }, [dashboardData, selectedMachineId]);

  // Active Job on Selected Machine or assigned to operator
  const activeJobForSelectedMachine = useMemo(() => {
    if (!dashboardData?.activeJobs) return null;
    return (
      dashboardData.activeJobs.find(
        (j) => j.machineId?._id === selectedMachineId || j.machineId === selectedMachineId
      ) || dashboardData.activeJobs[0] || null
    );
  }, [dashboardData, selectedMachineId]);

  // Handle Task State Transition with Optimistic Locking / Versioning
  const handleTransition = async () => {
    if (!transitionModal.job || !transitionModal.action) return;
    setConfirmSubmitting(true);
    try {
      const res = await api.patch(`/operator/tasks/${transitionModal.job._id}/transition`, {
        action: transitionModal.action,
        expectedVersion: transitionModal.job.version,
      });

      if (res.success) {
        showToast(`Task ${transitionModal.action} successful!`, 'success');
        setTransitionModal({ open: false, job: null, action: null });
        await loadDashboard(true);
      }
    } catch (err) {
      alert(`Action Failed: ${err.message}`);
    } finally {
      setConfirmSubmitting(false);
    }
  };

  // Open Production Log Modal with fresh idempotency key
  const openProdLogModal = (job) => {
    const targetJob = job || activeJobForSelectedMachine;
    setProdForm({
      metersProduced: 100,
      wasteMeters: 2,
      durationMinutes: 60,
      downtimeMinutes: 0,
      remarks: '',
      shift: dashboardData?.currentShift?.name || 'MORNING',
      overrunAuthorized: false,
      overrunReason: '',
      idempotencyKey: `PLOG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    });
    setProdLogModal({ open: true, job: targetJob });
  };

  // Submit Production Log
  const handleSubmitProdLog = async (e) => {
    e.preventDefault();
    if (!prodLogModal.job) return;
    setConfirmSubmitting(true);
    try {
      const res = await api.post('/operator/production-logs', {
        jobId: prodLogModal.job._id,
        machineId: prodLogModal.job.machineId?._id || selectedMachine?._id,
        metersProduced: Number(prodForm.metersProduced),
        wasteMeters: Number(prodForm.wasteMeters || 0),
        durationMinutes: Number(prodForm.durationMinutes),
        downtimeMinutes: Number(prodForm.downtimeMinutes || 0),
        remarks: prodForm.remarks,
        shift: prodForm.shift,
        shiftId: dashboardData?.currentShift?._id,
        source: 'OPERATOR',
        idempotencyKey: prodForm.idempotencyKey,
        overrunAuthorized: prodForm.overrunAuthorized,
        overrunReason: prodForm.overrunReason,
      });

      if (res.success) {
        showToast(`Production Output Recorded: +${prodForm.metersProduced}m`, 'success');
        setProdLogModal({ open: false, job: null });
        await loadDashboard(true);
      }
    } catch (err) {
      alert(`Production Log Rejected: ${err.message}`);
    } finally {
      setConfirmSubmitting(false);
    }
  };

  // Submit Machine Breakdown
  const handleSubmitBreakdown = async (e) => {
    e.preventDefault();
    if (!breakdownModal.machineId) return;
    setConfirmSubmitting(true);
    try {
      const res = await api.post('/operator/breakdowns', {
        machineId: breakdownModal.machineId,
        breakdownType: breakdownForm.breakdownType,
        severity: breakdownForm.severity,
        description: breakdownForm.description,
        missingMaterialDetails:
          breakdownForm.breakdownType === 'MISSING_MATERIAL'
            ? {
                materialName: breakdownForm.missingMaterial.name,
                requiredQuantity: Number(breakdownForm.missingMaterial.qty || 0),
                unit: breakdownForm.missingMaterial.unit,
              }
            : undefined,
        idempotencyKey: `BRK-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      });

      if (res.success) {
        showToast(`Breakdown report logged: Machine status updated to ${res.data?.machine?.status}`, 'danger');
        setBreakdownModal({ open: false, machineId: null });
        await loadDashboard(true);
      }
    } catch (err) {
      alert(`Report Failed: ${err.message}`);
    } finally {
      setConfirmSubmitting(false);
    }
  };

  // Submit Shift Handover
  const handleSubmitHandover = async (e) => {
    e.preventDefault();
    if (!handoverModal.machineId || !handoverForm.incomingOperatorId) {
      alert('Please select the incoming operator');
      return;
    }
    setConfirmSubmitting(true);
    try {
      const combinedIssues = [...handoverForm.selectedIssues];
      if (handoverForm.customIssue.trim()) {
        combinedIssues.push(handoverForm.customIssue.trim());
      }

      const unfinished = activeJobForSelectedMachine
        ? [
            {
              jobId: activeJobForSelectedMachine._id,
              jobNumber: activeJobForSelectedMachine.jobNumber,
              stage: activeJobForSelectedMachine.stage,
              remainingQuantity: activeJobForSelectedMachine.remainingQuantity,
              notes: 'Running smoothly on shift handover transition',
            },
          ]
        : [];

      const res = await api.post('/operator/shift-handover', {
        machineId: handoverModal.machineId,
        incomingOperatorId: handoverForm.incomingOperatorId,
        shift: dashboardData?.currentShift?.name || 'MORNING',
        shiftId: dashboardData?.currentShift?._id,
        metersRunningAtHandover: Number(handoverForm.metersRunningAtHandover || 0),
        remainingWarpBeamPercentage: Number(handoverForm.remainingWarpBeamPercentage || 50),
        openIssues: combinedIssues,
        unfinishedTasks: unfinished,
        outgoingNotes: handoverForm.outgoingNotes,
        idempotencyKey: `HND-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      });

      if (res.success) {
        showToast('Shift handover recorded successfully!', 'success');
        setHandoverModal({ open: false, machineId: null });
        await loadDashboard(true);
      }
    } catch (err) {
      alert(`Handover Failed: ${err.message}`);
    } finally {
      setConfirmSubmitting(false);
    }
  };

  // Clock In / Clock Out
  const handleClockToggle = async () => {
    setClockLoading(true);
    try {
      const isCheckedIn = !!dashboardData?.todayAttendance?.checkInTime && !dashboardData?.todayAttendance?.checkOutTime;
      const action = isCheckedIn ? 'CHECK_OUT' : 'CHECK_IN';

      const res = await api.post('/operator/attendance/clock', {
        action,
        shiftId: dashboardData?.currentShift?._id,
        remarks: `${action === 'CHECK_IN' ? 'Started' : 'Ended'} shift from floor terminal`,
      });

      if (res.success) {
        showToast(action === 'CHECK_IN' ? 'Clocked IN successfully' : 'Clocked OUT successfully', 'success');
        await loadDashboard(true);
      }
    } catch (err) {
      alert(`Clock Failed: ${err.message}`);
    } finally {
      setClockLoading(false);
    }
  };

  // Loading Skeleton
  if (loading && !dashboardData) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 rounded-2xl bg-slate-200" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-44 rounded-2xl bg-slate-200" />
          <div className="h-44 rounded-2xl bg-slate-200" />
          <div className="h-44 rounded-2xl bg-slate-200" />
        </div>
        <div className="h-96 rounded-2xl bg-slate-200" />
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center max-w-xl mx-auto my-12 shadow-sm">
        <AlertTriangle className="h-12 w-12 text-rose-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-rose-900 mb-1">Factory Terminal Offline</h3>
        <p className="text-sm text-rose-700 mb-4">{error}</p>
        <Button onClick={() => loadDashboard()} className="bg-rose-600 hover:bg-rose-700 text-white">
          <RefreshCw className="h-4 w-4 mr-2" /> Reconnect Terminal
        </Button>
      </div>
    );
  }

  const op = dashboardData?.operator || {};
  const currentShift = dashboardData?.currentShift;
  const attendance = dashboardData?.todayAttendance;
  const isClockedIn = attendance?.checkInTime && !attendance?.checkOutTime;

  // Status Theme Mapping
  const statusTheme = {
    RUNNING: {
      badge: 'bg-emerald-500 text-white animate-pulse',
      card: 'border-emerald-300 bg-emerald-50/20',
      text: 'text-emerald-700',
      label: 'RUNNING',
    },
    IDLE: {
      badge: 'bg-amber-500 text-white',
      card: 'border-amber-300 bg-amber-50/20',
      text: 'text-amber-700',
      label: 'IDLE (READY)',
    },
    BREAKDOWN: {
      badge: 'bg-rose-600 text-white animate-bounce',
      card: 'border-rose-300 bg-rose-50/40',
      text: 'text-rose-700',
      label: 'BREAKDOWN (FAULT)',
    },
    MAINTENANCE: {
      badge: 'bg-purple-600 text-white',
      card: 'border-purple-300 bg-purple-50/20',
      text: 'text-purple-700',
      label: 'MAINTENANCE',
    },
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium transition-all transform animate-in fade-in slide-in-from-top-4 ${
            toastMessage.type === 'danger'
              ? 'bg-rose-900 text-rose-100 border-rose-700'
              : toastMessage.type === 'success'
              ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
              : 'bg-slate-900 text-slate-100 border-slate-700'
          }`}
        >
          {toastMessage.type === 'danger' ? (
            <AlertCircle className="h-5 w-5 text-rose-400" />
          ) : toastMessage.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          ) : (
            <Activity className="h-5 w-5 text-blue-400" />
          )}
          <span>{toastMessage.msg}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 1. Floor Status & Shift Overview Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Operator Profile */}
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-2xl font-black shadow-lg shadow-blue-500/30">
              {op.name?.[0] || 'O'}
              <span
                className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-slate-900 ${
                  socketConnected ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                title={socketConnected ? 'Live Floor Telemetry' : 'Offline'}
              />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{op.name || 'Floor Operator'}</h1>
                <Badge className="bg-indigo-600/80 text-white font-mono text-xs">{op.employeeCode}</Badge>
                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs">
                  {op.skillLevel?.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-1 flex items-center gap-3">
                <span>Dept: <b className="text-white">{op.department}</b></span>
                <span>•</span>
                <span>Assigned Looms: <b className="text-blue-400">{dashboardData?.assignedMachines?.length || 0} Machines</b></span>
                <span>•</span>
                <span>Rate: <b className="text-emerald-400">₹{op.hourlyWageRate}/hr</b></span>
              </p>
            </div>
          </div>

          {/* Shift Details & Clock-in Interactive Button */}
          <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap justify-between lg:justify-end border-t lg:border-t-0 border-slate-800 pt-4 lg:pt-0">
            <div className="bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700/80">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                <Clock className="h-3.5 w-3.5 text-blue-400" />
                <span>Active Shift</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">{currentShift?.name || 'MORNING'}</span>
                <span className="text-xs text-slate-400 font-mono">
                  ({currentShift?.startTime || '06:00'} - {currentShift?.endTime || '14:00'})
                </span>
              </div>
            </div>

            {/* Large Touch Clock-in / Out Toggle */}
            <button
              onClick={handleClockToggle}
              disabled={clockLoading}
              className={`flex items-center gap-3 px-5 py-3 rounded-xl font-bold text-sm tracking-wide shadow-lg transition-all min-h-[52px] ${
                isClockedIn
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/30'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/30'
              }`}
            >
              <UserCheck className="h-5 w-5" />
              <span>
                {clockLoading ? 'Syncing...' : isClockedIn ? 'Clock Out Shift' : 'Clock In Shift'}
              </span>
            </button>
          </div>
        </div>

        {/* Real-time telemetry connection bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            {socketConnected ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Wifi className="h-3.5 w-3.5 animate-pulse" /> Sentinel Floor Socket Online
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                <WifiOff className="h-3.5 w-3.5" /> Reconnecting floor stream...
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span>Active Jobs: <b className="text-white">{dashboardData?.activeJobs?.length || 0}</b></span>
            <span>Open Alerts: <b className="text-rose-400">{dashboardData?.openBreakdowns?.length || 0}</b></span>
          </div>
        </div>
      </div>

      {/* 2. Fast Navigation & Floor Touch Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
        {[
          { id: 'my-machines', label: 'Assigned Looms', icon: Cpu, badge: dashboardData?.assignedMachines?.length },
          { id: 'task-board', label: 'Task Board', icon: Layers, badge: 'Live Board', badgeColor: 'bg-indigo-600 text-white' },
          { id: 'shift-log', label: 'Record Output', icon: ClipboardList, badge: '+Entry' },
          { id: 'breakdowns', label: 'Report Issue', icon: AlertTriangle, badge: dashboardData?.openBreakdowns?.length, badgeColor: 'bg-rose-600 text-white' },
          { id: 'handover', label: 'Shift Handover', icon: RefreshCw, badge: 'Transfer' },
          { id: 'attendance', label: 'My Timesheet', icon: UserCheck, badge: 'Records' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeViewTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'task-board') {
                  setActiveViewTab('task-board');
                } else if (tab.id === 'my-machines') {
                  setActiveViewTab('my-machines');
                } else if (tab.id === 'attendance') {
                  setActiveViewTab('attendance');
                } else if (tab.id === 'shift-log') {
                  openProdLogModal();
                } else if (tab.id === 'breakdowns') {
                  setBreakdownModal({ open: true, machineId: selectedMachine?._id });
                } else if (tab.id === 'handover') {
                  setHandoverModal({ open: true, machineId: selectedMachine?._id });
                } else if (onNavigateSection) {
                  onNavigateSection(tab.id);
                }
              }}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all min-h-[64px] ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 font-bold'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800 font-semibold'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span className="text-xs leading-none">{tab.label}</span>
              </div>
              {tab.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    tab.badgeColor || (isActive ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400')
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeViewTab === 'task-board' ? (
        <OperatorTaskBoardView
          onStartJob={(job) => setTransitionModal({ open: true, job, action: 'START' })}
          onPauseJob={(job) => setTransitionModal({ open: true, job, action: 'PAUSE' })}
          onResumeJob={(job) => setTransitionModal({ open: true, job, action: 'RESUME' })}
          onCompleteJob={(job) => setTransitionModal({ open: true, job, action: 'COMPLETE' })}
          onLogMeters={(job) => openProdLogModal(job)}
          onReportIssue={(mId) => setBreakdownModal({ open: true, machineId: mId })}
          socketConnected={socketConnected}
        />
      ) : activeViewTab === 'attendance' ? (
        <OperatorAttendanceTimesheetView
          attendance={attendance}
          isClockedIn={isClockedIn}
          onClockToggle={handleClockToggle}
          clockLoading={clockLoading}
        />
      ) : (
        <>
          {/* 3. Assigned Machine Selection Pills (Large Touch Targets) */}
      <div className="bg-[#0D1220] p-4 rounded-2xl border border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Cpu className="h-4 w-4 text-blue-600" />
            <span>Select Machine Fleet</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Touch loom card to switch operational terminal
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {dashboardData?.assignedMachines?.map((m) => {
            const isSelected = selectedMachine?._id === m._id;
            const theme = statusTheme[m.status] || statusTheme.IDLE;
            return (
              <div
                key={m._id}
                onClick={() => setSelectedMachineId(m._id)}
                className={`cursor-pointer rounded-xl border-2 p-4 transition-all relative overflow-hidden ${
                  isSelected
                    ? 'border-blue-600 bg-[#5227FF]/15/30 shadow-md ring-2 ring-blue-500/20'
                    : 'border-slate-800 bg-[#0D1220] hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-base text-white tracking-tight">{m.machineCode}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${theme.badge}`}>
                        {m.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium truncate max-w-[200px]">{m.name}</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {m.location?.shed}
                  </span>
                </div>

                {/* Telemetry Snapshot */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Picks/min</span>
                    <span className="text-sm font-black text-slate-200">{m.telemetrySnapshot?.picksPerMinute || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">RPM</span>
                    <span className="text-sm font-black text-slate-200">{m.telemetrySnapshot?.rpm || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Efficiency</span>
                    <span className="text-sm font-black text-emerald-600">
                      {m.telemetrySnapshot?.efficiencyPercentage || 0}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Active Job & Production State Transitions on Selected Loom */}
      {selectedMachine && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Active Job Card */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-800 shadow-md rounded-2xl overflow-hidden bg-[#0D1220]">
              <CardHeader className="bg-slate-900 text-white p-5 border-b border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <Badge className="bg-blue-600 text-white font-mono text-xs uppercase px-2.5 py-0.5">
                        {activeJobForSelectedMachine?.stage || selectedMachine.type}
                      </Badge>
                      <h3 className="text-lg font-black tracking-tight text-white">
                        {activeJobForSelectedMachine?.jobNumber || 'No Running Job Scheduled'}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                      <span>Assigned Loom: <b className="text-white font-mono">{selectedMachine.machineCode}</b></span>
                      <span>•</span>
                      <span>Order: <b className="text-blue-400 font-mono">{activeJobForSelectedMachine?.orderNumber || 'N/A'}</b></span>
                    </p>
                  </div>

                  {/* Machine Status Pill */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full uppercase border ${
                        statusTheme[selectedMachine.status]?.badge || 'bg-slate-700 text-white'
                      }`}
                    >
                      {selectedMachine.status}
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {activeJobForSelectedMachine ? (
                  <>
                    {/* Fabric Specifications Snapshot */}
                    <div className="rounded-xl bg-slate-900/60 border border-slate-800/90 p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Package className="h-4 w-4 text-blue-600" />
                          <span>Fabric Specification Details</span>
                        </span>
                        <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 font-semibold text-xs">
                          {activeJobForSelectedMachine.fabricSpecs?.colorName}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="bg-[#0D1220] p-2.5 rounded-lg border border-slate-800/60">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Density (GSM)</span>
                          <span className="font-bold text-slate-200 text-sm">{activeJobForSelectedMachine.fabricSpecs?.gsm} GSM</span>
                        </div>
                        <div className="bg-[#0D1220] p-2.5 rounded-lg border border-slate-800/60">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Weave Pattern</span>
                          <span className="font-bold text-slate-200 text-sm">{activeJobForSelectedMachine.fabricSpecs?.weaveType}</span>
                        </div>
                        <div className="bg-[#0D1220] p-2.5 rounded-lg border border-slate-800/60">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Yarn Warp/Weft</span>
                          <span className="font-bold text-slate-200 text-xs truncate block">
                            {activeJobForSelectedMachine.fabricSpecs?.yarnCountWarp} x {activeJobForSelectedMachine.fabricSpecs?.yarnCountWeft}
                          </span>
                        </div>
                        <div className="bg-[#0D1220] p-2.5 rounded-lg border border-slate-800/60">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Width / Reed</span>
                          <span className="font-bold text-slate-200 text-sm">{activeJobForSelectedMachine.fabricSpecs?.widthInches}" Inches</span>
                        </div>
                      </div>
                    </div>

                    {/* Quantity Progress Tracker */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                        <span>Production Output Progress</span>
                        <span className="text-blue-600 font-mono text-sm">{activeJobForSelectedMachine.progressPercentage}%</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-800/80">
                        <div
                          className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, activeJobForSelectedMachine.progressPercentage)}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3 pt-2 text-center">
                        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Target</span>
                          <span className="font-black text-white text-base">
                            {activeJobForSelectedMachine.targetQuantity?.toLocaleString()} m
                          </span>
                        </div>
                        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                          <span className="text-[10px] text-emerald-600 uppercase font-bold block">Completed</span>
                          <span className="font-black text-emerald-800 text-base">
                            {activeJobForSelectedMachine.producedQuantity?.toLocaleString()} m
                          </span>
                        </div>
                        <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                          <span className="text-[10px] text-amber-600 uppercase font-bold block">Remaining</span>
                          <span className="font-black text-amber-800 text-base">
                            {activeJobForSelectedMachine.remainingQuantity?.toLocaleString()} m
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Next Process Banner */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#5227FF]/15/80 border border-[#5227FF]/40 text-xs text-blue-900">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <span>Next Production Stage:</span>
                        <b className="font-black uppercase tracking-wider text-blue-950">
                          {activeJobForSelectedMachine.nextProcess || 'DYEING & FINISHING'}
                        </b>
                      </div>
                      <span className="text-blue-600 font-medium hidden sm:inline">Auto-routed via Production Plan</span>
                    </div>

                    {/* Large Touch Validated State Transition Controls */}
                    <div className="pt-2 border-t border-slate-100 space-y-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Validated Task Controls (Touch-Optimized)
                      </h4>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {/* START BUTTON */}
                        <Button
                          disabled={
                            activeJobForSelectedMachine.status !== 'SCHEDULED' ||
                            selectedMachine.status === 'BREAKDOWN' ||
                            selectedMachine.status === 'MAINTENANCE'
                          }
                          onClick={() =>
                            setTransitionModal({
                              open: true,
                              job: activeJobForSelectedMachine,
                              action: 'START',
                            })
                          }
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold min-h-[52px] text-sm rounded-xl shadow-md disabled:opacity-40"
                        >
                          <Play className="h-4 w-4 mr-2 fill-current" /> START LOOM
                        </Button>

                        {/* PAUSE BUTTON */}
                        <Button
                          disabled={activeJobForSelectedMachine.status !== 'RUNNING'}
                          onClick={() =>
                            setTransitionModal({
                              open: true,
                              job: activeJobForSelectedMachine,
                              action: 'PAUSE',
                            })
                          }
                          className="bg-amber-500 hover:bg-amber-600 text-white font-bold min-h-[52px] text-sm rounded-xl shadow-md disabled:opacity-40"
                        >
                          <Pause className="h-4 w-4 mr-2 fill-current" /> PAUSE LOOM
                        </Button>

                        {/* RESUME BUTTON */}
                        <Button
                          disabled={
                            activeJobForSelectedMachine.status !== 'PAUSED' ||
                            selectedMachine.status === 'BREAKDOWN' ||
                            selectedMachine.status === 'MAINTENANCE'
                          }
                          onClick={() =>
                            setTransitionModal({
                              open: true,
                              job: activeJobForSelectedMachine,
                              action: 'RESUME',
                            })
                          }
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold min-h-[52px] text-sm rounded-xl shadow-md disabled:opacity-40"
                        >
                          <Play className="h-4 w-4 mr-2" /> RESUME
                        </Button>

                        {/* COMPLETE BUTTON */}
                        <Button
                          disabled={
                            activeJobForSelectedMachine.status !== 'RUNNING' &&
                            activeJobForSelectedMachine.status !== 'PAUSED'
                          }
                          onClick={() =>
                            setTransitionModal({
                              open: true,
                              job: activeJobForSelectedMachine,
                              action: 'COMPLETE',
                            })
                          }
                          className="bg-purple-600 hover:bg-purple-700 text-white font-bold min-h-[52px] text-sm rounded-xl shadow-md disabled:opacity-40"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" /> COMPLETE
                        </Button>
                      </div>

                      {/* Helper notice if controls are locked */}
                      {(selectedMachine.status === 'BREAKDOWN' || selectedMachine.status === 'MAINTENANCE') && (
                        <p className="text-xs text-rose-600 font-semibold flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          Controls locked: Machine is under {selectedMachine.status}. Please report maintenance or clear fault first.
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-slate-400 space-y-3">
                    <Package className="h-12 w-12 mx-auto text-slate-300" />
                    <p className="text-sm font-semibold">No active job assigned to {selectedMachine.machineCode}</p>
                    <p className="text-xs max-w-sm mx-auto text-slate-400">
                      When a new production routing plan is approved by the mill admin, scheduled tasks will appear here automatically.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Floor Actions Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => openProdLogModal(activeJobForSelectedMachine)}
                disabled={!activeJobForSelectedMachine}
                className="flex items-center justify-center gap-2.5 p-4 rounded-xl bg-[#0D1220] border border-slate-800 hover:border-blue-500 hover:bg-[#5227FF]/15/20 text-slate-200 font-bold text-sm shadow-sm transition-all disabled:opacity-50 min-h-[52px]"
              >
                <ClipboardList className="h-5 w-5 text-blue-600" />
                <span>Log Production Output</span>
              </button>

              <button
                onClick={() => setBreakdownModal({ open: true, machineId: selectedMachine._id })}
                className="flex items-center justify-center gap-2.5 p-4 rounded-xl bg-[#0D1220] border border-slate-800 hover:border-rose-500 hover:bg-rose-50/20 text-slate-200 font-bold text-sm shadow-sm transition-all min-h-[52px]"
              >
                <AlertTriangle className="h-5 w-5 text-rose-600" />
                <span>Report Breakdown / Help</span>
              </button>

              <button
                onClick={() => setHandoverModal({ open: true, machineId: selectedMachine._id })}
                className="flex items-center justify-center gap-2.5 p-4 rounded-xl bg-[#0D1220] border border-slate-800 hover:border-indigo-500 hover:bg-indigo-50/20 text-slate-200 font-bold text-sm shadow-sm transition-all min-h-[52px]"
              >
                <Layers className="h-5 w-5 text-indigo-600" />
                <span>Shift Handover Notes</span>
              </button>
            </div>
          </div>

          {/* Right Column: Live Telemetry & Recent Logs */}
          <div className="space-y-6">
            {/* Machine Specs & Live Telemetry Card */}
            <Card className="border-slate-800 shadow-sm rounded-2xl bg-[#0D1220]">
              <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-600" />
                  <span>Telemetry & Sensor Hub</span>
                </CardTitle>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-mono">
                  IoT Real-Time
                </Badge>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Picks / Min</span>
                    <span className="font-black text-white text-xl font-mono">
                      {selectedMachine.telemetrySnapshot?.picksPerMinute || 0}
                    </span>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Current RPM</span>
                    <span className="font-black text-white text-xl font-mono">
                      {selectedMachine.telemetrySnapshot?.rpm || 0}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Loom Type</span>
                    <b className="text-slate-200 font-medium">{selectedMachine.type}</b>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Location</span>
                    <b className="text-slate-200 font-medium">{selectedMachine.location?.shed} / {selectedMachine.location?.bay}</b>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Total Run Hours</span>
                    <b className="text-slate-200 font-mono font-medium">{selectedMachine.totalRunHours || 0} hrs</b>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Reed Space</span>
                    <b className="text-slate-200 font-medium">{selectedMachine.specifications?.reedSpaceInches || 75}" Inches</b>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Output Logs */}
            <Card className="border-slate-800 shadow-sm rounded-2xl bg-[#0D1220]">
              <CardHeader className="p-4 border-b border-slate-100">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Recent Shift Output Logs</span>
                  <span className="text-[10px] text-slate-400 font-normal">Last 5 submissions</span>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-3 space-y-2">
                {dashboardData?.recentLogs?.length > 0 ? (
                  dashboardData.recentLogs.slice(0, 5).map((log) => (
                    <div
                      key={log._id}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white">+{log.metersProduced}m</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-blue-100 text-blue-800">
                            {log.shift}
                          </span>
                          {log.source === 'IOT_SENSOR' && (
                            <span className="text-[9px] px-1 py-0.2 rounded font-mono bg-purple-100 text-purple-700">
                              IoT
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Waste: {log.wasteMeters || 0}m • Downtime: {log.downtimeMinutes || 0}m
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.logDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-xs text-slate-400 py-4">No production logs recorded yet today.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
        </>
      )}

      {/* 5. Production Output Modal (Large Touch Controls & Touch Stepper) */}
      {prodLogModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[#0D1220] shadow-2xl border border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-blue-400" />
                <h3 className="font-bold text-base">Record Production Output</h3>
              </div>
              <button
                onClick={() => setProdLogModal({ open: false, job: null })}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProdLog} className="p-6 overflow-y-auto space-y-5">
              {/* Job & Machine Identification */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                <p className="font-bold text-slate-200">
                  Job: <span className="text-blue-600 font-mono">{prodLogModal.job?.jobNumber}</span> (Order: {prodLogModal.job?.orderNumber})
                </p>
                <p className="text-slate-500 mt-0.5">
                  Remaining planned quota: <b>{prodLogModal.job?.remainingQuantity} meters</b>
                </p>
              </div>

              {/* Large Touch Stepper for Meters Produced */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Meters Produced (Floor Meter Counter)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setProdForm((prev) => ({ ...prev, metersProduced: Math.max(0, Number(prev.metersProduced) - 50) }))}
                    className="h-12 w-12 rounded-xl bg-slate-100 hover:bg-slate-200 font-black text-xl flex items-center justify-center text-slate-300 active:scale-95 transition-all"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    required
                    value={prodForm.metersProduced}
                    onChange={(e) => setProdForm({ ...prodForm, metersProduced: Number(e.target.value) })}
                    className="flex-1 h-12 text-center text-2xl font-black font-mono rounded-xl border-2 border-slate-700 focus:border-blue-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setProdForm((prev) => ({ ...prev, metersProduced: Number(prev.metersProduced) + 50 }))}
                    className="h-12 w-12 rounded-xl bg-slate-100 hover:bg-slate-200 font-black text-xl flex items-center justify-center text-slate-300 active:scale-95 transition-all"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>

                {/* Quick Add Presets */}
                <div className="flex items-center gap-2 mt-2">
                  {[25, 50, 100, 250, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setProdForm((prev) => ({ ...prev, metersProduced: Number(prev.metersProduced) + preset }))}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-300"
                    >
                      +{preset}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration & Downtime */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Run Duration (Min)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={prodForm.durationMinutes}
                    onChange={(e) => setProdForm({ ...prodForm, durationMinutes: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-700 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Downtime (Min)</label>
                  <input
                    type="number"
                    min="0"
                    value={prodForm.downtimeMinutes}
                    onChange={(e) => setProdForm({ ...prodForm, downtimeMinutes: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-700 font-mono text-sm"
                  />
                </div>
              </div>

              {/* Waste Quantity & Shift */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Waste / Scrap (Meters)</label>
                  <input
                    type="number"
                    min="0"
                    value={prodForm.wasteMeters}
                    onChange={(e) => setProdForm({ ...prodForm, wasteMeters: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-700 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Shift</label>
                  <select
                    value={prodForm.shift}
                    onChange={(e) => setProdForm({ ...prodForm, shift: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-700 text-sm font-semibold"
                  >
                    <option value="MORNING">MORNING (06:00 - 14:00)</option>
                    <option value="EVENING">EVENING (14:00 - 22:00)</option>
                    <option value="NIGHT">NIGHT (22:00 - 06:00)</option>
                  </select>
                </div>
              </div>

              {/* Overrun Warning & Authorized Exception Handler */}
              {prodLogModal.job && Number(prodForm.metersProduced) > prodLogModal.job.remainingQuantity && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>Plan Overrun Detected!</span>
                  </div>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    Output exceeds remaining target ({prodLogModal.job.remainingQuantity}m). Business rules require an authorized supervisor exception reason.
                  </p>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prodForm.overrunAuthorized}
                      onChange={(e) => setProdForm({ ...prodForm, overrunAuthorized: e.target.checked })}
                      className="h-4 w-4 rounded text-blue-600"
                    />
                    <span>Authorize Production Overrun Exception</span>
                  </label>
                  {prodForm.overrunAuthorized && (
                    <input
                      type="text"
                      placeholder="Reason (e.g., Authorized extra 5% allowance for buyer sample cuttings)"
                      value={prodForm.overrunReason}
                      onChange={(e) => setProdForm({ ...prodForm, overrunReason: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-amber-500/40 bg-slate-900 text-slate-200 text-xs mt-1"
                    />
                  )}
                </div>
              )}

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Floor Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g., Optimal tension at 850 RPM, no slub defects observed"
                  value={prodForm.remarks}
                  onChange={(e) => setProdForm({ ...prodForm, remarks: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-700 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProdLogModal({ open: false, job: null })}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={confirmSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold min-h-[44px] px-6"
                >
                  {confirmSubmitting ? 'Recording...' : 'Submit Output Log'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Machine Breakdown & Needs Modal */}
      {breakdownModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[#0D1220] shadow-2xl border border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 bg-rose-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-bold text-base">Report Breakdown or Floor Need</h3>
              </div>
              <button
                onClick={() => setBreakdownModal({ open: false, machineId: null })}
                className="text-rose-200 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitBreakdown} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Issue Classification
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'MECHANICAL', label: 'Mechanical Failure' },
                    { id: 'ELECTRICAL', label: 'Electrical Fault' },
                    { id: 'YARN_BREAKAGE', label: 'Yarn / Warp Break' },
                    { id: 'MAINTENANCE_REQUIRED', label: 'Maintenance Need' },
                    { id: 'MISSING_MATERIAL', label: 'Missing Materials' },
                    { id: 'POWER_OUTAGE', label: 'Power Interruption' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setBreakdownForm({ ...breakdownForm, breakdownType: item.id })}
                      className={`p-2.5 rounded-lg border text-left font-semibold transition-all ${
                        breakdownForm.breakdownType === item.id
                          ? 'border-rose-600 bg-rose-50 text-rose-900 ring-2 ring-rose-500/20'
                          : 'border-slate-800 bg-[#0D1220] text-slate-300 hover:bg-slate-900/60'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Missing Material Details if selected */}
              {breakdownForm.breakdownType === 'MISSING_MATERIAL' && (
                <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 space-y-2.5">
                  <span className="text-xs font-bold text-purple-900 block">Required Material Specifications</span>
                  <input
                    type="text"
                    required
                    placeholder="Material Sku or Name (e.g., 40s Ne Combed Cotton Cones)"
                    value={breakdownForm.missingMaterial.name}
                    onChange={(e) =>
                      setBreakdownForm({
                        ...breakdownForm,
                        missingMaterial: { ...breakdownForm.missingMaterial, name: e.target.value },
                      })
                    }
                    className="w-full h-9 px-3 rounded-lg border border-purple-300 text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      required
                      placeholder="Qty Required"
                      value={breakdownForm.missingMaterial.qty}
                      onChange={(e) =>
                        setBreakdownForm({
                          ...breakdownForm,
                          missingMaterial: { ...breakdownForm.missingMaterial, qty: e.target.value },
                        })
                      }
                      className="w-full h-9 px-3 rounded-lg border border-purple-300 text-xs"
                    />
                    <select
                      value={breakdownForm.missingMaterial.unit}
                      onChange={(e) =>
                        setBreakdownForm({
                          ...breakdownForm,
                          missingMaterial: { ...breakdownForm.missingMaterial, unit: e.target.value },
                        })
                      }
                      className="w-full h-9 px-3 rounded-lg border border-purple-300 text-xs"
                    >
                      <option value="KILOGRAM">KILOGRAM</option>
                      <option value="METER">METER</option>
                      <option value="CONE">CONES</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Severity */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Severity Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {['LOW', 'MEDIUM', 'CRITICAL'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setBreakdownForm({ ...breakdownForm, severity: s })}
                      className={`py-2 text-xs font-bold rounded-lg border uppercase transition-all ${
                        breakdownForm.severity === s
                          ? s === 'CRITICAL'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-amber-500 text-white border-amber-500'
                          : 'bg-slate-100 text-slate-300 border-slate-800'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Issue Description & Location Note</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the breakdown, noise, or reason for machine stop..."
                  value={breakdownForm.description}
                  onChange={(e) => setBreakdownForm({ ...breakdownForm, description: e.target.value })}
                  className="w-full p-3 rounded-lg border border-slate-700 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBreakdownModal({ open: false, machineId: null })}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={confirmSubmitting}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold min-h-[44px] px-6"
                >
                  {confirmSubmitting ? 'Broadcasting Alert...' : 'Broadcast Floor Alert'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Shift Handover Modal */}
      {handoverModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[#0D1220] shadow-2xl border border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 bg-indigo-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-400" />
                <h3 className="font-bold text-base">Shift Handover & Transition Record</h3>
              </div>
              <button
                onClick={() => setHandoverModal({ open: false, machineId: null })}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitHandover} className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Incoming Operator Selection */}
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">
                  Incoming Shift Operator
                </label>
                <select
                  required
                  value={handoverForm.incomingOperatorId}
                  onChange={(e) => setHandoverForm({ ...handoverForm, incomingOperatorId: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-700 text-xs font-semibold"
                >
                  <option value="">Select Relieving Operator...</option>
                  {dashboardData?.availableOperators
                    ?.filter((opr) => opr._id !== op.userId)
                    .map((opr) => (
                      <option key={opr._id} value={opr._id}>
                        {opr.name} ({opr.email})
                      </option>
                    ))}
                </select>
              </div>

              {/* Running Meter Reading & Warp Beam % */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Meters Running on Loom</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={handoverForm.metersRunningAtHandover}
                    onChange={(e) =>
                      setHandoverForm({ ...handoverForm, metersRunningAtHandover: Number(e.target.value) })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Remaining Warp Beam %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={handoverForm.remainingWarpBeamPercentage}
                    onChange={(e) =>
                      setHandoverForm({ ...handoverForm, remainingWarpBeamPercentage: Number(e.target.value) })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-700 font-mono"
                  />
                </div>
              </div>

              {/* Open Issues Checklist */}
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1.5">
                  Open Issues & Handover Flags
                </label>
                <div className="space-y-1.5">
                  {[
                    'Weft sensor #2 sensitivity high',
                    'Warp knotting inspection due at next 500m',
                    'Bobbin rack replenishment needed soon',
                    'Oil lubrication indicator amber',
                  ].map((issue) => {
                    const isChecked = handoverForm.selectedIssues.includes(issue);
                    return (
                      <label
                        key={issue}
                        className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800 cursor-pointer font-medium"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setHandoverForm({
                                ...handoverForm,
                                selectedIssues: [...handoverForm.selectedIssues, issue],
                              });
                            } else {
                              setHandoverForm({
                                ...handoverForm,
                                selectedIssues: handoverForm.selectedIssues.filter((i) => i !== issue),
                              });
                            }
                          }}
                          className="h-4 w-4 rounded text-indigo-600"
                        />
                        <span>{issue}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Handover Notes */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">Outgoing Operator Notes</label>
                <textarea
                  rows={2}
                  placeholder="Notes for the incoming operator regarding loom performance..."
                  value={handoverForm.outgoingNotes}
                  onChange={(e) => setHandoverForm({ ...handoverForm, outgoingNotes: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-700 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setHandoverModal({ open: false, machineId: null })}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={confirmSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold min-h-[44px] px-6"
                >
                  {confirmSubmitting ? 'Recording Handover...' : 'Confirm Handover'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Task Transition Confirmation Modal */}
      {transitionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#0D1220] shadow-2xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-bold ${
                  transitionModal.action === 'START'
                    ? 'bg-emerald-100 text-emerald-700'
                    : transitionModal.action === 'PAUSE'
                    ? 'bg-amber-100 text-amber-700'
                    : transitionModal.action === 'RESUME'
                    ? 'bg-blue-100 text-[#FF9FFC]'
                    : 'bg-purple-100 text-purple-700'
                }`}
              >
                {transitionModal.action === 'START' && <Play className="h-6 w-6" />}
                {transitionModal.action === 'PAUSE' && <Pause className="h-6 w-6" />}
                {transitionModal.action === 'RESUME' && <Play className="h-6 w-6" />}
                {transitionModal.action === 'COMPLETE' && <CheckCircle2 className="h-6 w-6" />}
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">
                  Confirm {transitionModal.action} Operation
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Task: {transitionModal.job?.jobNumber}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              {transitionModal.action === 'START' &&
                'Starting this task will change the machine state to RUNNING and log you as the active operator on the telemetry hub.'}
              {transitionModal.action === 'PAUSE' &&
                'Pausing will record downtime and set the loom status to IDLE until resumed.'}
              {transitionModal.action === 'RESUME' &&
                'Resuming will reactivate loom run-time tracking.'}
              {transitionModal.action === 'COMPLETE' &&
                'Completing this task will finalize production meters, mark the job as finished, and clear machine assignment for the next plan routing.'}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={confirmSubmitting}
                onClick={() => setTransitionModal({ open: false, job: null, action: null })}
              >
                Cancel
              </Button>
              <Button
                onClick={handleTransition}
                disabled={confirmSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5"
              >
                {confirmSubmitting ? 'Validating...' : `Confirm ${transitionModal.action}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OperatorDashboardPage;
