export type Kind = 'run' | 'gym';
export type Status = 'planned' | 'done';
export type RunType = 'rodaje' | 'series' | 'tempo' | 'tirada' | 'competicion';

export interface SetEntry {
  reps: number;
  weight: number; // kg
}

export interface ExerciseEntry {
  name: string;
  sets: SetEntry[];
}

export interface RunData {
  runType: RunType;
  distanceKm: number;
  durationSec: number;
}

export interface GymData {
  routineName: string;
  exercises: ExerciseEntry[];
  durationSec?: number; // llega al importar desde Apple Salud
}

/** Una sesión, planificada o realizada. Planificar y registrar comparten modelo:
 *  completar una sesión planificada es simplemente pasarla a status "done". */
export interface Workout {
  id: string;
  date: string; // YYYY-MM-DD (fecha local)
  kind: Kind;
  status: Status;
  run?: RunData;
  gym?: GymData;
  rpe?: number; // esfuerzo percibido 1-10
  notes?: string;
  createdAt: number;
  /** Solo en sesiones importadas de Apple Salud: evitan duplicados al reimportar. */
  externalId?: string;
  source?: string; // reloj o app de origen
  startedAt?: string; // ISO con hora
}

export interface RoutineExercise {
  name: string;
  sets: number;
  reps: number;
}

export interface Routine {
  id: string;
  name: string;
  exercises: RoutineExercise[];
}

export interface Settings {
  weeklyKmGoal: number;
  weeklyGymGoal: number;
}

export interface AppData {
  version: 1;
  workouts: Workout[];
  routines: Routine[];
  settings: Settings;
}

export const RUN_TYPES: Record<RunType, string> = {
  rodaje: 'Rodaje',
  series: 'Series',
  tempo: 'Tempo',
  tirada: 'Tirada larga',
  competicion: 'Competición',
};
