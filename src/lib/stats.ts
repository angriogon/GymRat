import type { Workout } from './types';
import { addDays, weekStart } from './dates';
import { estimate1RM } from './format';

export const isDone = (w: Workout) => w.status === 'done';

export function sortByDate(list: Workout[], desc = false): Workout[] {
  return [...list].sort((a, b) => {
    const c = a.date.localeCompare(b.date) || a.createdAt - b.createdAt;
    return desc ? -c : c;
  });
}

export function weekSummary(workouts: Workout[], start: string) {
  const end = addDays(start, 6);
  const inWeek = workouts.filter((w) => isDone(w) && w.date >= start && w.date <= end);
  const runs = inWeek.filter((w) => w.kind === 'run');
  return {
    km: runs.reduce((s, w) => s + (w.run?.distanceKm ?? 0), 0),
    runCount: runs.length,
    gymCount: inWeek.filter((w) => w.kind === 'gym').length,
    runSec: runs.reduce((s, w) => s + (w.run?.durationSec ?? 0), 0),
  };
}

/** Resumen de las últimas n semanas (la actual incluida), de más antigua a más reciente. */
export function lastWeeks(workouts: Workout[], refIso: string, n: number) {
  const current = weekStart(refIso);
  return Array.from({ length: n }, (_, i) => {
    const start = addDays(current, -7 * (n - 1 - i));
    return { start, ...weekSummary(workouts, start) };
  });
}

export function runTotals(workouts: Workout[]) {
  const runs = workouts.filter((w) => isDone(w) && w.kind === 'run' && w.run);
  const km = runs.reduce((s, w) => s + w.run!.distanceKm, 0);
  const sec = runs.reduce((s, w) => s + w.run!.durationSec, 0);
  const longest = runs.reduce<Workout | null>((b, w) => (!b || w.run!.distanceKm > b.run!.distanceKm ? w : b), null);
  // Mejor ritmo solo en carreras de al menos 3 km para que un sprint no distorsione.
  const fastest = runs
    .filter((w) => w.run!.distanceKm >= 3 && w.run!.durationSec > 0)
    .reduce<Workout | null>(
      (b, w) => (!b || w.run!.durationSec / w.run!.distanceKm < b.run!.durationSec / b.run!.distanceKm ? w : b),
      null,
    );
  return { count: runs.length, km, sec, longest, fastest };
}

export interface ExercisePoint {
  date: string;
  topWeight: number;
  best1RM: number;
}

/** Histórico por ejercicio: mejor peso y 1RM estimado de cada sesión. */
export function exerciseHistory(workouts: Workout[]): Map<string, { name: string; points: ExercisePoint[] }> {
  const map = new Map<string, { name: string; points: ExercisePoint[] }>();
  for (const w of sortByDate(workouts.filter((w) => isDone(w) && w.kind === 'gym' && w.gym))) {
    for (const ex of w.gym!.exercises) {
      const name = ex.name.trim();
      const valid = ex.sets.filter((s) => s.reps > 0);
      if (!name || !valid.length) continue;
      const point: ExercisePoint = {
        date: w.date,
        topWeight: Math.max(...valid.map((s) => s.weight)),
        best1RM: Math.max(...valid.map((s) => estimate1RM(s.weight, s.reps))),
      };
      const key = name.toLowerCase();
      const entry = map.get(key) ?? { name, points: [] };
      entry.points.push(point);
      map.set(key, entry);
    }
  }
  return map;
}

export function streakWeeks(workouts: Workout[], refIso: string): number {
  // Semanas consecutivas (hasta la actual) con al menos una sesión hecha.
  // La semana en curso no rompe la racha si aún está vacía.
  const done = new Set(workouts.filter(isDone).map((w) => weekStart(w.date)));
  let start = weekStart(refIso);
  if (!done.has(start)) start = addDays(start, -7);
  let n = 0;
  while (done.has(start)) {
    n++;
    start = addDays(start, -7);
  }
  return n;
}
