import { describe, it, expect } from 'vitest';
import {
  affectedByCompanyDelay,
  affectedByPanelDrop,
  affectedByStudentWithdrawal,
  affectedByRoomUnavailable,
} from '../src/services/replanner/detectAffectedInterviews.js';
import { freezeUnaffected } from '../src/services/replanner/freezeUnaffected.js';
import { rescheduleAffected, toPreferredSlot } from '../src/services/replanner/rescheduleAffected.js';
import { generateDiff } from '../src/services/replanner/generateDiff.js';
import { toMinutes } from '../src/utils/timeUtils.js';

function iv(overrides) {
  return {
    interviewId: 'I1',
    studentId: 'S1',
    companyId: 'C1',
    day: 1,
    startTime: '10:00',
    endTime: '10:30',
    roomId: 'R1',
    panelId: 'C1-P1',
    status: 'SCHEDULED',
    unscheduledReason: null,
    ...overrides,
  };
}

describe('detectAffectedInterviews', () => {
  it('company delay only flags interviews starting before the new arrival window, same company/day', () => {
    const interviews = [
      iv({ interviewId: 'I1', startTime: '10:00', endTime: '10:30' }), // before delay -> affected
      iv({ interviewId: 'I2', startTime: '12:30', endTime: '13:00' }), // after delay -> unaffected
      iv({ interviewId: 'I3', companyId: 'C2', startTime: '10:00', endTime: '10:30' }), // other company
      iv({ interviewId: 'I4', day: 2, startTime: '10:00', endTime: '10:30' }), // other day
    ];
    const affected = affectedByCompanyDelay(interviews, { companyId: 'C1', day: 1, newWindowStartMin: toMinutes('11:00') });
    expect(affected.map((i) => i.interviewId)).toEqual(['I1']);
  });

  it('panel drop flags only interviews on that exact panel', () => {
    const interviews = [iv({ interviewId: 'I1', panelId: 'C1-P1' }), iv({ interviewId: 'I2', panelId: 'C1-P2' })];
    const affected = affectedByPanelDrop(interviews, { panelId: 'C1-P1' });
    expect(affected.map((i) => i.interviewId)).toEqual(['I1']);
  });

  it('student withdrawal flags all of that student’s scheduled interviews, not other students’', () => {
    const interviews = [iv({ interviewId: 'I1', studentId: 'S1' }), iv({ interviewId: 'I2', studentId: 'S2' })];
    const affected = affectedByStudentWithdrawal(interviews, { studentId: 'S1' });
    expect(affected.map((i) => i.interviewId)).toEqual(['I1']);
  });

  it('room outage flags only interviews overlapping the outage window, same room/day', () => {
    const interviews = [
      iv({ interviewId: 'I1', roomId: 'R12', startTime: '11:30', endTime: '12:00' }), // overlaps 11-15
      iv({ interviewId: 'I2', roomId: 'R12', startTime: '15:30', endTime: '16:00' }), // after outage
      iv({ interviewId: 'I3', roomId: 'R5', startTime: '11:30', endTime: '12:00' }), // other room
    ];
    const affected = affectedByRoomUnavailable(interviews, { roomId: 'R12', day: 1, fromMin: toMinutes('11:00'), toMin: toMinutes('15:00') });
    expect(affected.map((i) => i.interviewId)).toEqual(['I1']);
  });
});

describe('freezeUnaffected + rescheduleAffected — minimal disruption', () => {
  it('never touches frozen interviews, and books affected ones without colliding with frozen bookings', () => {
    const frozenInterview = iv({ interviewId: 'I-FROZEN', studentId: 'S-frozen', roomId: 'R1', panelId: 'C1-P2', startTime: '10:00', endTime: '10:30' });
    const affectedInterview = iv({ interviewId: 'I-AFFECTED', studentId: 'S-affected', roomId: 'R2', panelId: 'C1-P1', startTime: '09:00', endTime: '09:30' });

    const all = [frozenInterview, affectedInterview];
    const { frozen, state } = freezeUnaffected(all, [affectedInterview]);

    expect(frozen).toEqual([frozenInterview]); // untouched, byte-for-byte

    const company = {
      companyId: 'C1',
      cgpaCutoff: 6,
      priorityTier: 'TIER_1',
      interviewDuration: 30,
      panels: [
        { panelId: 'C1-P1', status: 'AVAILABLE' },
        { panelId: 'C1-P2', status: 'AVAILABLE' },
      ],
      operatingSlots: [{ day: 1, startTime: '09:00', endTime: '18:00' }],
      arrivalDelay: 0,
      delayedDay: null,
    };
    const rooms = [
      { roomId: 'R1', status: 'AVAILABLE' },
      { roomId: 'R2', status: 'AVAILABLE' },
    ];
    const studentsById = new Map([['S-affected', { studentId: 'S-affected', status: 'ACTIVE' }]]);
    const companiesById = new Map([['C1', company]]);

    const results = rescheduleAffected({
      affected: [affectedInterview],
      studentsById,
      companiesById,
      rooms,
      state,
      buildPreferred: () => null,
    });

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('SCHEDULED');
    // Must not collide with the frozen booking (R1 @ 10:00-10:30, panel C1-P2 @ 10:00-10:30)
    const conflictsWithFrozenRoom = results[0].roomId === 'R1' && results[0].startTime === '10:00';
    expect(conflictsWithFrozenRoom).toBe(false);
  });
});

describe('generateDiff', () => {
  it('reports moved interviews and leaves unaffected ones out of the change list', () => {
    const before = [
      iv({ interviewId: 'I1', startTime: '10:00', endTime: '10:30', roomId: 'R1' }),
      iv({ interviewId: 'I2', studentId: 'S2', startTime: '11:00', endTime: '11:30', roomId: 'R3' }),
    ];
    const after = [
      iv({ interviewId: 'I1', startTime: '12:00', endTime: '12:30', roomId: 'R7' }), // moved
      iv({ interviewId: 'I2', studentId: 'S2', startTime: '11:00', endTime: '11:30', roomId: 'R3' }), // unchanged
    ];
    const studentsById = new Map([
      ['S1', { studentId: 'S1', name: 'Rahul Sharma' }],
      ['S2', { studentId: 'S2', name: 'Ananya Rao' }],
    ]);
    const companiesById = new Map([['C1', { companyId: 'C1', name: 'NovaTech', priorityTier: 'TIER_1' }]]);

    const diff = generateDiff({
      trigger: 'COMPANY_DELAY',
      triggerDescription: 'NovaTech delayed 2h',
      allBefore: before,
      allAfter: after,
      affectedIds: new Set(['I1']),
      studentsById,
      companiesById,
    });

    expect(diff.changes).toHaveLength(1);
    expect(diff.changes[0].interviewId).toBe('I1');
    expect(diff.changes[0].changeType).toBe('MOVED');
    expect(diff.summary.moved).toBe(1);
    expect(diff.summary.unchanged).toBe(1); // I2 never appears in changes
  });
});

describe('toPreferredSlot', () => {
  it('converts stored HH:mm assignment into minute-based preferred slot', () => {
    const preferred = toPreferredSlot(iv({ startTime: '09:15', endTime: '09:45' }));
    expect(preferred).toEqual({ day: 1, start: toMinutes('09:15'), end: toMinutes('09:45'), roomId: 'R1', panelId: 'C1-P1' });
  });
});
