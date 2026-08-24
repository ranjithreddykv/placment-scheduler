import { calculateWaitingTime } from '../../utils/metricsUtils.js';
import { calculateChangeCost, classifyDisruptionLevel } from './calculateChangeCost.js';
import { INTERVIEW_STATUS } from '../../config/constants.js';

/**
 * Produces the human-readable "what changed" diff shown after a replan:
 * per-interview before/after, who needs to be notified, and roll-up
 * counts (moved / unchanged / newly unscheduled / replan cost).
 *
 * `allBefore` / `allAfter` are the full interview list snapshotted before
 * and after the replan. `affectedIds` is exactly the set that was up for
 * rescheduling; everything else is unchanged by construction (frozen).
 */
export function generateDiff({ trigger, triggerDescription, allBefore, allAfter, affectedIds, cancelledIds = new Set(), studentsById, companiesById, reasonForChange }) {
  const beforeById = new Map(allBefore.map((iv) => [iv.interviewId, iv]));
  const afterById = new Map(allAfter.map((iv) => [iv.interviewId, iv]));
  const touchedIds = new Set([...affectedIds, ...cancelledIds]);

  const changes = [];
  for (const id of touchedIds) {
    const before = beforeById.get(id);
    const after = afterById.get(id);
    if (!before || !after) continue;

    const student = studentsById.get(before.studentId);
    const company = companiesById.get(before.companyId);

    let changeType;
    if (cancelledIds.has(id)) changeType = 'CANCELLED';
    else if (after.status === INTERVIEW_STATUS.UNSCHEDULED) changeType = 'UNSCHEDULED';
    else if (before.status === INTERVIEW_STATUS.UNSCHEDULED) changeType = 'SCHEDULED';
    else changeType = 'MOVED';

    const notify = new Set(['Placement Coordinator']);
    if (student) notify.add(student.name);
    if (company) notify.add(`${company.name} coordinator`);
    if (before.panelId) notify.add(`Panel ${before.panelId}`);
    if (after.panelId && after.panelId !== before.panelId) notify.add(`Panel ${after.panelId}`);

    changes.push({
      interviewId: id,
      studentId: before.studentId,
      studentName: student?.name,
      companyId: before.companyId,
      companyName: company?.name,
      changeType,
      reason: reasonForChange || (after.unscheduledReason ?? null),
      old: { day: before.day, startTime: before.startTime, endTime: before.endTime, roomId: before.roomId, panelId: before.panelId },
      updated: { day: after.day, startTime: after.startTime, endTime: after.endTime, roomId: after.roomId, panelId: after.panelId },
      notify: [...notify],
    });
  }

  const moved = changes.filter((c) => c.changeType === 'MOVED');
  const unscheduled = changes.filter((c) => c.changeType === 'UNSCHEDULED');
  const roomsChanged = moved.filter((c) => c.old.roomId !== c.updated.roomId).length;
  const panelsChanged = moved.filter((c) => c.old.panelId !== c.updated.panelId).length;

  const studentsAffected = new Set(changes.map((c) => c.studentId)).size;
  const movedStudentIds = new Set(moved.map((c) => c.studentId));
  const movedCompanyTiers = moved.map((c) => companiesById.get(c.companyId)?.priorityTier).filter(Boolean);

  const waitingTimeIncreaseMinutes = computeWaitingTimeIncrease({
    studentIds: new Set(changes.map((c) => c.studentId)),
    allBefore,
    allAfter,
    cancelledIds,
  });

  const { replanCost } = calculateChangeCost({
    movedInterviewCount: moved.length,
    movedStudentCount: movedStudentIds.size,
    waitingTimeIncreaseMinutes,
    movedCompanyTiers,
    newlyUnscheduledCount: unscheduled.length,
  });

  const unchanged = allAfter.filter(
    (iv) => (iv.status === INTERVIEW_STATUS.SCHEDULED || iv.status === INTERVIEW_STATUS.COMPLETED) && !touchedIds.has(iv.interviewId)
  ).length;

  // Replan Churn = moved interviews / total scheduled interviews before the replan (as a %).
  const totalScheduledBefore = allBefore.filter((iv) => iv.status === INTERVIEW_STATUS.SCHEDULED || iv.status === INTERVIEW_STATUS.COMPLETED).length;
  const replanChurnPercent = totalScheduledBefore > 0 ? Math.round((moved.length / totalScheduledBefore) * 1000) / 10 : 0;

  return {
    trigger,
    triggerDescription,
    changes,
    summary: {
      unchanged,
      moved: moved.length,
      studentsAffected,
      roomsChanged,
      panelsChanged,
      newlyUnscheduled: unscheduled.length,
      replanCost,
      replanChurnPercent,
      disruptionLevel: classifyDisruptionLevel(replanCost),
    },
  };
}

function computeWaitingTimeIncrease({ studentIds, allBefore, allAfter, cancelledIds }) {
  let totalIncrease = 0;
  for (const studentId of studentIds) {
    const before = allBefore.filter((iv) => iv.studentId === studentId && iv.status === INTERVIEW_STATUS.SCHEDULED);
    const after = allAfter.filter(
      (iv) => iv.studentId === studentId && iv.status === INTERVIEW_STATUS.SCHEDULED && !cancelledIds.has(iv.interviewId)
    );
    const beforeWait = calculateWaitingTime(before).totalWaitMinutes;
    const afterWait = calculateWaitingTime(after).totalWaitMinutes;
    totalIncrease += Math.max(0, afterWait - beforeWait);
  }
  return totalIncrease;
}
