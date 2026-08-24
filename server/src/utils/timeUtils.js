import {
  SLOT_GRANULARITY_MINUTES,
  DAY_START,
  DAY_END,
  LUNCH_START,
  LUNCH_END,
} from '../config/constants.js';

/** 'HH:mm' -> minutes since midnight. */
export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** minutes since midnight -> 'HH:mm'. */
export function toHHMM(minutes) {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** True if [startA, endA) overlaps [startB, endB). All values in minutes since midnight. */
export function isOverlapping(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

/** True if [start, end) falls entirely within the lunch break. */
export function overlapsLunch(startMin, endMin) {
  return isOverlapping(startMin, endMin, toMinutes(LUNCH_START), toMinutes(LUNCH_END));
}

/**
 * Generates candidate slot-start times (in minutes since midnight), aligned to
 * SLOT_GRANULARITY_MINUTES, for an interview of `durationMinutes` that must fit
 * within [windowStart, windowEnd) and must not overlap the lunch break.
 */
export function generateCandidateStarts(windowStart, windowEnd, durationMinutes) {
  const starts = [];
  const gridStart = Math.ceil(windowStart / SLOT_GRANULARITY_MINUTES) * SLOT_GRANULARITY_MINUTES;
  for (let start = gridStart; start + durationMinutes <= windowEnd; start += SLOT_GRANULARITY_MINUTES) {
    if (!overlapsLunch(start, start + durationMinutes)) {
      starts.push(start);
    }
  }
  return starts;
}

export const DAY_START_MIN = toMinutes(DAY_START);
export const DAY_END_MIN = toMinutes(DAY_END);
export const LUNCH_START_MIN = toMinutes(LUNCH_START);
export const LUNCH_END_MIN = toMinutes(LUNCH_END);
