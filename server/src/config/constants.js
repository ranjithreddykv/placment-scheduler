// Central place for the scheduling "rules of the world". Changing placement
// week shape (days, hours, slot size) only requires editing this file.

export const PLACEMENT_DAYS = [1, 2, 3, 4]; // Day 1..Day 4

export const DAY_START = '09:00';
export const DAY_END = '18:00';
export const LUNCH_START = '13:00';
export const LUNCH_END = '14:00';

// All interview start times are aligned to this grid.
export const SLOT_GRANULARITY_MINUTES = 15;

export const BRANCHES = ['ISE', 'CSE', 'ECE', 'EEE', 'ME', 'CIVIL', 'AIML'];

export const PRIORITY_TIERS = ['TIER_1', 'TIER_2', 'TIER_3'];

export const PRIORITY_WEIGHT = {
  TIER_1: 3,
  TIER_2: 2,
  TIER_3: 1,
};

export const INTERVIEW_DURATIONS = [20, 30, 45, 60];

export const COMPANY_CATEGORIES = [
  'Mass Recruiter',
  'Product Company',
  'FinTech',
  'Startup',
  'Consulting',
  'Core Engineering',
  'IT Services',
];

export const STUDENT_STATUS = { ACTIVE: 'ACTIVE', WITHDRAWN: 'WITHDRAWN' };

export const COMPANY_STATUS = {
  SCHEDULED: 'SCHEDULED',
  DELAYED: 'DELAYED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export const PANEL_STATUS = { AVAILABLE: 'AVAILABLE', DROPPED: 'DROPPED' };

export const ROOM_STATUS = { AVAILABLE: 'AVAILABLE', UNAVAILABLE: 'UNAVAILABLE' };

export const INTERVIEW_STATUS = {
  SCHEDULED: 'SCHEDULED',
  UNSCHEDULED: 'UNSCHEDULED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export const UNSCHEDULED_REASON = {
  NO_ROOM_AVAILABLE: 'NO_ROOM_AVAILABLE',
  NO_PANEL_AVAILABLE: 'NO_PANEL_AVAILABLE',
  STUDENT_CONFLICT: 'STUDENT_CONFLICT',
  COMPANY_WINDOW_EXHAUSTED: 'COMPANY_WINDOW_EXHAUSTED',
  COMPANY_DELAY: 'COMPANY_DELAY',
  STUDENT_WITHDRAWN: 'STUDENT_WITHDRAWN',
  NO_FEASIBLE_SLOT: 'NO_FEASIBLE_SLOT',
};

export const REPLAN_TRIGGER = {
  INITIAL_SCHEDULE: 'INITIAL_SCHEDULE',
  COMPANY_DELAY: 'COMPANY_DELAY',
  PANEL_DROPPED: 'PANEL_DROPPED',
  STUDENT_WITHDRAWAL: 'STUDENT_WITHDRAWAL',
  ROOM_UNAVAILABLE: 'ROOM_UNAVAILABLE',
};
