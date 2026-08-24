import { isOverlapping, toMinutes } from './timeUtils.js';
import { ROOM_STATUS, PANEL_STATUS } from '../config/constants.js';

/**
 * A ScheduleState is a lightweight in-memory index of everything currently
 * booked, keyed for O(1)-ish lookups. The scheduler and replanner build one
 * from the interviews they are working with (either the whole schedule, or
 * just the "frozen" unaffected interviews) and mutate it as they place new
 * interviews. Keeping this out of the database means the greedy search loop
 * (thousands of candidate slot checks) never touches Mongo.
 */
export function createScheduleState() {
  return {
    // studentId -> day -> [{start, end}]
    student: new Map(),
    // roomId -> day -> [{start, end}]
    room: new Map(),
    // panelId -> day -> [{start, end}]
    panel: new Map(),
  };
}

function getDayBookings(map, key, day) {
  if (!map.has(key)) map.set(key, new Map());
  const byDay = map.get(key);
  if (!byDay.has(day)) byDay.set(day, []);
  return byDay.get(day);
}

function hasConflict(map, key, day, start, end) {
  const bookings = getDayBookings(map, key, day);
  return bookings.some((b) => isOverlapping(start, end, b.start, b.end));
}

export function isStudentAvailable(state, studentId, day, start, end) {
  return !hasConflict(state.student, studentId, day, start, end);
}

export function isRoomAvailable(state, roomId, day, start, end, room) {
  if (room) {
    if (room.status === ROOM_STATUS.UNAVAILABLE) {
      const sameDay = room.unavailableDay == null || room.unavailableDay === day;
      if (sameDay && room.unavailableFrom && room.unavailableTo) {
        if (isOverlapping(start, end, toMinutes(room.unavailableFrom), toMinutes(room.unavailableTo))) {
          return false;
        }
      } else if (sameDay) {
        return false; // unavailable all day, no time window given
      }
    }
  }
  return !hasConflict(state.room, roomId, day, start, end);
}

export function isPanelAvailable(state, panelId, day, start, end, panel) {
  if (panel && panel.status === PANEL_STATUS.DROPPED) return false;
  return !hasConflict(state.panel, panelId, day, start, end);
}

/** Company must have an operating slot on `day` covering [start, end), and start must be at/after any arrival delay for that day. */
export function isCompanyAvailable(company, day, start, end) {
  const slot = company.operatingSlots.find((s) => s.day === day);
  if (!slot) return false;

  let windowStart = toMinutes(slot.startTime);
  const windowEnd = toMinutes(slot.endTime);

  if (company.delayedDay === day && company.arrivalDelay > 0) {
    windowStart = Math.max(windowStart, toMinutes(slot.startTime) + company.arrivalDelay);
  }

  return start >= windowStart && end <= windowEnd;
}

export function bookStudent(state, studentId, day, start, end) {
  getDayBookings(state.student, studentId, day).push({ start, end });
}

export function bookRoom(state, roomId, day, start, end) {
  getDayBookings(state.room, roomId, day).push({ start, end });
}

export function bookPanel(state, panelId, day, start, end) {
  getDayBookings(state.panel, panelId, day).push({ start, end });
}

function releaseBooking(map, key, day, start, end) {
  const bookings = getDayBookings(map, key, day);
  const idx = bookings.findIndex((b) => b.start === start && b.end === end);
  if (idx !== -1) bookings.splice(idx, 1);
}

export function releaseStudent(state, studentId, day, start, end) {
  releaseBooking(state.student, studentId, day, start, end);
}

export function releaseRoom(state, roomId, day, start, end) {
  releaseBooking(state.room, roomId, day, start, end);
}

export function releasePanel(state, panelId, day, start, end) {
  releaseBooking(state.panel, panelId, day, start, end);
}

/** Builds a fresh ScheduleState by booking every SCHEDULED/COMPLETED interview in `interviews`. */
export function buildStateFromInterviews(interviews) {
  const state = createScheduleState();
  for (const iv of interviews) {
    if (!iv.day || !iv.startTime || !iv.endTime) continue;
    const start = toMinutes(iv.startTime);
    const end = toMinutes(iv.endTime);
    bookStudent(state, iv.studentId, iv.day, start, end);
    bookRoom(state, iv.roomId, iv.day, start, end);
    bookPanel(state, iv.panelId, iv.day, start, end);
  }
  return state;
}
