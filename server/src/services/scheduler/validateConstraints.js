import { isOverlapping, toMinutes } from '../../utils/timeUtils.js';
import { PANEL_STATUS, ROOM_STATUS, STUDENT_STATUS } from '../../config/constants.js';

/**
 * Independently re-checks every hard constraint for a proposed assignment.
 * Used as a defensive gate right before committing an interview, and by the
 * test suite to prove the scheduler never violates its own rules.
 *
 * Returns an array of violation codes; empty array means the assignment is valid.
 */
export function validateAssignment({ assignment, student, company, room, panel, existingInterviews }) {
  const violations = [];
  const { day, start, end, roomId, panelId } = assignment;

  if (student.status !== STUDENT_STATUS.ACTIVE) violations.push('STUDENT_WITHDRAWN');

  const slot = company.operatingSlots.find((s) => s.day === day);
  if (!slot) {
    violations.push('COMPANY_UNAVAILABLE_DAY');
  } else {
    let windowStart = toMinutes(slot.startTime);
    const windowEnd = toMinutes(slot.endTime);
    if (company.delayedDay === day && company.arrivalDelay > 0) windowStart += company.arrivalDelay;
    if (start < windowStart || end > windowEnd) violations.push('COMPANY_WINDOW_VIOLATION');
  }

  if (panel?.status === PANEL_STATUS.DROPPED) violations.push('PANEL_DROPPED');
  if (room?.status === ROOM_STATUS.UNAVAILABLE) {
    const sameDay = room.unavailableDay == null || room.unavailableDay === day;
    if (sameDay) {
      if (room.unavailableFrom && room.unavailableTo) {
        if (isOverlapping(start, end, toMinutes(room.unavailableFrom), toMinutes(room.unavailableTo))) {
          violations.push('ROOM_UNAVAILABLE');
        }
      } else {
        violations.push('ROOM_UNAVAILABLE');
      }
    }
  }

  for (const other of existingInterviews) {
    if (other.interviewId === assignment.interviewId) continue;
    if (other.day !== day) continue;
    const otherStart = toMinutes(other.startTime);
    const otherEnd = toMinutes(other.endTime);
    if (!isOverlapping(start, end, otherStart, otherEnd)) continue;

    if (other.studentId === student.studentId) violations.push('STUDENT_OVERLAP');
    if (other.roomId === roomId) violations.push('ROOM_OVERLAP');
    if (other.panelId === panelId) violations.push('PANEL_OVERLAP');
  }

  return violations;
}
