import type { AppData, Kind, RunCategory, RunTemplate, StrengthCategory, Workout } from './types';
import { addDays, fromISO, weekDays, weekStart } from './dates';
import { formatKm, uid } from './format';
import { exerciseHistory, isDone, sortByDate } from './stats';
import { EXERCISES_PER_SESSION, RUN_CATEGORIES, RUN_CATEGORY_TYPE, splitLabel } from './library';

/**
 * Recomendaciones basadas en reglas y en la biblioteca, sin servicios externos:
 * - El reparto gym/running sale del objetivo de gym y los días de entrenamiento.
 * - Se alterna gym y carrera para no encadenar dos días de fuerza.
 * - Los días de gym rotan según Ajustes (p. ej. Pecho + Tríceps → Espalda + bíceps…); los ejercicios
 *   salen de la biblioteca: el principal de cada grupo siempre y el resto rota cada semana.
 * - Carreras: la última de la semana es tirada larga; las demás alternan series y fartlek.
 * - Se recomienda descanso tras un día duro (RPE ≥ 8) o tras 3 días seguidos.
 */

const dow = (iso: string) => (fromISO(iso).getDay() + 6) % 7; // 0 = lunes
const weekNumber = (iso: string) => Math.round(fromISO(weekStart(iso)).getTime() / (7 * 86400000));

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

// ---------- Gym ----------

const sameCats = (a: StrengthCategory[], b: StrengthCategory[]) => a.length === b.length && a.every((c) => b.includes(c));

/** Posición de una sesión en la rotación: por sus grupos o, en sesiones antiguas, por su nombre. */
function splitIndex(split: StrengthCategory[][], w: Workout): number {
  const cats = w.gym?.categories;
  if (cats?.length) return split.findIndex((day) => sameCats(day, cats));
  const name = w.gym?.routineName.trim().toLowerCase();
  return split.findIndex((day) => splitLabel(day).toLowerCase() === name);
}

/** Siguiente día de la rotación. `proposedBefore`: fechas de gym ya propuestas (aún sin guardar) antes de este día. */
function nextSplitDay(data: AppData, beforeDate: string, proposedBefore: string[] = []): StrengthCategory[] | null {
  const split = data.settings.gymSplit;
  if (!split.length) return null;
  const lastGym = sortByDate(
    data.workouts.filter((w) => w.kind === 'gym' && w.date < beforeDate && splitIndex(split, w) >= 0),
    true,
  )[0];
  // Solo cuentan las propuestas posteriores a la última sesión real.
  const offset = proposedBefore.filter((d) => !lastGym || d > lastGym.date).length;
  const lastIdx = lastGym ? splitIndex(split, lastGym) : -1;
  return split[(lastIdx + 1 + offset) % split.length];
}

/**
 * Ejercicios de un grupo para una semana: el primero (el principal) siempre; el resto rota.
 * Se eligen repartidos a lo largo de la lista (no seguidos) para que un grupo mixto como
 * Espalda + bíceps no salga todo de espalda o todo de bíceps.
 */
function pickExercises(data: AppData, cat: StrengthCategory, week: number) {
  const items = data.library.exercises.filter((e) => e.category === cat);
  const n = EXERCISES_PER_SESSION[cat];
  if (items.length <= n) return items;
  const [anchor, ...rest] = items;
  const k = n - 1;
  const step = Math.max(1, Math.floor(rest.length / k));
  const start = week % rest.length;
  return [anchor, ...Array.from({ length: k }, (_, i) => rest[(start + i * step) % rest.length])];
}

function gymWorkout(data: AppData, date: string, cats: StrengthCategory[] | null, lastWeight: (n: string) => number): Workout {
  const week = weekNumber(date);
  const exercises = (cats ?? []).flatMap((c) => pickExercises(data, c, week));
  return {
    id: uid(),
    createdAt: Date.now(),
    date,
    kind: 'gym',
    status: 'planned',
    gym: {
      routineName: cats ? splitLabel(cats) : 'Gimnasio',
      categories: cats ?? undefined,
      exercises: exercises.map((e) => ({
        name: e.name,
        sets: Array.from({ length: Math.max(1, e.sets) }, () => ({ reps: e.reps, weight: lastWeight(e.name) })),
      })),
    },
  };
}

function lastWeightFn(data: AppData) {
  const history = exerciseHistory(data.workouts);
  return (name: string) => {
    const points = history.get(name.trim().toLowerCase())?.points;
    return points?.length ? points[points.length - 1].topWeight : 0;
  };
}

// ---------- Running ----------

/** Siguiente entrenamiento de una categoría: rota según cuántos de ese tipo llevas hechos o planificados. */
function pickTemplate(data: AppData, cat: RunCategory, beforeDate: string, extra = 0): RunTemplate | null {
  const items = data.library.runs.filter((r) => r.category === cat);
  if (!items.length) return null;
  const used = data.workouts.filter((w) => w.kind === 'run' && w.run?.runType === RUN_CATEGORY_TYPE[cat] && w.date < beforeDate).length;
  return items[(used + extra) % items.length];
}

function runWorkout(date: string, cat: RunCategory, t: RunTemplate | null): Workout {
  return {
    id: uid(),
    createdAt: Date.now(),
    date,
    kind: 'run',
    status: 'planned',
    run: {
      runType: RUN_CATEGORY_TYPE[cat],
      distanceKm: t?.distanceKm ?? 0,
      durationSec: 0,
      name: t?.name ?? RUN_CATEGORIES[cat],
      session: t?.session || undefined,
    },
  };
}

/** Orden de las sesiones de calidad: alterna cada semana y deja para el final las que ya hay esta semana. */
function qualityOrder(week: number, inWeek: Workout[]): RunCategory[] {
  const base: RunCategory[] = week % 2 === 0 ? ['series', 'fartlek'] : ['fartlek', 'series'];
  const has = (c: RunCategory) => inWeek.some((w) => w.kind === 'run' && w.run?.runType === RUN_CATEGORY_TYPE[c]);
  return [...base.filter((c) => !has(c)), ...base.filter(has)];
}

function weekState(data: AppData, start: string) {
  const end = addDays(start, 6);
  const inWeek = data.workouts.filter((w) => w.date >= start && w.date <= end);
  return {
    inWeek,
    gymCount: inWeek.filter((w) => w.kind === 'gym').length,
    runCount: inWeek.filter((w) => w.kind === 'run').length,
    hasLongRun: inWeek.some((w) => w.run?.runType === 'tirada'),
  };
}

// ---------- Plan semanal ----------

/** Propone sesiones para los días de entrenamiento libres de la semana, desde hoy. No modifica nada. */
export function suggestWeekPlan(data: AppData, start: string, today: string): Workout[] {
  const { trainDays } = data.settings;
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

  // Carreras: la última es la tirada larga si aún no hay una; el resto alterna series y fartlek.
  const newRuns = assigned.filter((a) => a.kind === 'run');
  const week = weekNumber(start);
  const quality = qualityOrder(week, st.inWeek);
  const runCats = newRuns.map((_, i): RunCategory =>
    !st.hasLongRun && i === newRuns.length - 1 ? 'tirada' : quality[i % quality.length],
  );

  const lastWeight = lastWeightFn(data);
  const proposedGyms: string[] = [];
  const usedPerCat: Partial<Record<RunCategory, number>> = {};
  return assigned.map((a) => {
    if (a.kind === 'gym') {
      const w = gymWorkout(data, a.date, nextSplitDay(data, a.date, proposedGyms), lastWeight);
      proposedGyms.push(a.date);
      return w;
    }
    const cat = runCats[newRuns.findIndex((r) => r.date === a.date)];
    const extra = usedPerCat[cat] ?? 0;
    usedPerCat[cat] = extra + 1;
    return runWorkout(a.date, cat, pickTemplate(data, cat, a.date, extra));
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

  const { trainDays } = data.settings;
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
    const workout = gymWorkout(data, today, nextSplitDay(data, today), lastWeightFn(data));
    return { kind, title: workout.gym!.routineName, reason: why, workout };
  }

  const isWeekend = dow(today) >= 5;
  const cat: RunCategory =
    !st.hasLongRun && (runNeed === 1 || isWeekend) ? 'tirada' : qualityOrder(weekNumber(today), st.inWeek)[0];
  const workout = runWorkout(today, cat, pickTemplate(data, cat, today));
  const km = workout.run!.distanceKm;
  return { kind, title: `${workout.run!.name}${km ? ` · ${formatKm(km)}` : ''}`, reason: why, workout };
}
