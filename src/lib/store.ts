import { useCallback, useEffect, useState } from 'react';
import type { AppData, Routine, Settings, Workout } from './types';
import { uid } from './format';

const KEY = 'gymrat:data';

const DEFAULT_ROUTINES: Routine[] = [
  {
    id: uid(),
    name: 'Full body A',
    exercises: [
      { name: 'Sentadilla', sets: 4, reps: 8 },
      { name: 'Press banca', sets: 4, reps: 8 },
      { name: 'Remo con barra', sets: 3, reps: 10 },
      { name: 'Plancha (seg)', sets: 3, reps: 45 },
    ],
  },
  {
    id: uid(),
    name: 'Full body B',
    exercises: [
      { name: 'Peso muerto', sets: 3, reps: 5 },
      { name: 'Press militar', sets: 4, reps: 8 },
      { name: 'Dominadas', sets: 3, reps: 8 },
      { name: 'Zancadas', sets: 3, reps: 10 },
    ],
  },
];

export function emptyData(): AppData {
  return {
    version: 1,
    workouts: [],
    routines: DEFAULT_ROUTINES,
    settings: { weeklyKmGoal: 20, weeklyGymGoal: 3 },
  };
}

/** Valida y normaliza datos externos (localStorage o importación JSON). */
export function parseData(raw: unknown): AppData | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<AppData>;
  if (!Array.isArray(r.workouts) || !Array.isArray(r.routines)) return null;
  const base = emptyData();
  const workouts = r.workouts.filter(
    (w): w is Workout =>
      !!w &&
      typeof w.id === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(w.date) &&
      (w.kind === 'run' || w.kind === 'gym') &&
      (w.status === 'planned' || w.status === 'done'),
  );
  const routines = r.routines.filter(
    (x): x is Routine => !!x && typeof x.id === 'string' && typeof x.name === 'string' && Array.isArray(x.exercises),
  );
  return {
    version: 1,
    workouts,
    routines,
    settings: { ...base.settings, ...(r.settings ?? {}) },
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
  saveRoutine: (r: Routine) => void;
  deleteRoutine: (id: string) => void;
  updateSettings: (s: Partial<Settings>) => void;
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
    saveRoutine: useCallback((r) => setData((d) => ({ ...d, routines: upsert(d.routines, r) })), []),
    deleteRoutine: useCallback((id) => setData((d) => ({ ...d, routines: d.routines.filter((r) => r.id !== id) })), []),
    updateSettings: useCallback((s) => setData((d) => ({ ...d, settings: { ...d.settings, ...s } })), []),
    replaceAll: useCallback((d) => setData(d), []),
  };
}
