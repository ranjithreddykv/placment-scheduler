import { describe, it, expect } from 'vitest';
import { generateSchedule } from '../src/services/scheduler/generateSchedule.js';
import { calculateScheduleMetrics } from '../src/services/scheduler/calculateMetrics.js';
import { toMinutes } from '../src/utils/timeUtils.js';
import { INTERVIEW_STATUS } from '../src/config/constants.js';

function makeCompany(overrides = {}) {
  return {
    companyId: 'C1',
    name: 'NovaTech',
    cgpaCutoff: 7,
    priorityTier: 'TIER_1',
    interviewDuration: 30,
    panels: [{ panelId: 'C1-P1', companyId: 'C1', status: 'AVAILABLE' }],
    operatingSlots: [{ day: 1, startTime: '09:00', endTime: '18:00' }],
    arrivalDelay: 0,
    delayedDay: null,
    status: 'SCHEDULED',
    ...overrides,
  };
}

function makeRoom(overrides = {}) {
  return {
    roomId: 'R1',
    name: 'Room 1',
    status: 'AVAILABLE',
    unavailableFrom: null,
    unavailableTo: null,
    unavailableDay: null,
    ...overrides,
  };
}

function makeStudent(id, overrides = {}) {
  return {
    studentId: id,
    name: id,
    cgpa: 8,
    status: 'ACTIVE',
    shortlistedCompanies: [{ companyId: 'C1' }],
    ...overrides,
  };
}

describe('generateSchedule — hard constraints', () => {
  it('never double-books a student, room, or panel', () => {
    // 5 students, 1 room, 1 panel -> forces sequential scheduling, never overlap
    const students = ['S1', 'S2', 'S3', 'S4', 'S5'].map((id) => makeStudent(id));
    const companies = [makeCompany()];
    const rooms = [makeRoom()];

    const interviews = generateSchedule({ students, companies, rooms });
    const scheduled = interviews.filter((i) => i.status === INTERVIEW_STATUS.SCHEDULED);

    expect(scheduled.length).toBe(5);

    const sorted = [...scheduled].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    for (let i = 1; i < sorted.length; i += 1) {
      expect(toMinutes(sorted[i].startTime)).toBeGreaterThanOrEqual(toMinutes(sorted[i - 1].endTime));
      expect(sorted[i].roomId).toBe(sorted[i - 1].roomId); // only one room exists
      expect(sorted[i].panelId).toBe(sorted[i - 1].panelId);
    }
  });

  it('respects company arrival delay — no interview starts before the delayed window', () => {
    const students = ['S1', 'S2'].map((id) => makeStudent(id));
    const companies = [makeCompany({ arrivalDelay: 120, delayedDay: 1 })]; // 2 hours late
    const rooms = [makeRoom(), makeRoom({ roomId: 'R2', name: 'Room 2' })];

    const interviews = generateSchedule({ students, companies, rooms });
    const scheduled = interviews.filter((i) => i.status === INTERVIEW_STATUS.SCHEDULED);

    expect(scheduled.length).toBeGreaterThan(0);
    for (const iv of scheduled) {
      expect(toMinutes(iv.startTime)).toBeGreaterThanOrEqual(toMinutes('11:00'));
    }
  });

  it('never schedules a dropped panel', () => {
    const students = ['S1'].map((id) => makeStudent(id));
    const companies = [
      makeCompany({
        panels: [
          { panelId: 'C1-P1', companyId: 'C1', status: 'DROPPED' },
          { panelId: 'C1-P2', companyId: 'C1', status: 'AVAILABLE' },
        ],
      }),
    ];
    const rooms = [makeRoom()];

    const interviews = generateSchedule({ students, companies, rooms });
    for (const iv of interviews) {
      expect(iv.panelId).not.toBe('C1-P1');
    }
  });

  it('never schedules an unavailable room', () => {
    const students = ['S1'].map((id) => makeStudent(id));
    const companies = [makeCompany()];
    const rooms = [makeRoom({ status: 'UNAVAILABLE', unavailableDay: 1 })];

    const interviews = generateSchedule({ students, companies, rooms });
    const scheduled = interviews.filter((i) => i.status === INTERVIEW_STATUS.SCHEDULED);
    expect(scheduled.length).toBe(0);
    expect(interviews[0].status).toBe(INTERVIEW_STATUS.UNSCHEDULED);
    expect(interviews[0].unscheduledReason).toBeTruthy();
  });

  it('withdrawn students never receive interviews', () => {
    const students = [makeStudent('S1', { status: 'WITHDRAWN' }), makeStudent('S2')];
    const companies = [makeCompany()];
    const rooms = [makeRoom()];

    const interviews = generateSchedule({ students, companies, rooms });
    expect(interviews.find((i) => i.studentId === 'S1')).toBeUndefined();
    expect(interviews.find((i) => i.studentId === 'S2')).toBeDefined();
  });

  it('reports a reason for every unscheduled interview (never silently dropped)', () => {
    // 1 tiny operating window, many students -> guaranteed overflow
    const students = Array.from({ length: 10 }, (_, i) => makeStudent(`S${i}`));
    const companies = [makeCompany({ operatingSlots: [{ day: 1, startTime: '09:00', endTime: '09:30' }] })];
    const rooms = [makeRoom()];

    const interviews = generateSchedule({ students, companies, rooms });
    const unscheduled = interviews.filter((i) => i.status === INTERVIEW_STATUS.UNSCHEDULED);

    expect(unscheduled.length).toBeGreaterThan(0);
    for (const iv of unscheduled) {
      expect(iv.unscheduledReason).toBeTruthy();
    }
    expect(interviews.length).toBe(10); // nothing silently discarded
  });
});

describe('calculateScheduleMetrics', () => {
  it('computes scheduling rate and utilisation from real data, not hardcoded', () => {
    const students = ['S1', 'S2', 'S3'].map((id) => makeStudent(id));
    const companies = [makeCompany()];
    const rooms = [makeRoom()];

    const interviews = generateSchedule({ students, companies, rooms });
    const metrics = calculateScheduleMetrics({ interviews, companies, rooms });

    expect(metrics.totalInterviews).toBe(3);
    expect(metrics.scheduledCount).toBe(3);
    expect(metrics.schedulingRate).toBe(100);
    expect(metrics.roomUtilisation).toBeGreaterThan(0);
    expect(metrics.studentConflicts).toBe(0);
  });
});
