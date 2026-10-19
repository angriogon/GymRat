/** Segundos -> "h:mm:ss" o "mm:ss". */
export function formatDuration(sec: number): string {
  if (!sec || sec < 0) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  const mm = String(m).padStart(h ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Ritmo en min/km. */
export function formatPace(distanceKm: number, durationSec: number): string {
  if (!distanceKm || !durationSec) return '—';
  const secPerKm = durationSec / distanceKm;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return s === 60 ? `${m + 1}:00 /km` : `${m}:${String(s).padStart(2, '0')} /km`;
}

export function formatKm(km: number): string {
  return `${km.toLocaleString('es-ES', { maximumFractionDigits: 1 })} km`;
}

export function formatKg(kg: number): string {
  return `${kg.toLocaleString('es-ES', { maximumFractionDigits: 1 })} kg`;
}

/** 1RM estimado (fórmula de Epley). Con 1 repetición devuelve el propio peso. */
export function estimate1RM(weight: number, reps: number): number {
  if (!weight || !reps) return 0;
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
