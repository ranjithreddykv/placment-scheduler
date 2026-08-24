import { useMemo, useState } from 'react';
import { Database, CalendarPlus, Sparkles } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import KPICards from '../components/KPICards.jsx';
import ScheduleGrid from '../components/ScheduleGrid.jsx';
import ConflictPanel from '../components/ConflictPanel.jsx';
import UnscheduledPanel from '../components/UnscheduledPanel.jsx';
import DisruptionSimulator from '../components/DisruptionSimulator.jsx';
import ReplanResultModal from '../components/ReplanResultModal.jsx';
import InterviewDetailModal from '../components/InterviewDetailModal.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Spinner from '../components/ui/Spinner.jsx';

const DAYS = [1, 2, 3, 4];

export default function Dashboard() {
  const { datasetReady, scheduleReady, loading, busy, metrics, interviews, rooms, companies, studentsById, companiesById, generateDataset, generateSchedule } = useData();

  const [replanResult, setReplanResult] = useState(null);
  const [selectedInterview, setSelectedInterview] = useState(null);

  const conflictCount = useMemo(() => {
    let count = 0;
    for (const c of companies) count += c.panels.filter((p) => p.status === 'DROPPED').length;
    for (const r of rooms) if (r.status === 'UNAVAILABLE') count += 1;
    for (const c of companies) if (c.status === 'DELAYED') count += 1;
    return count;
  }, [companies, rooms]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={24} className="text-slate-400" />
      </div>
    );
  }

  if (!datasetReady) {
    return (
      <Card className="mt-8">
        <EmptyState
          icon={Database}
          title="No dataset yet"
          description="Generate a realistic placement-week dataset — 35 companies, 800 students, 20 rooms — to get started."
          action={
            <button
              onClick={generateDataset}
              disabled={busy}
              className="flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {busy ? <Spinner size={15} className="text-white" /> : <Sparkles size={15} />}
              Generate Demo Dataset
            </button>
          }
        />
      </Card>
    );
  }

  if (!scheduleReady) {
    return (
      <Card className="mt-8">
        <EmptyState
          icon={CalendarPlus}
          title="Dataset ready — generate a schedule"
          description="Run the constraint-aware scheduler over the current dataset to place interviews."
          action={
            <button
              onClick={generateSchedule}
              disabled={busy}
              className="flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {busy ? <Spinner size={15} className="text-white" /> : <CalendarPlus size={15} />}
              Generate Schedule
            </button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <KPICards metrics={metrics} conflictCount={conflictCount} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card title="Schedule Grid">
            <ScheduleGrid
              interviews={interviews}
              rooms={rooms}
              days={DAYS}
              studentsById={studentsById}
              companiesById={companiesById}
              onSelectInterview={setSelectedInterview}
            />
          </Card>

          <Card title="Unscheduled Interviews">
            <UnscheduledPanel interviews={interviews} studentsById={studentsById} companiesById={companiesById} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Upcoming Conflicts">
            <ConflictPanel companies={companies} rooms={rooms} interviews={interviews} studentsById={studentsById} />
          </Card>

          <Card title="Disruption Simulator">
            <DisruptionSimulator onResult={setReplanResult} />
          </Card>

          <Card
            title="Dataset Tools"
            bodyClassName="p-4 space-y-2"
          >
            <button
              onClick={() => window.confirm('Regenerate the dataset? This replaces all students, companies, rooms and wipes the current schedule.') && generateDataset()}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Database size={14} /> Regenerate Dataset
            </button>
            <button
              onClick={() => window.confirm('Regenerate the schedule from scratch? This discards all replan history and manual disruptions applied so far.') && generateSchedule()}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <CalendarPlus size={14} /> Regenerate Schedule
            </button>
          </Card>
        </div>
      </div>

      <ReplanResultModal result={replanResult} onClose={() => setReplanResult(null)} />
      <InterviewDetailModal
        interview={selectedInterview}
        student={selectedInterview && studentsById.get(selectedInterview.studentId)}
        company={selectedInterview && companiesById.get(selectedInterview.companyId)}
        onClose={() => setSelectedInterview(null)}
      />
    </div>
  );
}
