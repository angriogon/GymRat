import { useState } from 'react';
import type { AppData, Kind, Workout } from '../lib/types';
import { addDays, formatDow, formatShort, today, weekDays, weekStart } from '../lib/dates';
import { formatKm, uid } from '../lib/format';
import { sortByDate } from '../lib/stats';
import { WorkoutCard, workoutDetail, workoutTitle } from '../components/WorkoutCard';
import { suggestWeekPlan, weekTargets } from '../lib/recommend';
import { Icon } from '../components/Icon';

interface Props {
  data: AppData;
  onOpen: (w: Workout) => void;
  onComplete: (w: Workout) => void;
  onNew: (kind: Kind, date: string) => void;
  onSaveMany: (ws: Workout[]) => void;
}

export function PlanView({ data, onOpen, onComplete, onNew, onSaveMany }: Props) {
  const t = today();
  const [start, setStart] = useState(weekStart(t));
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const days = weekDays(start);
  const end = days[6];

  const inWeek = data.workouts.filter((w) => w.date >= start && w.date <= end);
  const plannedKm = inWeek.filter((w) => w.kind === 'run').reduce((s, w) => s + (w.run?.distanceKm ?? 0), 0);
  const gymCount = inWeek.filter((w) => w.kind === 'gym').length;

  // Copia la semana anterior como plan: mismas sesiones y objetivos, sin datos de resultado.
  const copyPrevious = () => {
    const prevStart = addDays(start, -7);
    const prev = data.workouts.filter((w) => w.date >= prevStart && w.date < start);
    if (!prev.length) return alert('La semana anterior no tiene sesiones.');
    if (!confirm(`¿Copiar ${prev.length} sesión(es) de la semana anterior como planificadas?`)) return;
    onSaveMany(
      prev.map((w) => ({
        id: uid(),
        createdAt: Date.now(),
        date: addDays(w.date, 7),
        kind: w.kind,
        status: 'planned',
        run: w.run && { ...w.run },
        gym: w.gym && {
          routineName: w.gym.routineName,
          exercises: w.gym.exercises.map((e) => ({ name: e.name, sets: e.sets.map((s) => ({ ...s })) })),
        },
      })),
    );
  };

  // Rellena los días de entrenamiento libres desde hoy; nunca toca lo ya planificado o hecho.
  const suggestPlan = () => {
    const proposal = suggestWeekPlan(data, start, t);
    if (!proposal.length) {
      const tg = weekTargets(data);
      return alert(
        end < t
          ? 'Esta semana ya ha pasado.'
          : `No hay nada que añadir: la semana ya cubre tus ${tg.gym} sesiones de gym y ${tg.run} carreras, o no quedan días de entrenamiento libres. Puedes cambiar tus días en Ajustes.`,
      );
    }
    const lines = proposal.map((w) => `${formatDow(w.date)}: ${workoutTitle(w)} (${workoutDetail(w)})`).join('\n');
    if (confirm(`Plan sugerido:\n\n${lines}\n\n¿Añadirlo a la semana?`)) onSaveMany(proposal);
  };

  return (
    <div className="view">
      <header className="view-head">
        <h1>Plan semanal</h1>
        <div className="week-nav">
          <button className="icon-btn" onClick={() => setStart(addDays(start, -7))} aria-label="Semana anterior">
            <Icon name="left" />
          </button>
          <button className="week-label" onClick={() => setStart(weekStart(t))} title="Ir a la semana actual">
            {formatShort(start)} – {formatShort(end)}
          </button>
          <button className="icon-btn" onClick={() => setStart(addDays(start, 7))} aria-label="Semana siguiente">
            <Icon name="right" />
          </button>
        </div>
        <p className="muted small">
          {formatKm(plannedKm)} de running · {gymCount} {gymCount === 1 ? 'sesión' : 'sesiones'} de gym
          {' · '}
          <button className="link" onClick={copyPrevious}>
            Copiar semana anterior
          </button>
        </p>
        {end >= t && (
          <button className="btn outline full" onClick={suggestPlan}>
            <Icon name="spark" size={18} /> Sugerir plan para esta semana
          </button>
        )}
      </header>

      <div className="days">
        {days.map((d) => {
          const items = sortByDate(data.workouts.filter((w) => w.date === d));
          return (
            <section key={d} className={`day ${d === t ? 'is-today' : ''} ${d < t ? 'is-past' : ''}`}>
              <div className="day-head">
                <span className="day-name">{formatDow(d)}</span>
                <span className="day-date">{formatShort(d)}</span>
                <span className="spacer" />
                {addingFor === d ? (
                  <span className="add-choice">
                    <button className="chip run" onClick={() => (setAddingFor(null), onNew('run', d))}>
                      <Icon name="run" size={16} /> Running
                    </button>
                    <button className="chip gym" onClick={() => (setAddingFor(null), onNew('gym', d))}>
                      <Icon name="gym" size={16} /> Gym
                    </button>
                    <button className="icon-btn small" onClick={() => setAddingFor(null)} aria-label="Cancelar">
                      <Icon name="x" size={16} />
                    </button>
                  </span>
                ) : (
                  <button className="icon-btn small" onClick={() => setAddingFor(d)} aria-label={`Añadir sesión el ${formatShort(d)}`}>
                    <Icon name="plus" size={18} />
                  </button>
                )}
              </div>
              {items.length > 0 ? (
                <div className="stack">
                  {items.map((w) => (
                    <WorkoutCard key={w.id} workout={w} onOpen={onOpen} onComplete={onComplete} />
                  ))}
                </div>
              ) : (
                <p className="muted small rest">Descanso</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
