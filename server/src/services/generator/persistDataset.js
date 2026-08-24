import Student from '../../models/Student.js';
import Company from '../../models/Company.js';
import Room from '../../models/Room.js';
import Interview from '../../models/Interview.js';
import ScheduleVersion from '../../models/ScheduleVersion.js';
import { buildDataset } from './buildDataset.js';

/**
 * Generates a fresh demo dataset and replaces everything in the database
 * with it. A new dataset invalidates any existing schedule, so interviews
 * and schedule history are cleared too — the coordinator must re-run
 * "Generate Schedule" afterwards.
 */
export async function generateAndPersistDataset(overrides = {}) {
  const { students, companies, rooms, stats } = buildDataset(overrides);

  await Promise.all([
    Student.deleteMany({}),
    Company.deleteMany({}),
    Room.deleteMany({}),
    Interview.deleteMany({}),
    ScheduleVersion.deleteMany({}),
  ]);

  await Promise.all([Student.insertMany(students), Company.insertMany(companies), Room.insertMany(rooms)]);

  return stats;
}
