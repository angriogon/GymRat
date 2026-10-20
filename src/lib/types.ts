export type Kind = 'run' | 'gym';
export type Status = 'planned' | 'done';
export type RunType = 'rodaje' | 'series' | 'fartlek' | 'tempo' | 'tirada' | 'competicion';

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
  name?: string; // p. ej. "Series 1000 m" (viene de la biblioteca)
  session?: string; // estructura de la sesión: "6×1000 m a ritmo 10K, rec. 2'"
}

export interface GymData {
  routineName: string;
  exercises: ExerciseEntry[];
  categories?: StrengthCategory[]; // grupos trabajados (para rotar los días de gym)
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
}

export interface Settings {
  weeklyKmGoal: number;
  weeklyGymGoal: number;
  trainDays: number[]; // días de entrenamiento: 0 = lunes … 6 = domingo
  gymSplit: StrengthCategory[][]; // rotación de días de gym, p. ej. [[pecho, tríceps], [espalda-bíceps], …]
}

// ---------- Biblioteca ----------

export type StrengthCategory = 'pecho' | 'espalda-biceps' | 'triceps' | 'piernas' | 'abdominales' | 'gluteos' | 'propiocepcion';
export type RunCategory = 'tirada' | 'fartlek' | 'series';

export interface LibraryExercise {
  id: string;
  name: string;
  category: StrengthCategory;
  sets: number;
  reps: number; // repeticiones, o segundos si el nombre lo indica "(seg)"
  notes?: string;
}

export interface RunTemplate {
  id: string;
  name: string;
  category: RunCategory;
  distanceKm: number;
  session: string; // descripción de la sesión
}

export interface Library {
  exercises: LibraryExercise[];
  runs: RunTemplate[];
}

export interface AppData {
  version: 1;
  workouts: Workout[];
  library: Library;
  settings: Settings;
}

export const RUN_TYPES: Record<RunType, string> = {
  rodaje: 'Rodaje',
  series: 'Series',
  fartlek: 'Fartlek',
  tempo: 'Tempo',
  tirada: 'Tirada larga',
  competicion: 'Competición',
};
