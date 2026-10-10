import { logger } from '../config/logger.js';
import {
  getOperatorDashboardData,
  transitionTaskState,
  recordProductionLog,
  reportMachineBreakdown,
  recordShiftHandover,
  getOperatorAttendance,
  clockAttendance,
} from '../services/operator.service.js';
import { getOperatorTaskBoard } from '../services/timeline.service.js';

export async function getOperatorDashboardHandler(req, res, next) {
  try {
    const data = await getOperatorDashboardData(req.user._id);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function transitionTaskStateHandler(req, res, next) {
  try {
    const { action, expectedVersion, notes } = req.body;
    const { jobId } = req.params;

    const result = await transitionTaskState({
      jobId,
      action,
      expectedVersion,
      actorUser: req.user,
      notes,
    });

    res.json({
      success: true,
      message: `Task successfully transitioned to ${result.job.status}`,
      data: result,
    });
  } catch (error) {
    if (error.message.includes('Conflicting task transition')) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: error.message,
        },
      });
    }
    if (error.message.includes('Unauthorized task')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: error.message,
        },
      });
    }
    if (
      error.message.includes('Cannot') ||
      error.message.includes('Invalid action') ||
      error.message.includes('BREAKDOWN') ||
      error.message.includes('MAINTENANCE') ||
      error.message.includes('actively running another job')
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: error.message,
        },
      });
    }
    next(error);
  }
}

export async function recordProductionLogHandler(req, res, next) {
  try {
    const result = await recordProductionLog({
      ...req.body,
      actorUser: req.user,
    });

    res.status(result.isDuplicate ? 200 : 201).json({
      success: true,
      message: result.message || 'Production log recorded successfully',
      data: result,
    });
  } catch (error) {
    if (error.message.includes('Overrun violation')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'OVERRUN_AUTHORIZATION_REQUIRED',
          message: error.message,
        },
      });
    }
    if (error.message.includes('Unauthorized task')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: error.message,
        },
      });
    }
    if (error.message.includes('must be a non-negative') || error.message.includes('must be greater than zero')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
      });
    }
    next(error);
  }
}

export async function reportMachineBreakdownHandler(req, res, next) {
  try {
    const result = await reportMachineBreakdown({
      ...req.body,
      actorUser: req.user,
    });

    res.status(result.isDuplicate ? 200 : 201).json({
      success: true,
      message: result.message || 'Machine breakdown report submitted successfully',
      data: result,
    });
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: error.message,
        },
      });
    }
    next(error);
  }
}

export async function recordShiftHandoverHandler(req, res, next) {
  try {
    const result = await recordShiftHandover({
      ...req.body,
      actorUser: req.user,
    });

    res.status(result.isDuplicate ? 200 : 201).json({
      success: true,
      message: result.message || 'Shift handover recorded successfully',
      data: result,
    });
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: error.message,
        },
      });
    }
    next(error);
  }
}

export async function getOperatorAttendanceHandler(req, res, next) {
  try {
    const data = await getOperatorAttendance(req.user._id);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function clockAttendanceHandler(req, res, next) {
  try {
    const record = await clockAttendance({
      ...req.body,
      actorUser: req.user,
    });

    res.json({
      success: true,
      message: `Attendance ${req.body.action === 'CHECK_IN' ? 'Check-in' : 'Check-out'} recorded`,
      data: record,
    });
  } catch (error) {
    if (error.message.includes('Already') || error.message.includes('No check-in record') || error.message.includes('Invalid clock')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: error.message,
        },
      });
    }
    next(error);
  }
}

export async function getOperatorTaskBoardHandler(req, res, next) {
  try {
    const data = await getOperatorTaskBoard(req.user._id);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}
