import { ListChecks, CheckCircle2, AlertTriangle, Percent, DoorOpen, Users2, Clock } from 'lucide-react';

function KPI({ icon: Icon, label, value, sub, tone = 'slate' }) {
  const toneClasses = {
    slate: 'bg-slate-50 text-slate-600',
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-xl font-semibold text-slate-900">{value}</p>
        {sub && <p className="truncate text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

export default function KPICards({ metrics, conflictCount }) {
  if (!metrics) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
      <KPI icon={ListChecks} label="Total Interviews" value={metrics.totalInterviews} tone="slate" />
      <KPI icon={CheckCircle2} label="Scheduled" value={metrics.scheduledCount} tone="emerald" />
      <KPI icon={AlertTriangle} label="Unscheduled" value={metrics.unscheduledCount} tone="red" />
      <KPI icon={Percent} label="Schedule %" value={`${metrics.schedulingRate}%`} tone="blue" />
      <KPI icon={AlertTriangle} label="Active Conflicts" value={conflictCount ?? metrics.studentConflicts} tone={conflictCount > 0 ? 'red' : 'slate'} />
      <KPI icon={DoorOpen} label="Room Utilisation" value={`${metrics.roomUtilisation}%`} tone="violet" />
      <KPI icon={Users2} label="Panel Utilisation" value={`${metrics.panelUtilisation}%`} tone="amber" />
    </div>
  );
}
