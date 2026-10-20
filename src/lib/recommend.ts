import type { AppData, Kind, Routine, RunType, Workout } from './types';
import { RUN_TYPES } from './types';
import { addDays, fromISO, weekDays, weekStart } from './dates';
import { formatKm, uid } from './format';
import { isDone, sortByDate } from './stats';

/**
 * Recomendaciones basadas en reglas, sin servicios externos:
 * - El reparto gym/running sale de los objetivos semanales y los días de entrenamiento.
 * - Se alterna gym y carrera para no encadenar dos días de fuerza.
 * - Las rutinas rotan a partir de la última realizada.
 * - Se recomienda descanso tras un día duro (RPE ≥ 8) o tras 3 días seguidos.
 */

const dow = (iso: string) => (fromISO(iso).getDay() + 6) % 7; // 0 = lunes

export interface WeekTargets {
  gym: number;
  run: number;
}

/** Sesiones por semana: el gym ocupa su objetivo (fuerza primero) y el resto de días son carreras. */
export function weekTargets(data: AppData): WeekTargets {
  const days = data.settings.trainDays.length;
  const gym = Math.min(data.settings.weeklyGymGoal, days);
  return { gym, run: Math.max(0, days - gym) };
}

const roundHalf = (km: number) => Math.round(km * 2) / 2;

/**
 * Reparto de los km pendientes entre las carreras que faltan.
 * Con tirada larga, esta se lleva el 60 % si son 2 carreras y el 40 % si son más; el resto se reparte a partes iguales.
 */
function runDistances(kmLeft: number, runs: number, withLong: boolean) {
  if (!runs || !kmLeft) return { long: 0, other: 0 };
  if (!withLong || runs === 1) return { long: roundHalf(kmLeft / runs), other: roundHalf(kmLeft / runs) };
  const long = kmLeft * (runs === 2 ? 0.6 : 0.4);
  return { long: roundHalf(long), other: roundHalf((kmLeft - long) / (runs - 1)) };
}

/** Siguiente rutina en la rotación. `proposedBefore`: fechas de gym ya propuestas (aún sin guardar) antes de este día. */
function nextRoutine(routines: Routine[], workouts: Workout[], beforeDate: string, proposedBefore: string[] = []): Routine | null {
  if (!routines.length) return null;
  const lastGym = sortByDate(workouts.filter((w) => w.kind === 'gym' && w.date < beforeDate && w.gym?.routineName), true)[0];
  // Solo cuentan las propuestas posteriores a la última sesión real.
  const offset = proposedBefore.filter((d) => !lastGym || d > lastGym.date).length;
  const lastIdx = lastGym
    ? routines.findIndex((r) => r.name.trim().toLowerCase() === lastGym.gym!.routineName.trim().toLowerCase())
    : -1;
  return routines[(lastIdx + 1 + offset) % routines.length];
}

function gymWorkout(date: string, routine: Routine | null): Workout {
  return {
    id: uid(),
    createdAt: Date.now(),
    date,
    kind: 'gym',
    status: 'planned',
    gym: {
      routineName: routine?.name ?? 'Gimnasio',
      exercises: (routine?.exercises ?? []).map((e) => ({
        name: e.name,
        sets: Array.from({ length: Math.max(1, e.sets) }, () => ({ reps: e.reps, weight: 0 })),
      })),
    },
  };
}

function runWorkout(date: string, runType: RunType, distanceKm: number): Workout {
  return { id: uid(), createdAt: Date.now(), date, kind: 'run', status: 'planned', run: { runType, distanceKm, durationSec: 0 } };
}

function weekState(data: AppData, start: string) {
  const end = addDays(start, 6);
  const inWeek = data.workouts.filter((w) => w.date >= start && w.date <= end);
  const runs = inWeek.filter((w) => w.kind === 'run');
  return {
    inWeek,
    gymCount: inWeek.filter((w) => w.kind === 'gym').length,
    runCount: runs.length,
    km: runs.reduce((s, w) => s + (w.run?.distanceKm ?? 0), 0),
    hasLongRun: runs.some((w) => w.run?.runType === 'tirada'),
  };
}

// ---------- Plan semanal ----------

/** Propone sesiones para los días de entrenamiento libres de la semana, desde hoy. No modifica nada. */
export function suggestWeekPlan(data: AppData, start: string, today: string): Workout[] {
  const { trainDays, weeklyKmGoal } = data.settings;
  const targets = weekTargets(data);
  const st = weekState(data, start);
  let gymLeft = Math.max(0, targets.gym - st.gymCount);
  let runLeft = Math.max(0, targets.run - st.runCount);

  const kindOn = new Map<string, Kind>();
  for (const w of st.inWeek) kindOn.set(w.date, w.kind);
  // El día anterior al lunes cuenta para alternar.
  const prevWeekDay = addDays(start, -1);
  const prev = data.workouts.find((w) => w.date === prevWeekDay);
  if (prev) kindOn.set(prevWeekDay, prev.kind);

  const free = weekDays(start).filter((d) => d >= today && trainDays.includes(dow(d)) && !st.inWeek.some((w) => w.date === d));
  const assigned: { date: string; kind: Kind }[] = [];
  for (const d of free) {
    if (!gymLeft && !runLeft) break;
    const yesterday = kindOn.get(addDays(d, -1));
    let kind: Kind;
    if (gymLeft && runLeft) kind = yesterday === 'gym' ? 'run' : yesterday === 'run' ? 'gym' : gymLeft >= runLeft ? 'gym' : 'run';
    else kind = gymLeft ? 'gym' : 'run';
    if (kind === 'gym') gymLeft--;
    else runLeft--;
    kindOn.set(d, kind);
    assigned.push({ date: d, kind });
  }

  // Carreras: los km pendientes se reparten entre las carreras que faltan (aunque no todas quepan);
  // la última es la tirada larga si aún no hay una, y con 3+ carreras una es tempo.
  const newRuns = assigned.filter((a) => a.kind === 'run');
  const runsNeeded = Math.max(newRuns.length, targets.run - st.runCount);
  const withLong = newRuns.length >= 2 && !st.hasLongRun;
  const km = runDistances(Math.max(0, weeklyKmGoal - st.km), runsNeeded, withLong);

  const proposedGyms: string[] = [];
  return assigned.map((a) => {
    if (a.kind === 'gym') {
      const w = gymWorkout(a.date, nextRoutine(data.routines, data.workouts, a.date, proposedGyms));
      proposedGyms.push(a.date);
      return w;
    }
    const runIdx = newRuns.findIndex((r) => r.date === a.date);
    const isLong = withLong && runIdx === newRuns.length - 1;
    const isTempo = !isLong && newRuns.length >= 3 && runIdx === 1;
    return runWorkout(a.date, isLong ? 'tirada' : isTempo ? 'tempo' : 'rodaje', isLong ? km.long : km.other);
  });
}

// ---------- Sesión de hoy ----------

export interface TodaySuggestion {
  kind: Kind | 'rest';
  title: string;
  reason: string;
  workout?: Workout; // sesión planificada lista para añadir
}

export function suggestToday(data: AppData, today: string): TodaySuggestion | null {
  // Si hoy ya hay algo planificado o hecho, manda el plan.
  if (data.workouts.some((w) => w.date === today)) return null;

  const { trainDays, weeklyKmGoal } = data.settings;
  const start = weekStart(today);
  const targets = weekTargets(data);
  const st = weekState(data, start);
  const gymNeed = Math.max(0, targets.gym - st.gymCount);
  const runNeed = Math.max(0, targets.run - st.runCount);

  if (!gymNeed && !runNeed) {
    return { kind: 'rest', title: 'Descanso', reason: 'Tu semana ya está cubierta entre lo hecho y lo planificado. Recuperar también es entrenar.' };
  }

  const done = data.workouts.filter(isDone);
  const yesterday = addDays(today, -1);
  const yWorkouts = done.filter((w) => w.date === yesterday);
  const hardYesterday = yWorkouts.some((w) => (w.rpe ?? 0) >= 8);
  let streak = 0;
  while (done.some((w) => w.date === addDays(today, -(streak + 1)))) streak++;

  // Días de entrenamiento que quedan en la semana sin sesión, sin contar hoy.
  const daysLeftAfter = weekDays(start).filter(
    (d) => d > today && trainDays.includes(dow(d)) && !st.inWeek.some((w) => w.date === d),
  ).length;
  const behind = gymNeed + runNeed > daysLeftAfter;

  if (hardYesterday) return { kind: 'rest', title: 'Descanso', reason: 'Ayer fue una sesión dura (RPE 8 o más). Hoy toca recuperar.' };
  if (streak >= 3) return { kind: 'rest', title: 'Descanso', reason: `Llevas ${streak} días seguidos entrenando. Un día de descanso ayuda a asimilar el trabajo.` };
  if (!trainDays.includes(dow(today)) && !behind) {
    return { kind: 'rest', title: 'Descanso', reason: 'Hoy no es uno de tus días de entrenamiento y vas en plan para cumplir la semana.' };
  }

  const yKind = yWorkouts[0]?.kind;
  let kind: Kind;
  if (gymNeed && runNeed) kind = yKind === 'gym' ? 'run' : yKind === 'run' ? 'gym' : gymNeed >= runNeed ? 'gym' : 'run';
  else kind = gymNeed ? 'gym' : 'run';

  const pending = [
    gymNeed ? `${gymNeed} de gym` : null,
    runNeed ? `${runNeed} ${runNeed === 1 ? 'carrera' : 'carreras'}` : null,
  ]
    .filter(Boolean)
    .join(' y ');
  const why = [
    yKind === 'gym' && kind === 'run' ? 'Ayer hiciste fuerza, hoy toca correr.' : null,
    yKind === 'run' && kind === 'gym' ? 'Ayer corriste, hoy toca fuerza.' : null,
    `Te ${gymNeed + runNeed === 1 ? 'queda' : 'quedan'} ${pending} esta semana.`,
    behind ? 'Vas justo de días: conviene no saltártela.' : null,
  ]
    .filter(Boolean)
    .join(' ');

  if (kind === 'gym') {
    const routine = nextRoutine(data.routines, data.workouts, today);
    const workout = gymWorkout(today, routine);
    return { kind, title: workout.gym!.routineName, reason: why, workout };
  }

  const kmLeft = Math.max(0, weeklyKmGoal - st.km);
  const isWeekend = dow(today) >= 5;
  const runType: RunType = !st.hasLongRun && (runNeed === 1 || isWeekend) && kmLeft > 0 ? 'tirada' : 'rodaje';
  // Mismo reparto que el plan semanal: si la tirada aún está por hacer, el rodaje de hoy le deja su parte.
  const dist = runDistances(kmLeft, runNeed, !st.hasLongRun);
  const km = kmLeft ? Math.max(3, runType === 'tirada' ? dist.long : dist.other) : 0;
  const workout = runWorkout(today, runType, km);
  return { kind, title: `${RUN_TYPES[runType]}${km ? ` · ${formatKm(km)}` : ''}`, reason: why, workout };
}
