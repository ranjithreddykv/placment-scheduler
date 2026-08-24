import { generateCandidateStarts, toMinutes } from '../../utils/timeUtils.js';
import { isStudentAvailable, isRoomAvailable, isPanelAvailable, isCompanyAvailable } from '../../utils/availability.js';
import { PANEL_STATUS, ROOM_STATUS, UNSCHEDULED_REASON } from '../../config/constants.js';

/**
 * Finds the best feasible (day, start, end, room, panel) for one interview
 * requirement given the current schedule state.
 *
 * Strategy (greedy, explainable):
 *  1. If a `preferred` assignment is given (used during replanning to keep an
 *     interview as close as possible to where it already was), try that exact
 *     slot first. If it is still feasible, take it immediately — this is what
 *     keeps replans minimal.
 *  2. Otherwise walk the company's operating days/times in chronological
 *     order and take the first combination of panel + room that is free.
 *     Because candidates are generated earliest-first, this naturally
 *     minimizes student waiting time without needing to score every option.
 *
 * Returns { day, start, end, roomId, panelId, changePenalty } on success,
 * or { reason } (one of UNSCHEDULED_REASON) on failure.
 */
export function findAvailableSlot({ student, company, rooms, state, preferred }) {
  const availablePanels = company.panels.filter((p) => p.status === PANEL_STATUS.AVAILABLE);
  const availableRooms = rooms; // status/window checked per-candidate in isRoomAvailable

  if (availablePanels.length === 0) {
    return { reason: UNSCHEDULED_REASON.NO_PANEL_AVAILABLE };
  }

  if (preferred) {
    const { day, start, end, roomId, panelId } = preferred;
    const panel = availablePanels.find((p) => p.panelId === panelId);
    const room = rooms.find((r) => r.roomId === roomId);
    if (
      panel &&
      room &&
      isCompanyAvailable(company, day, start, end) &&
      isStudentAvailable(state, student.studentId, day, start, end) &&
      isPanelAvailable(state, panelId, day, start, end, panel) &&
      isRoomAvailable(state, roomId, day, start, end, room)
    ) {
      return { day, start, end, roomId, panelId, changePenalty: 0 };
    }
  }

  let sawCompanyWindow = false;
  let sawStudentConflict = false;
  let sawNoRoom = false;

  const sortedSlots = [...company.operatingSlots].sort((a, b) => a.day - b.day);

  for (const slot of sortedSlots) {
    sawCompanyWindow = true;
    let windowStart = toMinutes(slot.startTime);
    const windowEnd = toMinutes(slot.endTime);
    if (company.delayedDay === slot.day && company.arrivalDelay > 0) {
      windowStart += company.arrivalDelay;
    }
    if (windowStart >= windowEnd) continue;

    const starts = generateCandidateStarts(windowStart, windowEnd, company.interviewDuration);

    for (const start of starts) {
      const end = start + company.interviewDuration;

      if (!isStudentAvailable(state, student.studentId, slot.day, start, end)) {
        sawStudentConflict = true;
        continue;
      }

      for (const panel of availablePanels) {
        if (!isPanelAvailable(state, panel.panelId, slot.day, start, end, panel)) continue;

        for (const room of availableRooms) {
          if (room.status === ROOM_STATUS.UNAVAILABLE && room.unavailableDay == null) continue;
          if (!isRoomAvailable(state, room.roomId, slot.day, start, end, room)) {
            sawNoRoom = true;
            continue;
          }

          const changePenalty = preferred
            ? Math.abs(start - preferred.start) + (room.roomId !== preferred.roomId ? 15 : 0) + (panel.panelId !== preferred.panelId ? 15 : 0)
            : 0;

          return { day: slot.day, start, end, roomId: room.roomId, panelId: panel.panelId, changePenalty };
        }
      }
    }
  }

  if (!sawCompanyWindow) return { reason: UNSCHEDULED_REASON.COMPANY_WINDOW_EXHAUSTED };
  if (sawStudentConflict && !sawNoRoom) return { reason: UNSCHEDULED_REASON.STUDENT_CONFLICT };
  if (sawNoRoom) return { reason: UNSCHEDULED_REASON.NO_ROOM_AVAILABLE };
  return { reason: UNSCHEDULED_REASON.NO_FEASIBLE_SLOT };
}
