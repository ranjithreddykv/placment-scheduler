import { findAvailableSlot } from '../scheduler/findAvailableSlot.js';
import { sortRequirements } from '../scheduler/sortRequirements.js';
import { bookStudent, bookRoom, bookPanel } from '../../utils/availability.js';
import { toMinutes, toHHMM } from '../../utils/timeUtils.js';
import { INTERVIEW_STATUS } from '../../config/constants.js';

/**
 * Tries to re-place every affected interview into the (frozen-preloaded)
 * ScheduleState. Order matters: higher-priority interviews get first pick of
 * whatever capacity survived the disruption, same as the initial scheduler.
 *
 * `buildPreferred(iv)` lets each disruption type say "try to keep this
 * interview as close to its old slot as possible" (e.g. panel drop: same
 * room/time, different panel; room outage: same time/panel, different room).
 * Company delay and student withdrawal don't supply one — company delay's
 * old time is invalid by definition, and withdrawal cancels outright.
 */
export function rescheduleAffected({ affected, studentsById, companiesById, rooms, state, buildPreferred }) {
  const requirements = affected.map((iv) => ({ studentId: iv.studentId, companyId: iv.companyId }));
  const studentInterviewCounts = new Map();
  const companyVolume = new Map();
  for (const req of requirements) {
    studentInterviewCounts.set(req.studentId, (studentInterviewCounts.get(req.studentId) || 0) + 1);
    companyVolume.set(req.companyId, (companyVolume.get(req.companyId) || 0) + 1);
  }
  const sorted = sortRequirements(requirements, { companiesById, studentInterviewCounts, companyVolume });

  const byKey = new Map(affected.map((iv) => [`${iv.studentId}::${iv.companyId}`, iv]));
  const results = [];

  for (const req of sorted) {
    const original = byKey.get(`${req.studentId}::${req.companyId}`);
    const student = studentsById.get(req.studentId);
    const company = companiesById.get(req.companyId);

    const preferred = buildPreferred ? buildPreferred(original) : null;
    const outcome = findAvailableSlot({ student, company, rooms, state, preferred });

    if (outcome.reason) {
      results.push({ interviewId: original.interviewId, status: INTERVIEW_STATUS.UNSCHEDULED, unscheduledReason: outcome.reason });
      continue;
    }

    const { day, start, end, roomId, panelId, changePenalty } = outcome;
    bookStudent(state, student.studentId, day, start, end);
    bookRoom(state, roomId, day, start, end);
    bookPanel(state, panelId, day, start, end);

    results.push({
      interviewId: original.interviewId,
      status: INTERVIEW_STATUS.SCHEDULED,
      day,
      startTime: toHHMM(start),
      endTime: toHHMM(end),
      roomId,
      panelId,
      changePenalty,
    });
  }

  return results;
}

/** Converts an existing interview's stored assignment into a `preferred` slot object (minutes-based). */
export function toPreferredSlot(iv) {
  if (!iv.day || !iv.startTime || !iv.endTime) return null;
  return {
    day: iv.day,
    start: toMinutes(iv.startTime),
    end: toMinutes(iv.endTime),
    roomId: iv.roomId,
    panelId: iv.panelId,
  };
}
