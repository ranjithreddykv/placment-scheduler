export const STATUS_STYLES = {
  SCHEDULED: 'bg-blue-50 text-blue-700 border-blue-200',
  COMPLETED: 'bg-slate-100 text-slate-600 border-slate-200',
  UNSCHEDULED: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200 line-through',
  DELAYED: 'bg-amber-50 text-amber-700 border-amber-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  WITHDRAWN: 'bg-slate-100 text-slate-500 border-slate-200',
  AVAILABLE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  UNAVAILABLE: 'bg-red-50 text-red-700 border-red-200',
  DROPPED: 'bg-red-50 text-red-700 border-red-200',
};

export const TIER_STYLES = {
  TIER_1: 'bg-violet-50 text-violet-700 border-violet-200',
  TIER_2: 'bg-sky-50 text-sky-700 border-sky-200',
  TIER_3: 'bg-slate-50 text-slate-600 border-slate-200',
};

export const TIER_LABELS = { TIER_1: 'Tier 1', TIER_2: 'Tier 2', TIER_3: 'Tier 3' };

export const REASON_LABELS = {
  NO_ROOM_AVAILABLE: 'No room/panel combination available',
  NO_PANEL_AVAILABLE: 'No panel available',
  STUDENT_CONFLICT: 'Student had a scheduling conflict',
  COMPANY_WINDOW_EXHAUSTED: "Company's operating window was exhausted",
  COMPANY_DELAY: 'Company arrival delay left no feasible slot',
  STUDENT_WITHDRAWN: 'Student withdrew',
  NO_FEASIBLE_SLOT: 'No feasible slot found',
};

export const DISRUPTION_STYLES = {
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  HIGH: 'bg-red-50 text-red-700 border-red-200',
  NONE: 'bg-slate-50 text-slate-500 border-slate-200',
};

export const TRIGGER_LABELS = {
  INITIAL_SCHEDULE: 'Initial Schedule',
  COMPANY_DELAY: 'Company Delay',
  PANEL_DROPPED: 'Panel Dropped',
  STUDENT_WITHDRAWAL: 'Student Withdrawal',
  ROOM_UNAVAILABLE: 'Room Unavailable',
};

export function formatMinutes(minutes) {
  if (minutes == null) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function formatSlot(iv) {
  if (!iv.day || !iv.startTime) return 'Unscheduled';
  return `Day ${iv.day} · ${iv.startTime} - ${iv.endTime}`;
}

export function initials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
