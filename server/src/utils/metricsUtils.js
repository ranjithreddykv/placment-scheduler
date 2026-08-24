import { toMinutes, LUNCH_START_MIN, LUNCH_END_MIN, isOverlapping } from './timeUtils.js';

/**
 * Given one student's SCHEDULED interviews (any order), returns the total
 * "dead time" in minutes between consecutive interviews on the same day
 * (back-to-back interviews contribute 0). Cross-day gaps are not counted —
 * a student going home overnight isn't "waiting".
 */
export function calculateWaitingTime(interviews) {
  const byDay = new Map();
  for (const iv of interviews) {
    if (!byDay.has(iv.day)) byDay.set(iv.day, []);
    byDay.get(iv.day).push(iv);
  }

  let totalWaitMinutes = 0;
  let gapCount = 0;

  for (const dayInterviews of byDay.values()) {
    const sorted = [...dayInterviews].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    for (let i = 1; i < sorted.length; i += 1) {
      const prevEnd = toMinutes(sorted[i - 1].endTime);
      const currStart = toMinutes(sorted[i].startTime);
      const gap = Math.max(0, currStart - prevEnd);
      totalWaitMinutes += gap;
      gapCount += 1;
    }
  }

  return { totalWaitMinutes, gapCount };
}

/** Minutes of [start, end) that do NOT fall inside the lunch break. */
export function effectiveMinutes(startMin, endMin) {
  const duration = endMin - startMin;
  if (!isOverlapping(startMin, endMin, LUNCH_START_MIN, LUNCH_END_MIN)) return duration;
  const overlapStart = Math.max(startMin, LUNCH_START_MIN);
  const overlapEnd = Math.min(endMin, LUNCH_END_MIN);
  return duration - (overlapEnd - overlapStart);
}
