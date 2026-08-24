import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

import Student from '../src/models/Student.js';
import Company from '../src/models/Company.js';
import Room from '../src/models/Room.js';
import Interview from '../src/models/Interview.js';
import ScheduleVersion from '../src/models/ScheduleVersion.js';

import { generateAndPersistDataset } from '../src/services/generator/persistDataset.js';
import { generateAndPersistSchedule } from '../src/services/scheduler/persistSchedule.js';
import {
  replanCompanyDelay,
  replanPanelDrop,
  replanStudentWithdrawal,
  replanRoomUnavailable,
} from '../src/services/replanner/replanService.js';

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongod.getUri());
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('end-to-end: dataset -> schedule -> replans (real MongoDB + transactions)', () => {
  it('generates a dataset with the requested scale', async () => {
    const stats = await generateAndPersistDataset({ studentCount: 120, companyCount: 10, roomCount: 6, seed: 7 });
    expect(stats.studentCount).toBe(120);
    expect(stats.companyCount).toBe(10);
    expect(await Student.countDocuments()).toBe(120);
    expect(await Company.countDocuments()).toBe(10);
    expect(await Room.countDocuments()).toBe(6);
  });

  it('generates an initial schedule with metrics and every unscheduled interview carries a reason', async () => {
    const { metrics } = await generateAndPersistSchedule();
    expect(metrics.totalInterviews).toBeGreaterThan(0);
    expect(metrics.schedulingRate).toBeGreaterThanOrEqual(0);

    const version1 = await ScheduleVersion.findOne({ version: 1 }).lean();
    expect(version1.trigger).toBe('INITIAL_SCHEDULE');

    const unscheduled = await Interview.find({ status: 'UNSCHEDULED' }).lean();
    for (const iv of unscheduled) {
      expect(iv.unscheduledReason).toBeTruthy();
    }
  });

  it('replans a company delay, freezing unaffected interviews and leaving a version-history trail', async () => {
    const company = await Company.findOne({ 'panels.0': { $exists: true } }).lean();
    const day = company.operatingSlots[0].day;

    const beforeSnapshot = await Interview.find({ status: 'SCHEDULED' }).lean();
    const untouchedCandidate = beforeSnapshot.find((iv) => iv.companyId !== company.companyId);

    const { diff, metrics } = await replanCompanyDelay({ companyId: company.companyId, delayMinutes: 120, day });

    expect(diff.trigger).toBe('COMPANY_DELAY');
    expect(metrics.totalInterviews).toBeGreaterThan(0);

    const updatedCompany = await Company.findOne({ companyId: company.companyId }).lean();
    expect(updatedCompany.arrivalDelay).toBe(120);
    expect(updatedCompany.status).toBe('DELAYED');

    if (untouchedCandidate) {
      const stillThere = await Interview.findOne({ interviewId: untouchedCandidate.interviewId }).lean();
      expect(stillThere.startTime).toBe(untouchedCandidate.startTime);
      expect(stillThere.roomId).toBe(untouchedCandidate.roomId);
    }

    const versions = await ScheduleVersion.find().sort({ version: 1 }).lean();
    expect(versions.map((v) => v.version)).toEqual([1, 2]);
  });

  it('replans a panel drop and never re-assigns the dropped panel', async () => {
    const company = await Company.findOne({ 'panels.1': { $exists: true } }).lean(); // needs >=2 panels to have somewhere to move to
    const panelId = company.panels[0].panelId;

    await replanPanelDrop({ companyId: company.companyId, panelId });

    const stillAssigned = await Interview.countDocuments({ panelId, status: 'SCHEDULED' });
    expect(stillAssigned).toBe(0);

    const updatedCompany = await Company.findOne({ companyId: company.companyId }).lean();
    expect(updatedCompany.panels.find((p) => p.panelId === panelId).status).toBe('DROPPED');
  });

  it('withdrawing a student cancels their scheduled interviews and marks them withdrawn', async () => {
    const withScheduled = await Interview.findOne({ status: 'SCHEDULED' }).lean();
    const studentId = withScheduled.studentId;

    await replanStudentWithdrawal({ studentId });

    const student = await Student.findOne({ studentId }).lean();
    expect(student.status).toBe('WITHDRAWN');

    const remaining = await Interview.find({ studentId }).lean();
    for (const iv of remaining) {
      expect(iv.status).not.toBe('SCHEDULED');
    }
  });

  it('marking a room unavailable moves or unschedules only interviews that overlap the outage', async () => {
    const roomWithBooking = await Interview.findOne({ status: 'SCHEDULED' }).lean();
    const roomId = roomWithBooking.roomId;
    const day = roomWithBooking.day;

    await replanRoomUnavailable({ roomId, day, fromTime: '00:00', toTime: '23:45' }); // whole day outage

    const stillInRoom = await Interview.countDocuments({ roomId, day, status: 'SCHEDULED' });
    expect(stillInRoom).toBe(0);

    const room = await Room.findOne({ roomId }).lean();
    expect(room.status).toBe('UNAVAILABLE');
  });
});
