import { toMinutes } from '../../utils/timeUtils.js';
import { calculateWaitingTime, effectiveMinutes } from '../../utils/metricsUtils.js';
import { PRIORITY_WEIGHT, PLACEMENT_DAYS, INTERVIEW_STATUS, ROOM_STATUS, PANEL_STATUS } from '../../config/constants.js';

/**
 * Computes every metric shown on the dashboard directly from the current
 * interview/company/room data — nothing here is hardcoded.
 */
export function calculateScheduleMetrics({ interviews, companies, rooms }) {
  const total = interviews.length;
  const scheduled = interviews.filter((i) => i.status === INTERVIEW_STATUS.SCHEDULED || i.status === INTERVIEW_STATUS.COMPLETED);
  const unscheduled = interviews.filter((i) => i.status === INTERVIEW_STATUS.UNSCHEDULED);

  const schedulingRate = total > 0 ? (scheduled.length / total) * 100 : 0;

  const unscheduledReasonCounts = {};
  for (const iv of unscheduled) {
    unscheduledReasonCounts[iv.unscheduledReason] = (unscheduledReasonCounts[iv.unscheduledReason] || 0) + 1;
  }

  // --- Room utilisation: booked minutes / theoretically available minutes ---
  const roomBookedMinutes = scheduled.reduce((sum, iv) => sum + (toMinutes(iv.endTime) - toMinutes(iv.startTime)), 0);
  const activeRooms = rooms.filter((r) => r.status === ROOM_STATUS.AVAILABLE || r.unavailableFrom);
  let roomAvailableMinutes = 0;
  for (const room of activeRooms) {
    for (const day of PLACEMENT_DAYS) {
      let dayMinutes = effectiveMinutes(toMinutes('09:00'), toMinutes('18:00'));
      if (room.status === ROOM_STATUS.UNAVAILABLE && (room.unavailableDay == null || room.unavailableDay === day)) {
        if (room.unavailableFrom && room.unavailableTo) {
          dayMinutes -= toMinutes(room.unavailableTo) - toMinutes(room.unavailableFrom);
        } else {
          dayMinutes = 0;
        }
      }
      roomAvailableMinutes += Math.max(0, dayMinutes);
    }
  }
  const roomUtilisation = roomAvailableMinutes > 0 ? (roomBookedMinutes / roomAvailableMinutes) * 100 : 0;

  // --- Panel utilisation: booked minutes / sum of each company's panel-hours within its operating window ---
  const panelBookedMinutes = roomBookedMinutes; // one panel booked per interview, same duration
  let panelAvailableMinutes = 0;
  for (const company of companies) {
    const availablePanelCount = company.panels.filter((p) => p.status === PANEL_STATUS.AVAILABLE).length;
    const windowMinutes = company.operatingSlots.reduce(
      (sum, slot) => sum + effectiveMinutes(toMinutes(slot.startTime), toMinutes(slot.endTime)),
      0
    );
    panelAvailableMinutes += availablePanelCount * windowMinutes;
  }
  const panelUtilisation = panelAvailableMinutes > 0 ? (panelBookedMinutes / panelAvailableMinutes) * 100 : 0;

  // --- Average student waiting time ---
  const byStudent = new Map();
  for (const iv of scheduled) {
    if (!byStudent.has(iv.studentId)) byStudent.set(iv.studentId, []);
    byStudent.get(iv.studentId).push(iv);
  }
  let totalWait = 0;
  let studentsWithGaps = 0;
  for (const studentInterviews of byStudent.values()) {
    const { totalWaitMinutes, gapCount } = calculateWaitingTime(studentInterviews);
    if (gapCount > 0) {
      totalWait += totalWaitMinutes;
      studentsWithGaps += 1;
    }
  }
  const avgWaitingTime = studentsWithGaps > 0 ? totalWait / studentsWithGaps : 0;

  // --- Priority-weighted completion rate ---
  const companiesById = new Map(companies.map((c) => [c.companyId, c]));
  let weightedTotal = 0;
  let weightedScheduled = 0;
  for (const iv of interviews) {
    const weight = PRIORITY_WEIGHT[companiesById.get(iv.companyId)?.priorityTier] || 1;
    weightedTotal += weight;
    if (iv.status === INTERVIEW_STATUS.SCHEDULED || iv.status === INTERVIEW_STATUS.COMPLETED) weightedScheduled += weight;
  }
  const priorityWeightedCompletionRate = weightedTotal > 0 ? (weightedScheduled / weightedTotal) * 100 : 0;

  // --- Student conflicts: sanity check, should always be 0 under hard constraints ---
  let studentConflicts = 0;
  for (const studentInterviews of byStudent.values()) {
    const sorted = [...studentInterviews].sort((a, b) => a.day - b.day || toMinutes(a.startTime) - toMinutes(b.startTime));
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i].day === sorted[i - 1].day && toMinutes(sorted[i].startTime) < toMinutes(sorted[i - 1].endTime)) {
        studentConflicts += 1;
      }
    }
  }

  return {
    totalInterviews: total,
    scheduledCount: scheduled.length,
    unscheduledCount: unscheduled.length,
    schedulingRate: round(schedulingRate),
    unscheduledReasonCounts,
    roomUtilisation: round(roomUtilisation),
    panelUtilisation: round(panelUtilisation),
    avgStudentWaitingMinutes: round(avgWaitingTime),
    priorityWeightedCompletionRate: round(priorityWeightedCompletionRate),
    studentConflicts,
  };
}

function round(n) {
  return Math.round(n * 10) / 10;
}
