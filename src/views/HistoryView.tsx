import { useState } from 'react';
import type { AppData, Kind, Workout } from '../lib/types';
import { formatMonth, formatShort } from '../lib/dates';
import { formatKm } from '../lib/format';
import { isDone, sortByDate } from '../lib/stats';
import { WorkoutCard } from '../components/WorkoutCard';

interface Props {
  data: AppData;
  onOpen: (w: Workout) => void;
}

type Filter = 'all' | Kind;

export function HistoryView({ data, onOpen }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const list = sortByDate(
    data.workouts.filter((w) => isDone(w) && (filter === 'all' || w.kind === filter)),
    true,
  );

  const groups = new Map<string, Workout[]>();
  for (const w of list) {
    const k = w.date.slice(0, 7);
    groups.set(k, [...(groups.get(k) ?? []), w]);
  }

  return (
    <div className="view">
      <header className="view-head">
        <h1>Historial</h1>
        <div className="chips">
          {(
            [
              ['all', 'Todo'],
              ['run', 'Running'],
              ['gym', 'Gimnasio'],
            ] as const
          ).map(([k, label]) => (
            <button key={k} className={`chip ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>
              {label}
            </button>
          ))}
        </div>
      </header>

      {list.length === 0 && <p className="muted empty">Aún no hay sesiones registradas.</p>}

      {[...groups.entries()].map(([month, items]) => {
        const km = items.reduce((s, w) => s + (w.run?.distanceKm ?? 0), 0);
        const gym = items.filter((w) => w.kind === 'gym').length;
        return (
          <section key={month}>
            <h2 className="section-title">
              {formatMonth(`${month}-01`)}
              <span className="muted small section-meta">
                {km > 0 && formatKm(km)}
                {km > 0 && gym > 0 && ' · '}
                {gym > 0 && `${gym} gym`}
              </span>
            </h2>
            <div className="stack">
              {items.map((w) => (
                <WorkoutCard key={w.id} workout={w} onOpen={onOpen} showDate={formatShort(w.date)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
