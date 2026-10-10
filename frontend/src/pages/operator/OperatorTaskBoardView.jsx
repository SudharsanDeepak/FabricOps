import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Cpu,
  Activity,
  Plus,
  Loader2,
  RefreshCw,
  TrendingUp,
  Radio,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  FileText,
  Boxes,
  Truck
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';

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
        <Card className="p-4 border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Active Work</span>
            <Play className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            {floorSummary.activeCount ?? activeWork.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Assigned running / paused jobs</p>
        </Card>

        <Card className="p-4 border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Assigned Looms</span>
            <Cpu className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-700">
            {floorSummary.totalAssigned ?? assignedMachines.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Online machine terminals</p>
        </Card>

        <Card className="p-4 border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Upcoming Queue</span>
            <Clock className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-700">
            {floorSummary.pendingCount ?? upcomingTasks.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Queued routing operations</p>
        </Card>

        <Card className="p-4 border-slate-200 bg-white shadow-xs">
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
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-slate-50 p-4 border-b border-slate-200 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider">
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
              <p className="font-semibold text-slate-600">No active work orders currently assigned to your terminals.</p>
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
                        ? 'border-blue-400 bg-blue-50/20 shadow-xs'
                        : isPaused
                        ? 'border-amber-300 bg-amber-50/20'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 font-mono text-sm">
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
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {job.status}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 font-medium">
                          Fabric: <strong className="text-slate-800">{job.fabricSpecification?.fabricName || 'Oxford Woven Cotton'}</strong> &bull; {job.fabricSpecification?.gsm || 180} GSM &bull; {job.fabricSpecification?.weaveType || 'PLAIN'} &bull; {job.fabricSpecification?.color || 'Bleached'}
                        </p>
                      </div>

                      {/* Machine Badge */}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-mono bg-white">
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
                        <span className="font-bold text-slate-900">{target.toLocaleString()} M</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block font-sans uppercase">Completed</span>
                        <span className="font-bold text-emerald-700">{completed.toLocaleString()} M</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block font-sans uppercase">Remaining</span>
                        <span className="font-bold text-blue-700">{remaining.toLocaleString()} M</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block font-sans uppercase">Next Process</span>
                        <span className="font-sans font-semibold text-slate-800">
                          {job.nextProcess || 'DYEING & FINISHING'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar & Actions */}
                    <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 sm:w-1/2">
                        <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                          <span>Job Progress</span>
                          <span className="font-bold text-slate-800">{percent}%</span>
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
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-slate-50 p-4 border-b border-slate-200">
            <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600" />
              <span>Department Manufacturing Stage Assignments</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {timelineTasks.map((t, idx) => (
                <div
                  key={t._id || idx}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 font-mono text-sm">
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
                            : 'bg-slate-100 text-slate-600'
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
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="bg-slate-50 p-4 border-b border-slate-200">
            <CardTitle className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
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
                    className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs hover:border-slate-300"
                  >
                    <div>
                      <span className="font-mono font-bold text-slate-800">{task.jobNumber || 'TASK'}</span>
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
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="bg-slate-50 p-4 border-b border-slate-200">
            <CardTitle className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
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
                    className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{m.machineCode}</span>
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

export default OperatorTaskBoardView;
