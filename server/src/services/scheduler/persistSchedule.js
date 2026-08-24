import Student from '../../models/Student.js';
import Company from '../../models/Company.js';
import Room from '../../models/Room.js';
import Interview from '../../models/Interview.js';
import ScheduleVersion from '../../models/ScheduleVersion.js';
import { generateSchedule } from './generateSchedule.js';
import { calculateScheduleMetrics } from './calculateMetrics.js';
import { REPLAN_TRIGGER } from '../../config/constants.js';
import { ApiError } from '../../utils/errorHandler.js';

/**
 * Runs the greedy scheduler over everything currently in the database and
 * replaces the schedule entirely. This is the "from scratch" path — used for
 * the initial schedule, not for replanning (see services/replanner for the
 * minimal-disruption path).
 */
export async function generateAndPersistSchedule() {
  const [students, companies, rooms] = await Promise.all([
    Student.find().lean(),
    Company.find().lean(),
    Room.find().lean(),
  ]);

  if (students.length === 0 || companies.length === 0 || rooms.length === 0) {
    throw new ApiError(400, 'No dataset found. Generate the demo dataset before creating a schedule.');
  }

  const interviews = generateSchedule({ students, companies, rooms });
  const metrics = calculateScheduleMetrics({ interviews, companies, rooms });

  await Interview.deleteMany({});
  await Interview.insertMany(interviews);
  await ScheduleVersion.deleteMany({});
  await ScheduleVersion.create({
    version: 1,
    trigger: REPLAN_TRIGGER.INITIAL_SCHEDULE,
    triggerDescription: 'Initial schedule generated from dataset',
    changes: [],
    metrics,
    summary: {
      unchanged: 0,
      moved: 0,
      studentsAffected: 0,
      roomsChanged: 0,
      panelsChanged: 0,
      newlyUnscheduled: metrics.unscheduledCount,
      replanCost: 0,
      disruptionLevel: 'NONE',
    },
  });

  return { interviews, metrics };
}
