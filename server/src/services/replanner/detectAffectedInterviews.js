import { isOverlapping, toMinutes } from '../../utils/timeUtils.js';
import { INTERVIEW_STATUS } from '../../config/constants.js';

const ACTIVE = (iv) => iv.status === INTERVIEW_STATUS.SCHEDULED;

/** Interviews for this company, on the delayed day, that now start before the new arrival window. */
export function affectedByCompanyDelay(interviews, { companyId, day, newWindowStartMin }) {
  return interviews.filter(
    (iv) => ACTIVE(iv) && iv.companyId === companyId && iv.day === day && toMinutes(iv.startTime) < newWindowStartMin
  );
}

/** Interviews currently assigned to the dropped panel. */
export function affectedByPanelDrop(interviews, { panelId }) {
  return interviews.filter((iv) => ACTIVE(iv) && iv.panelId === panelId);
}

/** A withdrawn student's not-yet-completed interviews (cancelled, not rescheduled). */
export function affectedByStudentWithdrawal(interviews, { studentId }) {
  return interviews.filter((iv) => ACTIVE(iv) && iv.studentId === studentId);
}

/** Interviews in the given room whose time overlaps the outage window on that day. */
export function affectedByRoomUnavailable(interviews, { roomId, day, fromMin, toMin }) {
  return interviews.filter(
    (iv) =>
      ACTIVE(iv) &&
      iv.roomId === roomId &&
      iv.day === day &&
      isOverlapping(toMinutes(iv.startTime), toMinutes(iv.endTime), fromMin, toMin)
  );
}
