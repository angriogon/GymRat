// Todas las fechas se guardan como YYYY-MM-DD en hora local para evitar
// desfases de un día al convertir a UTC.

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function today(): string {
  return toISO(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Lunes de la semana de la fecha dada. */
export function weekStart(iso: string): string {
  const d = fromISO(iso);
  const dow = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - dow);
  return toISO(d);
}

export function weekDays(startIso: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(startIso, i));
}

const fmtLong = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtShort = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
const fmtDow = new Intl.DateTimeFormat('es-ES', { weekday: 'short' });
const fmtMonth = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const formatLong = (iso: string) => cap(fmtLong.format(fromISO(iso)));
export const formatShort = (iso: string) => fmtShort.format(fromISO(iso));
export const formatDow = (iso: string) => cap(fmtDow.format(fromISO(iso)).replace('.', ''));
export const formatMonth = (iso: string) => cap(fmtMonth.format(fromISO(iso)));

export function relativeDay(iso: string): string {
  const t = today();
  if (iso === t) return 'Hoy';
  if (iso === addDays(t, 1)) return 'Mañana';
  if (iso === addDays(t, -1)) return 'Ayer';
  return formatLong(iso);
}
