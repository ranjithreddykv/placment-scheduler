import { NavLink } from 'react-router-dom';
import { CalendarClock, History as HistoryIcon, RefreshCw } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { formatDistanceToNow } from 'date-fns';

export default function Header() {
  const { datasetReady, scheduleReady, lastReplannedAt, refreshAll, loading } = useData();

  const status = !datasetReady ? 'No dataset' : !scheduleReady ? 'Dataset ready — no schedule' : 'Live';
  const statusColor = !datasetReady ? 'bg-slate-400' : !scheduleReady ? 'bg-amber-400' : 'bg-emerald-500';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900">
            <CalendarClock size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight text-slate-900">Placement Week Scheduler</h1>
            <p className="text-xs text-slate-500">Mirai Labs · Coordinator Console</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-sm">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `rounded-md px-3 py-1.5 font-medium ${isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/history"
            className={({ isActive }) => `flex items-center gap-1 rounded-md px-3 py-1.5 font-medium ${isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <HistoryIcon size={14} /> History
          </NavLink>
        </nav>

        <div className="flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${statusColor}`} />
            <span>{status}</span>
          </div>
          <div>{lastReplannedAt ? `Last replanned ${formatDistanceToNow(lastReplannedAt, { addSuffix: true })}` : 'Not replanned yet'}</div>
          <button
            onClick={refreshAll}
            disabled={loading}
            className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>
    </header>
  );
}
