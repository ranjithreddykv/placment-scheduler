import mongoose from 'mongoose';
import Student from '../../models/Student.js';
import Company from '../../models/Company.js';
import Room from '../../models/Room.js';
import Interview from '../../models/Interview.js';
import ScheduleVersion from '../../models/ScheduleVersion.js';
import { toMinutes, toHHMM } from '../../utils/timeUtils.js';
import { INTERVIEW_STATUS, STUDENT_STATUS, COMPANY_STATUS, ROOM_STATUS, PANEL_STATUS, REPLAN_TRIGGER, UNSCHEDULED_REASON } from '../../config/constants.js';
import {
  affectedByCompanyDelay,
  affectedByPanelDrop,
  affectedByStudentWithdrawal,
  affectedByRoomUnavailable,
} from './detectAffectedInterviews.js';
import { freezeUnaffected } from './freezeUnaffected.js';
import { rescheduleAffected, toPreferredSlot } from './rescheduleAffected.js';
import { generateDiff } from './generateDiff.js';
import { calculateScheduleMetrics } from '../scheduler/calculateMetrics.js';
import { ApiError } from '../../utils/errorHandler.js';

async function loadContext() {
  const [students, companies, rooms, interviews] = await Promise.all([
    Student.find().lean(),
    Company.find().lean(),
    Room.find().lean(),
    Interview.find().lean(),
  ]);
  return {
    students,
    companies,
    rooms,
    interviews,
    studentsById: new Map(students.map((s) => [s.studentId, s])),
    companiesById: new Map(companies.map((c) => [c.companyId, c])),
  };
}

/** Applies the reschedule results onto a copy of the full interview list. */
function applyResults(allInterviews, results) {
  const resultsById = new Map(results.map((r) => [r.interviewId, r]));
  return allInterviews.map((iv) => {
    const r = resultsById.get(iv.interviewId);
    if (!r) return iv;
    if (r.status === INTERVIEW_STATUS.UNSCHEDULED) {
      return { ...iv, status: INTERVIEW_STATUS.UNSCHEDULED, unscheduledReason: r.unscheduledReason, day: null, startTime: null, endTime: null, roomId: null, panelId: null };
    }
    return { ...iv, status: INTERVIEW_STATUS.SCHEDULED, unscheduledReason: null, day: r.day, startTime: r.startTime, endTime: r.endTime, roomId: r.roomId, panelId: r.panelId };
  });
}

async function persistReplan({ trigger, triggerDescription, allBefore, allAfter, affectedIds, cancelledIds, studentsById, companiesById, rooms, reasonForChange, entityUpdate }) {
  const diff = generateDiff({ trigger, triggerDescription, allBefore, allAfter, affectedIds, cancelledIds, studentsById, companiesById, reasonForChange });

  const companies = [...companiesById.values()];
  const metrics = calculateScheduleMetrics({ interviews: allAfter, companies, rooms });

  const touchedIds = new Set([...affectedIds, ...cancelledIds]);
  const afterById = new Map(allAfter.map((iv) => [iv.interviewId, iv]));
  const bulkOps = [...touchedIds].map((id) => {
    const iv = afterById.get(id);
    return {
      updateOne: {
        filter: { interviewId: id },
        update: {
          $set: {
            status: iv.status,
            unscheduledReason: iv.unscheduledReason ?? null,
            day: iv.day ?? null,
            startTime: iv.startTime ?? null,
            endTime: iv.endTime ?? null,
            roomId: iv.roomId ?? null,
            panelId: iv.panelId ?? null,
          },
        },
      },
    };
  });

  // Writes go: interview updates -> entity (company/room/student) update ->
  // new schedule version, so a reader never sees a version referencing
  // interview changes that weren't actually saved. Wrapped in a transaction
  // when the target MongoDB supports one (replica set / Atlas); falls back
  // to the same sequential writes otherwise (e.g. a plain standalone mongod).
  const performWrites = async (session) => {
    const opts = session ? { session } : {};
    if (bulkOps.length > 0) await Interview.bulkWrite(bulkOps, opts);
    if (entityUpdate) await entityUpdate(session);
    const lastVersion = await ScheduleVersion.findOne(null, null, opts).sort({ version: -1 });
    const nextVersion = (lastVersion?.version || 0) + 1;
    await ScheduleVersion.create([{ version: nextVersion, trigger, triggerDescription, changes: diff.changes, metrics, summary: diff.summary }], opts);
  };

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(() => performWrites(session));
  } catch (err) {
    const message = String(err?.message || '');
    const transactionsUnsupported = message.includes('Transaction numbers') || message.includes('replica set') || err?.code === 20;
    if (!transactionsUnsupported) throw err;
    await performWrites(null);
  } finally {
    await session.endSession();
  }

  return { diff, metrics };
}

export async function replanCompanyDelay({ companyId, delayMinutes, day }) {
  if (!companyId || !Number.isFinite(delayMinutes) || delayMinutes <= 0) {
    throw new ApiError(400, 'companyId and a positive delayMinutes are required');
  }
  const ctx = await loadContext();
  const company = ctx.companiesById.get(companyId);
  if (!company) throw new ApiError(404, `Company ${companyId} not found`);

  const targetDay = day || company.operatingSlots[0]?.day;
  const slot = company.operatingSlots.find((s) => s.day === targetDay);
  if (!slot) throw new ApiError(400, `Company ${companyId} does not operate on day ${targetDay}`);

  const newWindowStartMin = toMinutes(slot.startTime) + delayMinutes;
  const allBefore = ctx.interviews;
  const affected = affectedByCompanyDelay(allBefore, { companyId, day: targetDay, newWindowStartMin });
  const affectedIds = new Set(affected.map((iv) => iv.interviewId));

  const { frozen, state } = freezeUnaffected(allBefore, affected);
  const updatedCompany = { ...company, arrivalDelay: delayMinutes, delayedDay: targetDay, status: COMPANY_STATUS.DELAYED };
  const companiesById = new Map(ctx.companiesById);
  companiesById.set(companyId, updatedCompany);

  const results = rescheduleAffected({
    affected,
    studentsById: ctx.studentsById,
    companiesById,
    rooms: ctx.rooms,
    state,
    buildPreferred: () => null, // original time is invalid by definition
  });

  const allAfter = applyResults(allBefore, results);

  const triggerDescription = `${company.name} delayed by ${formatMinutes(delayMinutes)} on Day ${targetDay}`;
  const { diff, metrics } = await persistReplan({
    trigger: REPLAN_TRIGGER.COMPANY_DELAY,
    triggerDescription,
    allBefore,
    allAfter,
    affectedIds,
    cancelledIds: new Set(),
    studentsById: ctx.studentsById,
    companiesById,
    rooms: ctx.rooms,
    reasonForChange: 'Company arrival delay',
    entityUpdate: async (session) => {
      await Company.updateOne(
        { companyId },
        { $set: { arrivalDelay: delayMinutes, delayedDay: targetDay, status: COMPANY_STATUS.DELAYED } },
        session ? { session } : {}
      );
    },
  });

  return { diff, metrics, affectedCount: affected.length };
}

export async function replanPanelDrop({ companyId, panelId }) {
  if (!companyId || !panelId) throw new ApiError(400, 'companyId and panelId are required');
  const ctx = await loadContext();
  const company = ctx.companiesById.get(companyId);
  if (!company) throw new ApiError(404, `Company ${companyId} not found`);
  const panel = company.panels.find((p) => p.panelId === panelId);
  if (!panel) throw new ApiError(404, `Panel ${panelId} not found on company ${companyId}`);

  const allBefore = ctx.interviews;
  const affected = affectedByPanelDrop(allBefore, { panelId });
  const affectedIds = new Set(affected.map((iv) => iv.interviewId));

  const { state } = freezeUnaffected(allBefore, affected);
  const updatedCompany = {
    ...company,
    panels: company.panels.map((p) => (p.panelId === panelId ? { ...p, status: PANEL_STATUS.DROPPED } : p)),
  };
  const companiesById = new Map(ctx.companiesById);
  companiesById.set(companyId, updatedCompany);

  const results = rescheduleAffected({
    affected,
    studentsById: ctx.studentsById,
    companiesById,
    rooms: ctx.rooms,
    state,
    buildPreferred: (iv) => toPreferredSlot(iv), // try same day/time/room, different panel
  });

  const allAfter = applyResults(allBefore, results);

  const triggerDescription = `${company.name} panel ${panelId} dropped out`;
  const { diff, metrics } = await persistReplan({
    trigger: REPLAN_TRIGGER.PANEL_DROPPED,
    triggerDescription,
    allBefore,
    allAfter,
    affectedIds,
    cancelledIds: new Set(),
    studentsById: ctx.studentsById,
    companiesById,
    rooms: ctx.rooms,
    reasonForChange: 'Panel dropped',
    entityUpdate: async (session) => {
      await Company.updateOne(
        { companyId, 'panels.panelId': panelId },
        { $set: { 'panels.$.status': PANEL_STATUS.DROPPED } },
        session ? { session } : {}
      );
    },
  });

  return { diff, metrics, affectedCount: affected.length };
}

export async function replanStudentWithdrawal({ studentId }) {
  if (!studentId) throw new ApiError(400, 'studentId is required');
  const ctx = await loadContext();
  const student = ctx.studentsById.get(studentId);
  if (!student) throw new ApiError(404, `Student ${studentId} not found`);

  const allBefore = ctx.interviews;
  const affected = affectedByStudentWithdrawal(allBefore, { studentId });
  const cancelledIds = new Set(affected.map((iv) => iv.interviewId));

  const allAfter = allBefore.map((iv) =>
    cancelledIds.has(iv.interviewId)
      ? { ...iv, status: INTERVIEW_STATUS.CANCELLED, unscheduledReason: UNSCHEDULED_REASON.STUDENT_WITHDRAWN }
      : iv
  );

  const triggerDescription = `${student.name} (${studentId}) withdrew`;
  const { diff, metrics } = await persistReplan({
    trigger: REPLAN_TRIGGER.STUDENT_WITHDRAWAL,
    triggerDescription,
    allBefore,
    allAfter,
    affectedIds: new Set(),
    cancelledIds,
    studentsById: ctx.studentsById,
    companiesById: ctx.companiesById,
    rooms: ctx.rooms,
    reasonForChange: 'Student withdrawn',
    entityUpdate: async (session) => {
      await Student.updateOne({ studentId }, { $set: { status: STUDENT_STATUS.WITHDRAWN } }, session ? { session } : {});
    },
  });

  return { diff, metrics, affectedCount: affected.length };
}

export async function replanRoomUnavailable({ roomId, day, fromTime, toTime }) {
  if (!roomId || !day || !fromTime || !toTime) {
    throw new ApiError(400, 'roomId, day, fromTime and toTime are required');
  }
  const ctx = await loadContext();
  const room = ctx.rooms.find((r) => r.roomId === roomId);
  if (!room) throw new ApiError(404, `Room ${roomId} not found`);

  const fromMin = toMinutes(fromTime);
  const toMin = toMinutes(toTime);
  if (fromMin >= toMin) throw new ApiError(400, 'fromTime must be before toTime');

  const allBefore = ctx.interviews;
  const affected = affectedByRoomUnavailable(allBefore, { roomId, day, fromMin, toMin });
  const affectedIds = new Set(affected.map((iv) => iv.interviewId));

  const updatedRoom = { ...room, status: ROOM_STATUS.UNAVAILABLE, unavailableDay: day, unavailableFrom: fromTime, unavailableTo: toTime };
  const rooms = ctx.rooms.map((r) => (r.roomId === roomId ? updatedRoom : r));

  const { state } = freezeUnaffected(allBefore, affected);

  const results = rescheduleAffected({
    affected,
    studentsById: ctx.studentsById,
    companiesById: ctx.companiesById,
    rooms,
    state,
    buildPreferred: (iv) => toPreferredSlot(iv), // try same day/time/panel, different room
  });

  const allAfter = applyResults(allBefore, results);

  const triggerDescription = `Room ${roomId} unavailable ${fromTime}-${toTime} on Day ${day}`;
  const { diff, metrics } = await persistReplan({
    trigger: REPLAN_TRIGGER.ROOM_UNAVAILABLE,
    triggerDescription,
    allBefore,
    allAfter,
    affectedIds,
    cancelledIds: new Set(),
    studentsById: ctx.studentsById,
    companiesById: ctx.companiesById,
    rooms,
    reasonForChange: 'Room unavailable',
    entityUpdate: async (session) => {
      await Room.updateOne(
        { roomId },
        { $set: { status: ROOM_STATUS.UNAVAILABLE, unavailableDay: day, unavailableFrom: fromTime, unavailableTo: toTime } },
        session ? { session } : {}
      );
    },
  });

  return { diff, metrics, affectedCount: affected.length };
}

function formatMinutes(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}
