import { useMemo, useState } from 'react';
import { Zap } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import Spinner from './ui/Spinner.jsx';

const TABS = [
  { key: 'companyDelay', label: 'Company Delay' },
  { key: 'panelDrop', label: 'Panel Drop' },
  { key: 'studentWithdraw', label: 'Student Withdrawal' },
  { key: 'roomUnavailable', label: 'Room Unavailable' },
];

export default function DisruptionSimulator({ onResult }) {
  const { companies, rooms, students, busy, runReplan } = useData();
  const [tab, setTab] = useState('companyDelay');

  const [companyId, setCompanyId] = useState('');
  const [delayHours, setDelayHours] = useState(2);
  const [panelId, setPanelId] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [roomId, setRoomId] = useState('');
  const [fromTime, setFromTime] = useState('11:00');
  const [toTime, setToTime] = useState('15:00');
  const [day, setDay] = useState(1);

  const selectedCompany = useMemo(() => companies.find((c) => c.companyId === companyId), [companies, companyId]);
  const matchedStudent = useMemo(
    () => students.find((s) => s.studentId.toLowerCase() === studentQuery.trim().toLowerCase() || s.name.toLowerCase() === studentQuery.trim().toLowerCase()),
    [students, studentQuery]
  );

  const canSubmit =
    (tab === 'companyDelay' && companyId && delayHours > 0) ||
    (tab === 'panelDrop' && companyId && panelId) ||
    (tab === 'studentWithdraw' && matchedStudent) ||
    (tab === 'roomUnavailable' && roomId && fromTime && toTime);

  const confirmationText = () => {
    if (tab === 'companyDelay') return `Delay ${selectedCompany?.name || companyId} by ${delayHours}h on Day ${day} and replan affected interviews?`;
    if (tab === 'panelDrop') return `Drop panel ${panelId} at ${selectedCompany?.name || companyId} and reassign its interviews?`;
    if (tab === 'studentWithdraw') return `Withdraw ${matchedStudent?.name} (${matchedStudent?.studentId}) and cancel their remaining interviews?`;
    if (tab === 'roomUnavailable') return `Mark ${roomId} unavailable ${fromTime}-${toTime} on Day ${day} and relocate affected interviews?`;
    return 'Apply this disruption and replan?';
  };

  const submit = async () => {
    if (!window.confirm(confirmationText())) return;
    let res;
    if (tab === 'companyDelay') {
      res = await runReplan('companyDelay', { companyId, delayMinutes: Math.round(delayHours * 60), day });
    } else if (tab === 'panelDrop') {
      res = await runReplan('panelDrop', { companyId, panelId });
    } else if (tab === 'studentWithdraw') {
      res = await runReplan('studentWithdraw', { studentId: matchedStudent.studentId });
    } else if (tab === 'roomUnavailable') {
      res = await runReplan('roomUnavailable', { roomId, day, fromTime, toTime });
    }
    if (res) onResult(res);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${tab === t.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {tab === 'companyDelay' && (
          <>
            <Field label="Company">
              <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="input">
                <option value="">Select company…</option>
                {companies.map((c) => (
                  <option key={c.companyId} value={c.companyId}>
                    {c.name} ({c.priorityTier})
                  </option>
                ))}
              </select>
            </Field>
            {selectedCompany && (
              <Field label="Day">
                <select value={day} onChange={(e) => setDay(Number(e.target.value))} className="input">
                  {selectedCompany.operatingSlots.map((s) => (
                    <option key={s.day} value={s.day}>
                      Day {s.day} ({s.startTime}-{s.endTime})
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Delay (hours)">
              <input type="number" min="0.25" step="0.25" value={delayHours} onChange={(e) => setDelayHours(Number(e.target.value))} className="input" />
            </Field>
          </>
        )}

        {tab === 'panelDrop' && (
          <>
            <Field label="Company">
              <select value={companyId} onChange={(e) => { setCompanyId(e.target.value); setPanelId(''); }} className="input">
                <option value="">Select company…</option>
                {companies.map((c) => (
                  <option key={c.companyId} value={c.companyId}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            {selectedCompany && (
              <Field label="Panel">
                <select value={panelId} onChange={(e) => setPanelId(e.target.value)} className="input">
                  <option value="">Select panel…</option>
                  {selectedCompany.panels.map((p) => (
                    <option key={p.panelId} value={p.panelId} disabled={p.status === 'DROPPED'}>
                      {p.panelId} {p.status === 'DROPPED' ? '(already dropped)' : ''}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </>
        )}

        {tab === 'studentWithdraw' && (
          <Field label="Student (ID or name)">
            <input
              list="students-datalist"
              value={studentQuery}
              onChange={(e) => setStudentQuery(e.target.value)}
              placeholder="e.g. S0102 or Rahul Sharma"
              className="input"
            />
            <datalist id="students-datalist">
              {students.slice(0, 500).map((s) => (
                <option key={s.studentId} value={s.studentId}>
                  {s.name}
                </option>
              ))}
            </datalist>
            {studentQuery && !matchedStudent && <p className="mt-1 text-xs text-red-500">No matching student found.</p>}
            {matchedStudent && matchedStudent.status === 'WITHDRAWN' && <p className="mt-1 text-xs text-amber-600">Already withdrawn.</p>}
          </Field>
        )}

        {tab === 'roomUnavailable' && (
          <>
            <Field label="Room">
              <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className="input">
                <option value="">Select room…</option>
                {rooms.map((r) => (
                  <option key={r.roomId} value={r.roomId}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Day">
              <select value={day} onChange={(e) => setDay(Number(e.target.value))} className="input">
                {[1, 2, 3, 4].map((d) => (
                  <option key={d} value={d}>
                    Day {d}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="From">
                <input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} className="input" />
              </Field>
              <Field label="To">
                <input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} className="input" />
              </Field>
            </div>
          </>
        )}

        <button
          onClick={submit}
          disabled={!canSubmit || busy}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Spinner size={15} className="text-white" /> : <Zap size={15} />}
          Replan Schedule
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
