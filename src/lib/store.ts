import { useCallback, useEffect, useState } from 'react';
import type { AppData, LibraryExercise, RunTemplate, Settings, StrengthCategory, Workout } from './types';
import { DEFAULT_GYM_SPLIT, STRENGTH_CATEGORIES, defaultLibrary } from './library';

const KEY = 'gymrat:data';

export function emptyData(): AppData {
  return {
    version: 1,
    workouts: [],
    library: defaultLibrary(),
    settings: { weeklyKmGoal: 20, weeklyGymGoal: 3, trainDays: [0, 1, 3, 4, 5], gymSplit: DEFAULT_GYM_SPLIT },
  };
}

function validSplit(raw: unknown): StrengthCategory[][] | null {
  if (!Array.isArray(raw)) return null;
  const days = raw
    .filter(Array.isArray)
    .map((d: unknown[]) => d.filter((c): c is StrengthCategory => typeof c === 'string' && c in STRENGTH_CATEGORIES))
    .filter((d) => d.length > 0);
  return days.length ? days : null;
}

/** Valida y normaliza datos externos (localStorage o importación JSON). */
export function parseData(raw: unknown): AppData | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<AppData>;
  if (!Array.isArray(r.workouts)) return null;
  const base = emptyData();
  const workouts = r.workouts.filter(
    (w): w is Workout =>
      !!w &&
      typeof w.id === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(w.date) &&
      (w.kind === 'run' || w.kind === 'gym') &&
      (w.status === 'planned' || w.status === 'done'),
  );
  // Datos anteriores a la biblioteca: se crea la biblioteca por defecto.
  const lib = r.library;
  const library =
    lib && Array.isArray(lib.exercises) && Array.isArray(lib.runs)
      ? {
          exercises: lib.exercises.filter((x): x is LibraryExercise => !!x && typeof x.id === 'string' && typeof x.name === 'string'),
          runs: lib.runs.filter((x): x is RunTemplate => !!x && typeof x.id === 'string' && typeof x.name === 'string'),
        }
      : base.library;
  return {
    version: 1,
    workouts,
    library,
    settings: { ...base.settings, ...(r.settings ?? {}), gymSplit: validSplit(r.settings?.gymSplit) ?? base.settings.gymSplit },
  };
}

function load(): AppData {
  try {
    const txt = localStorage.getItem(KEY);
    if (!txt) return emptyData();
    return parseData(JSON.parse(txt)) ?? emptyData();
  } catch {
    return emptyData();
  }
}

export interface Store {
  data: AppData;
  saveWorkout: (w: Workout) => void;
  deleteWorkout: (id: string) => void;
  updateSettings: (s: Partial<Settings>) => void;
  saveLibExercise: (e: LibraryExercise) => void;
  deleteLibExercise: (id: string) => void;
  saveRunTemplate: (r: RunTemplate) => void;
  deleteRunTemplate: (id: string) => void;
  replaceAll: (d: AppData) => void;
}

export function useStore(): Store {
  const [data, setData] = useState<AppData>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // Almacenamiento lleno o bloqueado: la app sigue funcionando en memoria.
    }
  }, [data]);

  const upsert = <T extends { id: string }>(list: T[], item: T) =>
    list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];

  return {
    data,
    saveWorkout: useCallback((w) => setData((d) => ({ ...d, workouts: upsert(d.workouts, w) })), []),
    deleteWorkout: useCallback((id) => setData((d) => ({ ...d, workouts: d.workouts.filter((w) => w.id !== id) })), []),
    updateSettings: useCallback((s) => setData((d) => ({ ...d, settings: { ...d.settings, ...s } })), []),
    saveLibExercise: useCallback(
      (e) => setData((d) => ({ ...d, library: { ...d.library, exercises: upsert(d.library.exercises, e) } })),
      [],
    ),
    deleteLibExercise: useCallback(
      (id) => setData((d) => ({ ...d, library: { ...d.library, exercises: d.library.exercises.filter((e) => e.id !== id) } })),
      [],
    ),
    saveRunTemplate: useCallback((r) => setData((d) => ({ ...d, library: { ...d.library, runs: upsert(d.library.runs, r) } })), []),
    deleteRunTemplate: useCallback(
      (id) => setData((d) => ({ ...d, library: { ...d.library, runs: d.library.runs.filter((r) => r.id !== id) } })),
      [],
    ),
    replaceAll: useCallback((d) => setData(d), []),
  };
}
