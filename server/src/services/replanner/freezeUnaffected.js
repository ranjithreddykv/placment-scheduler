import { buildStateFromInterviews } from '../../utils/availability.js';

/**
 * Splits the full interview list into frozen (untouched) and affected
 * (needs rescheduling) sets, and builds a ScheduleState pre-loaded with only
 * the frozen bookings — so rescheduling affected interviews can never
 * collide with something that was deliberately left alone.
 */
export function freezeUnaffected(allInterviews, affectedInterviews) {
  const affectedIds = new Set(affectedInterviews.map((iv) => iv.interviewId));
  const frozen = allInterviews.filter((iv) => !affectedIds.has(iv.interviewId));
  const state = buildStateFromInterviews(frozen);
  return { frozen, state };
}
