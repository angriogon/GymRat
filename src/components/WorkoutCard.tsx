import type { Workout } from '../lib/types';
import { RUN_TYPES } from '../lib/types';
import { formatDuration, formatKm, formatPace } from '../lib/format';
import { Icon } from './Icon';

interface Props {
  workout: Workout;
  onOpen: (w: Workout) => void;
  onComplete?: (w: Workout) => void;
  showDate?: string;
}

export function workoutTitle(w: Workout): string {
  if (w.kind === 'run') return w.run ? RUN_TYPES[w.run.runType] : 'Carrera';
  return w.gym?.routineName?.trim() || 'Gimnasio';
}

export function workoutDetail(w: Workout): string {
  if (w.kind === 'run' && w.run) {
    const parts: string[] = [];
    if (w.run.distanceKm) parts.push(formatKm(w.run.distanceKm));
    if (w.run.durationSec) parts.push(formatDuration(w.run.durationSec));
    if (w.status === 'done' && w.run.distanceKm && w.run.durationSec)
      parts.push(formatPace(w.run.distanceKm, w.run.durationSec));
    return parts.join(' · ') || 'Sin objetivo';
  }
  if (w.kind === 'gym' && w.gym) {
    const ex = w.gym.exercises.filter((e) => e.name.trim());
    const sets = ex.reduce((s, e) => s + e.sets.length, 0);
    if (!ex.length) return 'Sin ejercicios';
    return `${ex.length} ejercicio${ex.length > 1 ? 's' : ''} · ${sets} series`;
  }
  return '';
}

export function WorkoutCard({ workout: w, onOpen, onComplete, showDate }: Props) {
  const planned = w.status === 'planned';
  return (
    <div className={`card workout ${w.kind} ${planned ? 'is-planned' : 'is-done'}`}>
      <button className="workout-main" onClick={() => onOpen(w)}>
        <span className="kind-badge" aria-hidden="true">
          <Icon name={w.kind === 'run' ? 'run' : 'gym'} />
        </span>
        <span className="workout-text">
          <span className="workout-title">
            {workoutTitle(w)}
            {planned && <span className="tag">Planificado</span>}
          </span>
          <span className="workout-detail">
            {showDate && <>{showDate} · </>}
            {workoutDetail(w)}
          </span>
        </span>
      </button>
      {planned && onComplete && (
        <button className="icon-btn complete-btn" onClick={() => onComplete(w)} aria-label="Marcar como hecho" title="Marcar como hecho">
          <Icon name="check" />
        </button>
      )}
    </div>
  );
}
