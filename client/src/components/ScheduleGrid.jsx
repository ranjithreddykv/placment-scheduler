import { useMemo, useState } from 'react';
import { toMinutes } from '../utils/time.js';

const DAY_START = toMinutes('09:00');
const DAY_END = toMinutes('18:00');
const LUNCH_START = toMinutes('13:00');
const LUNCH_END = toMinutes('14:00');
const SPAN = DAY_END - DAY_START;
const HOURS = Array.from({ length: 10 }, (_, i) => 9 + i); // 9..18

function pct(min) {
  return `${((min - DAY_START) / SPAN) * 100}%`;
}

function blockStyle(iv) {
  const isChanged =
    iv.status === 'SCHEDULED' &&
    (iv.startTime !== iv.originalStartTime || iv.roomId !== iv.originalRoomId || iv.panelId !== iv.originalPanelId || iv.day !== iv.originalDay);

  if (iv.status === 'COMPLETED') return 'bg-slate-200 border-slate-300 text-slate-600';
  if (isChanged) return 'bg-amber-100 border-amber-400 text-amber-900';
  return 'bg-blue-100 border-blue-400 text-blue-900';
}

export default function ScheduleGrid({ interviews, rooms, days, studentsById, companiesById, onSelectInterview }) {
  const [day, setDay] = useState(days[0] || 1);

  const byRoom = useMemo(() => {
    const map = new Map(rooms.map((r) => [r.roomId, []]));
    for (const iv of interviews) {
      if (iv.day !== day || !iv.roomId || (iv.status !== 'SCHEDULED' && iv.status !== 'COMPLETED')) continue;
      if (!map.has(iv.roomId)) map.set(iv.roomId, []);
      map.get(iv.roomId).push(iv);
    }
    return map;
  }, [interviews, rooms, day]);

  return (
    <div>
      <div className="mb-3 flex items-center gap-1">
        {days.map((d) => (
          <button
            key={d}
            onClick={() => setDay(d)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${day === d ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Day {d}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <div className="min-w-[900px]">
          {/* Time ruler */}
          <div className="ml-32 flex border-b border-slate-200 pb-1 text-xs text-slate-400">
            {HOURS.map((h) => (
              <div key={h} style={{ width: `${100 / (HOURS.length - 1)}%` }} className="shrink-0">
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          <div className="mt-1 space-y-1">
            {rooms.map((room) => {
              const bookings = byRoom.get(room.roomId) || [];
              return (
                <div key={room.roomId} className="flex items-center">
                  <div className="w-32 shrink-0 pr-2 text-xs font-medium text-slate-600">{room.name}</div>
                  <div className="relative h-10 flex-1 rounded-md bg-slate-50">
                    {/* Lunch shading */}
                    <div
                      className="absolute top-0 h-full bg-slate-200/60"
                      style={{ left: pct(LUNCH_START), width: `${((LUNCH_END - LUNCH_START) / SPAN) * 100}%` }}
                    />
                    {bookings.map((iv) => {
                      const start = toMinutes(iv.startTime);
                      const end = toMinutes(iv.endTime);
                      const student = studentsById.get(iv.studentId);
                      const company = companiesById.get(iv.companyId);
                      return (
                        <button
                          key={iv.interviewId}
                          onClick={() => onSelectInterview(iv)}
                          style={{ left: pct(start), width: `${((end - start) / SPAN) * 100}%` }}
                          className={`absolute top-0.5 h-9 overflow-hidden rounded border px-1.5 text-left text-[11px] leading-tight shadow-sm hover:z-10 hover:ring-2 hover:ring-slate-400 ${blockStyle(iv)}`}
                          title={`${student?.name || iv.studentId} × ${company?.name || iv.companyId}`}
                        >
                          <div className="truncate font-semibold">{student?.name || iv.studentId}</div>
                          <div className="truncate opacity-80">{company?.name || iv.companyId}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <Legend swatch="bg-blue-100 border-blue-400" label="Scheduled" />
        <Legend swatch="bg-amber-100 border-amber-400" label="Changed by replan" />
        <Legend swatch="bg-slate-200 border-slate-300" label="Completed" />
        <Legend swatch="bg-slate-200/60 border-transparent" label="Lunch break" />
      </div>
    </div>
  );
}

function Legend({ swatch, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded border ${swatch}`} />
      {label}
    </div>
  );
}
