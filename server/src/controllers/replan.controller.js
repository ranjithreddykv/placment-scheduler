import { asyncHandler } from '../utils/errorHandler.js';
import {
  replanCompanyDelay,
  replanPanelDrop,
  replanStudentWithdrawal,
  replanRoomUnavailable,
} from '../services/replanner/replanService.js';

function toResponse({ diff, metrics, affectedCount }) {
  return {
    message: 'Schedule replanned',
    trigger: diff.trigger,
    triggerDescription: diff.triggerDescription,
    affectedCount,
    summary: diff.summary,
    changes: diff.changes,
    metrics,
  };
}

export const companyDelay = asyncHandler(async (req, res) => {
  const { companyId, delayMinutes, day } = req.body || {};
  const result = await replanCompanyDelay({ companyId, delayMinutes: Number(delayMinutes), day: day ? Number(day) : undefined });
  res.json(toResponse(result));
});

export const panelDrop = asyncHandler(async (req, res) => {
  const { companyId, panelId } = req.body || {};
  const result = await replanPanelDrop({ companyId, panelId });
  res.json(toResponse(result));
});

export const studentWithdraw = asyncHandler(async (req, res) => {
  const { studentId } = req.body || {};
  const result = await replanStudentWithdrawal({ studentId });
  res.json(toResponse(result));
});

export const roomUnavailable = asyncHandler(async (req, res) => {
  const { roomId, day, fromTime, toTime } = req.body || {};
  const result = await replanRoomUnavailable({ roomId, day: day ? Number(day) : undefined, fromTime, toTime });
  res.json(toResponse(result));
});
