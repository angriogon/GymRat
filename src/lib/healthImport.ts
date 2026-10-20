import type { Kind, Workout } from './types';
import { toISO } from './dates';
import { uid } from './format';

/**
 * Importación desde Apple Salud mediante un Atajo de iOS.
 * El atajo copia una línea por entrenamiento:
 *   GYMRAT|inicio ISO|fin ISO|distancia|tipo|fuente
 * Ejemplo: GYMRAT|2026-10-19T18:30:00+02:00|2026-10-19T19:15:30+02:00|8,52 km|Carrera|Forerunner
 */

export interface HealthEntry {
  key: string; // externalId estable: mismo entrenamiento => misma clave
  startedAt: string;
  date: string; // YYYY-MM-DD local
  durationSec: number;
  distanceKm: number;
  label: string;
  source: string;
  suggested: Kind | null;
}

const RUN_RE = /carrera|correr|running|\brun\b|trail|cinta|treadmill|jogging|footing/i;
const GYM_RE = /fuerza|strength|pesas|weight|funcional|functional|gimnasio|\bgym\b|core|crossfit|hiit|entrenamiento cruzado|cross training/i;

export function classify(label: string): Kind | null {
  if (RUN_RE.test(label)) return 'run';
  if (GYM_RE.test(label)) return 'gym';
  return null;
}

/** "8,52 km", "8.52km", "8.520 m", "5,3 mi", "8,5" -> km. */
export function parseDistanceKm(raw: string): number {
  const m = raw.trim().match(/([\d.,]+)\s*(km|kilómetros?|kilometers?|mi|millas?|miles?|m|metros?|meters?)?/i);
  if (!m) return 0;
  let num = m[1];
  const unit = (m[2] ?? '').toLowerCase();
  if (num.includes('.') && num.includes(',')) num = num.replace(/\./g, '').replace(',', '.');
  else if (num.includes(',')) num = num.replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(num) && (unit.startsWith('m') && !unit.startsWith('mi'))) num = num.replace(/\./g, '');
  const v = parseFloat(num);
  if (!Number.isFinite(v) || v <= 0) return 0;
  let km: number;
  if (unit.startsWith('k')) km = v;
  else if (unit.startsWith('mi') || unit.startsWith('mil')) km = v * 1.609344;
  else if (unit.startsWith('m')) km = v / 1000;
  else km = v > 200 ? v / 1000 : v; // sin unidad: valores grandes son metros
  return Math.round(km * 100) / 100;
}

export function parseHealthText(text: string): HealthEntry[] {
  const out: HealthEntry[] = [];
  for (const line of text.split(/\r?\n/)) {
    const parts = line.split('|').map((p) => p.trim());
    if (parts[0]?.toUpperCase() !== 'GYMRAT' || parts.length < 3) continue;
    const start = new Date(parts[1]);
    if (Number.isNaN(start.getTime())) continue;
    const end = new Date(parts[2]);
    const durationSec = Number.isNaN(end.getTime()) ? 0 : Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
    const label = parts[4] ?? '';
    const source = parts[5] ?? '';
    out.push({
      key: `health:${start.toISOString().slice(0, 16)}`,
      startedAt: start.toISOString(),
      date: toISO(start),
      durationSec,
      distanceKm: parseDistanceKm(parts[3] ?? ''),
      label: label || 'Entrenamiento',
      source,
      suggested: classify(`${label} ${source}`),
    });
  }
  // Más reciente primero y sin repetir la misma clave dentro del mismo pegado.
  const seen = new Set<string>();
  return out
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .filter((e) => (seen.has(e.key) ? false : (seen.add(e.key), true)));
}

export type Choice = Kind | 'skip';

export interface ImportRow {
  entry: HealthEntry;
  choice: Choice;
  note?: string; // por qué se propone no importar o qué se hará
}

const OVERLAP_MS = 15 * 60 * 1000;

/** Propone qué hacer con cada entrada sin tocar nada: el usuario confirma en la vista previa. */
export function proposeImport(entries: HealthEntry[], workouts: Workout[]): ImportRow[] {
  const imported = new Set(workouts.map((w) => w.externalId).filter(Boolean));
  const rows: ImportRow[] = entries.map((entry) => ({ entry, choice: entry.suggested ?? 'skip' }));

  const startMs = (iso: string) => new Date(iso).getTime();
  for (const row of rows) {
    const e = row.entry;
    // Ya importada esta misma entrada, o la misma sesión grabada por el otro reloj.
    const twinImported = workouts.some(
      (w) => w.startedAt && w.kind === e.suggested && Math.abs(startMs(w.startedAt) - startMs(e.startedAt)) < OVERLAP_MS,
    );
    if (imported.has(e.key) || twinImported) {
      row.choice = 'skip';
      row.note = 'Ya importado';
    } else if (!e.suggested) {
      row.note = 'Tipo no reconocido';
    }
  }

  // Misma sesión grabada por los dos relojes: se queda la de mayor distancia (o duración).
  for (const row of rows) {
    if (row.choice === 'skip') continue;
    const twin = rows.find(
      (o) =>
        o !== row &&
        o.choice === row.choice &&
        Math.abs(new Date(o.entry.startedAt).getTime() - new Date(row.entry.startedAt).getTime()) < OVERLAP_MS,
    );
    if (!twin) continue;
    const score = (r: ImportRow) => r.entry.distanceKm * 1e6 + r.entry.durationSec;
    const loser = score(twin) >= score(row) ? row : twin;
    loser.choice = 'skip';
    loser.note = 'Duplicado (grabado por los dos relojes)';
  }

  // Ya registrada a mano ese día: no se importa por defecto para no duplicar.
  for (const row of rows) {
    if (row.choice === 'skip') continue;
    const manual = workouts.some(
      (w) => w.status === 'done' && !w.externalId && w.kind === row.choice && w.date === row.entry.date,
    );
    if (manual) {
      row.choice = 'skip';
      row.note = 'Ya tienes una sesión de este tipo ese día';
    }
  }
  return rows;
}

/** Convierte las filas confirmadas en sesiones. Completa las planificadas del mismo día y tipo. */
export function applyImport(rows: ImportRow[], workouts: Workout[]): Workout[] {
  const usedPlans = new Set<string>();
  const result: Workout[] = [];
  for (const { entry: e, choice } of rows) {
    if (choice === 'skip') continue;
    const plan = workouts.find(
      (w) => w.status === 'planned' && w.kind === choice && w.date === e.date && !usedPlans.has(w.id),
    );
    if (plan) usedPlans.add(plan.id);
    const base: Workout = plan
      ? { ...plan }
      : { id: uid(), createdAt: Date.now(), date: e.date, kind: choice, status: 'done' };
    base.status = 'done';
    base.externalId = e.key;
    base.source = e.source || undefined;
    base.startedAt = e.startedAt;
    if (choice === 'run') {
      base.run = { runType: plan?.run?.runType ?? 'rodaje', distanceKm: e.distanceKm, durationSec: e.durationSec };
      base.gym = undefined;
    } else {
      base.gym = { routineName: plan?.gym?.routineName ?? '', exercises: plan?.gym?.exercises ?? [], durationSec: e.durationSec };
      base.run = undefined;
    }
    result.push(base);
  }
  return result;
}

/** Cuántas filas completarán una sesión planificada (para el resumen de la vista previa). */
export function countPlanMatches(rows: ImportRow[], workouts: Workout[]): number {
  return applyImport(rows, workouts).filter((w) => workouts.some((p) => p.id === w.id)).length;
}
