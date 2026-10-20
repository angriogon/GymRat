import type { AppData, Kind, Workout } from '../lib/types';
import { addDays, formatLong, formatShort, relativeDay, today, weekStart } from '../lib/dates';
import { formatKm } from '../lib/format';
import { sortByDate, streakWeeks, weekSummary } from '../lib/stats';
import { WorkoutCard } from '../components/WorkoutCard';
import { Icon } from '../components/Icon';
import { InstallTip } from '../components/InstallTip';

interface Props {
  data: AppData;
  onOpen: (w: Workout) => void;
  onComplete: (w: Workout) => void;
  onNew: (kind: Kind, date: string) => void;
  onImport: () => void;
}

function Progress({ label, value, goal, text }: { label: string; value: number; goal: number; text: string }) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  return (
    <div className="card stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{text}</span>
      <div className="bar-track" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className={`bar-fill ${pct >= 100 ? 'complete' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function TodayView({ data, onOpen, onComplete, onNew, onImport }: Props) {
  const t = today();
  const week = weekSummary(data.workouts, weekStart(t));
  const { weeklyKmGoal, weeklyGymGoal } = data.settings;
  const streak = streakWeeks(data.workouts, t);

  const todays = sortByDate(data.workouts.filter((w) => w.date === t));
  const upcoming = sortByDate(data.workouts.filter((w) => w.status === 'planned' && w.date > t)).slice(0, 5);
  const overdue = sortByDate(
    data.workouts.filter((w) => w.status === 'planned' && w.date < t && w.date >= addDays(t, -14)),
    true,
  );

  return (
    <div className="view">
      <header className="view-head">
        <p className="muted">{formatLong(t)}</p>
        <h1>Esta semana</h1>
        {streak > 0 && (
          <p className="muted small">
            🔥 Racha: {streak === 1 ? '1 semana entrenando' : `${streak} semanas seguidas entrenando`}
          </p>
        )}
      </header>

      <InstallTip />

      <div className="stats-grid">
        <Progress
          label="Running"
          value={week.km}
          goal={weeklyKmGoal}
          text={`${formatKm(week.km)} / ${weeklyKmGoal}`}
        />
        <Progress
          label="Gimnasio"
          value={week.gymCount}
          goal={weeklyGymGoal}
          text={`${week.gymCount} / ${weeklyGymGoal} sesiones`}
        />
      </div>

      <section>
        <h2 className="section-title">Hoy</h2>
        {todays.length ? (
          <div className="stack">
            {todays.map((w) => (
              <WorkoutCard key={w.id} workout={w} onOpen={onOpen} onComplete={onComplete} />
            ))}
          </div>
        ) : (
          <p className="muted empty">Nada planificado para hoy. ¿Has entrenado? Regístralo:</p>
        )}
        <div className="quick-add">
          <button className="btn run-btn" onClick={() => onNew('run', t)}>
            <Icon name="run" /> Carrera
          </button>
          <button className="btn gym-btn" onClick={() => onNew('gym', t)}>
            <Icon name="gym" /> Gimnasio
          </button>
        </div>
        <button className="btn ghost full" onClick={onImport}>
          <Icon name="heart" size={18} /> Importar de Apple Salud
        </button>
      </section>

      {overdue.length > 0 && (
        <section>
          <h2 className="section-title">Pendientes de completar</h2>
          <div className="stack">
            {overdue.map((w) => (
              <WorkoutCard key={w.id} workout={w} onOpen={onOpen} onComplete={onComplete} showDate={formatShort(w.date)} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="section-title">Próximas sesiones</h2>
        {upcoming.length ? (
          <div className="stack">
            {upcoming.map((w) => (
              <WorkoutCard key={w.id} workout={w} onOpen={onOpen} showDate={relativeDay(w.date)} />
            ))}
          </div>
        ) : (
          <p className="muted empty">No hay sesiones planificadas. Organiza tu semana en la pestaña Plan.</p>
        )}
      </section>
    </div>
  );
}
