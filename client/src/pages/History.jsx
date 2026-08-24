import { useEffect, useState } from 'react';
import { History as HistoryIcon } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { scheduleApi } from '../services/api.js';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { TRIGGER_LABELS, DISRUPTION_STYLES } from '../utils/format.js';
import { format } from 'date-fns';

export default function History() {
  const { history, loading } = useData();
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [versionDetail, setVersionDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (history.length > 0 && selectedVersion == null) {
      setSelectedVersion(history[0].version);
    }
  }, [history, selectedVersion]);

  useEffect(() => {
    if (selectedVersion == null) return;
    setDetailLoading(true);
    scheduleApi
      .historyVersion(selectedVersion)
      .then(setVersionDetail)
      .finally(() => setDetailLoading(false));
  }, [selectedVersion]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={24} className="text-slate-400" />
      </div>
    );
  }

  if (history.length === 0) {
    return <EmptyState icon={HistoryIcon} title="No schedule history yet" description="Generate a schedule from the Dashboard to start building version history." />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      <Card title="Versions" bodyClassName="p-2">
        <div className="space-y-1">
          {history.map((v) => (
            <button
              key={v.version}
              onClick={() => setSelectedVersion(v.version)}
              className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${selectedVersion === v.version ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">Version {v.version}</span>
                <Badge className={selectedVersion === v.version ? 'border-white/30 bg-white/10 text-white' : DISRUPTION_STYLES[v.summary?.disruptionLevel || 'NONE']}>
                  {v.summary?.disruptionLevel || 'NONE'}
                </Badge>
              </div>
              <p className={`mt-0.5 text-xs ${selectedVersion === v.version ? 'text-slate-300' : 'text-slate-500'}`}>{TRIGGER_LABELS[v.trigger]}</p>
              <p className={`mt-0.5 truncate text-xs ${selectedVersion === v.version ? 'text-slate-400' : 'text-slate-400'}`}>{v.triggerDescription}</p>
              <p className={`mt-1 text-[11px] ${selectedVersion === v.version ? 'text-slate-400' : 'text-slate-400'}`}>{format(new Date(v.createdAt), 'MMM d, HH:mm:ss')}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card title={versionDetail ? `Version ${versionDetail.version} — ${TRIGGER_LABELS[versionDetail.trigger]}` : 'Version detail'}>
        {detailLoading || !versionDetail ? (
          <div className="flex justify-center py-10">
            <Spinner size={20} className="text-slate-400" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{versionDetail.triggerDescription}</p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MetricTile label="Scheduling Rate" value={`${versionDetail.metrics.schedulingRate}%`} />
              <MetricTile label="Room Utilisation" value={`${versionDetail.metrics.roomUtilisation}%`} />
              <MetricTile label="Panel Utilisation" value={`${versionDetail.metrics.panelUtilisation}%`} />
              <MetricTile label="Avg Waiting" value={`${versionDetail.metrics.avgStudentWaitingMinutes}m`} />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <MetricTile label="Unchanged" value={versionDetail.summary.unchanged} />
              <MetricTile label="Moved" value={versionDetail.summary.moved} />
              <MetricTile label="Students Affected" value={versionDetail.summary.studentsAffected} />
              <MetricTile label="Rooms Changed" value={versionDetail.summary.roomsChanged} />
              <MetricTile label="Panels Changed" value={versionDetail.summary.panelsChanged} />
              <MetricTile label="Newly Unscheduled" value={versionDetail.summary.newlyUnscheduled} tone={versionDetail.summary.newlyUnscheduled > 0 ? 'red' : 'slate'} />
              <MetricTile label="Replan Churn" value={`${versionDetail.summary.replanChurnPercent ?? 0}%`} />
            </div>

            {versionDetail.changes.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">Changes in this version ({versionDetail.changes.length})</h3>
                <div className="scrollbar-thin max-h-72 space-y-1.5 overflow-y-auto">
                  {versionDetail.changes.map((c) => (
                    <div key={c.interviewId} className="rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-600">
                      <span className="font-medium text-slate-800">{c.studentName || c.studentId}</span> × {c.companyName || c.companyId} —{' '}
                      <span className="text-slate-500">{c.changeType}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function MetricTile({ label, value, tone = 'slate' }) {
  const toneClass = { slate: 'text-slate-900', red: 'text-red-600' }[tone];
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2 text-center">
      <p className={`text-base font-semibold ${toneClass}`}>{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}
