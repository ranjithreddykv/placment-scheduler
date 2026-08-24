import Modal from './ui/Modal.jsx';
import Badge from './ui/Badge.jsx';
import { DISRUPTION_STYLES } from '../utils/format.js';
import { CheckCircle2, ArrowRight, Bell } from 'lucide-react';

const CHANGE_STYLES = {
  MOVED: 'bg-amber-50 text-amber-700 border-amber-200',
  UNSCHEDULED: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
  SCHEDULED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function slotText(v) {
  if (!v || !v.day) return 'Unscheduled';
  return `Day ${v.day} · ${v.startTime}-${v.endTime} · ${v.roomId} · ${v.panelId}`;
}

export default function ReplanResultModal({ result, onClose }) {
  if (!result) return null;
  const { triggerDescription, summary, changes } = result;

  return (
    <Modal open={!!result} onClose={onClose} title="Schedule Replanned" width="max-w-3xl">
      <div className="mb-4 flex items-start gap-3 rounded-lg bg-emerald-50 p-3">
        <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />
        <div>
          <p className="text-sm font-medium text-emerald-900">Replan applied successfully</p>
          <p className="text-sm text-emerald-700">{triggerDescription}</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Unchanged" value={summary.unchanged} />
        <Stat label="Moved" value={summary.moved} />
        <Stat label="Students Affected" value={summary.studentsAffected} />
        <Stat label="Newly Unscheduled" value={summary.newlyUnscheduled} tone={summary.newlyUnscheduled > 0 ? 'red' : 'slate'} />
      </div>

      <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
        <span className="text-sm text-slate-600">Schedule disruption</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">Replan churn: {summary.replanChurnPercent}%</span>
          <Badge className={DISRUPTION_STYLES[summary.disruptionLevel]}>{summary.disruptionLevel}</Badge>
        </div>
      </div>

      <h3 className="mb-2 text-sm font-semibold text-slate-800">Change Diff ({changes.length})</h3>
      <div className="scrollbar-thin max-h-80 space-y-2 overflow-y-auto">
        {changes.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No interviews needed to change.</p>}
        {changes.map((c) => (
          <div key={c.interviewId} className="rounded-lg border border-slate-200 p-3 text-sm">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-medium text-slate-800">
                {c.studentName || c.studentId} <span className="text-slate-400">×</span> {c.companyName || c.companyId}
              </span>
              <Badge className={CHANGE_STYLES[c.changeType]}>{c.changeType}</Badge>
            </div>
            {c.changeType === 'MOVED' ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="line-through">{slotText(c.old)}</span>
                <ArrowRight size={12} />
                <span className="font-medium text-slate-700">{slotText(c.updated)}</span>
              </div>
            ) : (
              <p className="text-xs text-slate-500">{c.reason ? `Reason: ${c.reason}` : slotText(c.old)}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2">
              <Bell size={12} className="text-slate-400" />
              {c.notify.map((n) => (
                <span key={n} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                  {n}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function Stat({ label, value, tone = 'slate' }) {
  const toneClass = { slate: 'text-slate-900', red: 'text-red-600' }[tone];
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2 text-center">
      <p className={`text-lg font-semibold ${toneClass}`}>{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}
