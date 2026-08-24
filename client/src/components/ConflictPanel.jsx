import { useMemo } from 'react';
import { DoorOpen, UserX, Clock, Users } from 'lucide-react';
import { toMinutes } from '../utils/time.js';

function isOverlapping(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

export default function ConflictPanel({ companies, rooms, interviews, studentsById }) {
  const items = useMemo(() => {
    const list = [];

    for (const room of rooms) {
      if (room.status === 'UNAVAILABLE') {
        list.push({
          icon: DoorOpen,
          text: `Room ${room.name} unavailable${room.unavailableFrom ? ` ${room.unavailableFrom}-${room.unavailableTo}` : ''}${room.unavailableDay ? ` on Day ${room.unavailableDay}` : ''}`,
        });
      }
    }

    for (const company of companies) {
      if (company.status === 'DELAYED') {
        list.push({ icon: Clock, text: `${company.name} delayed by ${company.arrivalDelay} min on Day ${company.delayedDay}` });
      }
      for (const panel of company.panels) {
        if (panel.status === 'DROPPED') {
          list.push({ icon: UserX, text: `${company.name} panel ${panel.panelId} dropped` });
        }
      }
    }

    // Defensive check — hard constraints should make this list always empty.
    const byStudentDay = new Map();
    for (const iv of interviews) {
      if (iv.status !== 'SCHEDULED' || !iv.day) continue;
      const key = `${iv.studentId}::${iv.day}`;
      if (!byStudentDay.has(key)) byStudentDay.set(key, []);
      byStudentDay.get(key).push(iv);
    }
    for (const [key, list_] of byStudentDay) {
      const sorted = [...list_].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
      for (let i = 1; i < sorted.length; i += 1) {
        if (isOverlapping(toMinutes(sorted[i - 1].startTime), toMinutes(sorted[i - 1].endTime), toMinutes(sorted[i].startTime), toMinutes(sorted[i].endTime))) {
          const [studentId] = key.split('::');
          list.push({ icon: Users, text: `Student ${studentsById.get(studentId)?.name || studentId} has overlapping interviews` });
        }
      }
    }

    return list;
  }, [companies, rooms, interviews, studentsById]);

  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">No active disruptions — schedule is clean.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item, idx) => {
        const Icon = item.icon;
        return (
          <li key={idx} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <Icon size={15} className="mt-0.5 shrink-0" />
            {item.text}
          </li>
        );
      })}
    </ul>
  );
}
