import { generateRequirements } from './generateRequirements.js';
import { sortRequirements } from './sortRequirements.js';
import { findAvailableSlot } from './findAvailableSlot.js';
import { createScheduleState, bookStudent, bookRoom, bookPanel } from '../../utils/availability.js';
import { INTERVIEW_STATUS, STUDENT_STATUS } from '../../config/constants.js';
import { toHHMM } from '../../utils/timeUtils.js';

/**
 * Builds a full interview schedule from scratch.
 *
 * Step 1: generate one requirement per (active student, shortlisted company) pair.
 * Step 2: sort requirements by priority so the hardest-to-place go first.
 * Step 3: greedily place each requirement into the first feasible slot,
 *         booking it into an in-memory ScheduleState as we go so later
 *         placements see earlier ones.
 * Step 4: anything that can't be placed becomes an UNSCHEDULED interview with
 *         a reason — never silently dropped.
 *
 * Returns plain interview objects (not yet saved) ready for bulk insert.
 */
export function generateSchedule({ students, companies, rooms }) {
  const companiesById = new Map(companies.map((c) => [c.companyId, c]));
  const studentsById = new Map(students.map((s) => [s.studentId, s]));

  const requirements = generateRequirements(students, companiesById);

  const studentInterviewCounts = new Map();
  const companyVolume = new Map();
  for (const req of requirements) {
    studentInterviewCounts.set(req.studentId, (studentInterviewCounts.get(req.studentId) || 0) + 1);
    companyVolume.set(req.companyId, (companyVolume.get(req.companyId) || 0) + 1);
  }

  const sorted = sortRequirements(requirements, { companiesById, studentInterviewCounts, companyVolume });

  const state = createScheduleState();
  const interviews = [];
  let counter = 1;

  for (const req of sorted) {
    const student = studentsById.get(req.studentId);
    const company = companiesById.get(req.companyId);

    if (student.status !== STUDENT_STATUS.ACTIVE) continue; // defensive; requirements already filter this

    const result = findAvailableSlot({ student, company, rooms, state });
    const interviewId = `I${String(counter).padStart(5, '0')}`;
    counter += 1;

    if (result.reason) {
      interviews.push({
        interviewId,
        studentId: student.studentId,
        companyId: company.companyId,
        status: INTERVIEW_STATUS.UNSCHEDULED,
        unscheduledReason: result.reason,
      });
      continue;
    }

    const { day, start, end, roomId, panelId } = result;
    bookStudent(state, student.studentId, day, start, end);
    bookRoom(state, roomId, day, start, end);
    bookPanel(state, panelId, day, start, end);

    interviews.push({
      interviewId,
      studentId: student.studentId,
      companyId: company.companyId,
      day,
      startTime: toHHMM(start),
      endTime: toHHMM(end),
      roomId,
      panelId,
      status: INTERVIEW_STATUS.SCHEDULED,
      originalDay: day,
      originalStartTime: toHHMM(start),
      originalEndTime: toHHMM(end),
      originalRoomId: roomId,
      originalPanelId: panelId,
    });
  }

  return interviews;
}
