import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { REASON_LABELS } from '../utils/format.js';

export default function UnscheduledPanel({ interviews, studentsById, companiesById }) {
  const [expanded, setExpanded] = useState(null);

  const unscheduled = useMemo(() => interviews.filter((iv) => iv.status === 'UNSCHEDULED'), [interviews]);

  const byReason = useMemo(() => {
    const map = new Map();
    for (const iv of unscheduled) {
      const reason = iv.unscheduledReason || 'NO_FEASIBLE_SLOT';
      if (!map.has(reason)) map.set(reason, []);
      map.get(reason).push(iv);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [unscheduled]);

  if (unscheduled.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">No unscheduled interviews — every requirement has a home.</p>;
  }

  return (
    <div>
      <p className="mb-3 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">{unscheduled.length}</span> interviews could not be scheduled
      </p>
      <div className="space-y-2">
        {byReason.map(([reason, list]) => (
          <div key={reason} className="rounded-lg border border-slate-200">
            <button
              onClick={() => setExpanded(expanded === reason ? null : reason)}
              className="flex w-full items-center justify-between px-3 py-2 text-left"
            >
              <span className="flex items-center gap-2 text-sm text-slate-700">
                <AlertTriangle size={14} className="text-red-500" />
                {list.length} — {REASON_LABELS[reason] || reason}
              </span>
              {expanded === reason ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
            </button>
            {expanded === reason && (
              <ul className="scrollbar-thin max-h-48 divide-y divide-slate-100 overflow-y-auto border-t border-slate-100">
                {list.map((iv) => {
                  const student = studentsById.get(iv.studentId);
                  const company = companiesById.get(iv.companyId);
                  return (
                    <li key={iv.interviewId} className="flex items-center justify-between px-3 py-1.5 text-xs text-slate-600">
                      <span>{student?.name || iv.studentId}</span>
                      <span className="text-slate-400">{company?.name || iv.companyId}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
