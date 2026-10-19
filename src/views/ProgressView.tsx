import { useMemo, useState } from 'react';
import type { AppData } from '../lib/types';
import { formatShort, today } from '../lib/dates';
import { formatDuration, formatKg, formatKm, formatPace } from '../lib/format';
import { exerciseHistory, lastWeeks, runTotals } from '../lib/stats';
import { BarChart, LineChart } from '../components/Charts';

export function ProgressView({ data }: { data: AppData }) {
  const [weeksN, setWeeksN] = useState(8);
  const weeks = lastWeeks(data.workouts, today(), weeksN);
  const totals = runTotals(data.workouts);
  const history = useMemo(() => exerciseHistory(data.workouts), [data.workouts]);
  // Solo ejercicios con peso registrado (los de peso corporal no tienen progresión en kg).
  const exerciseKeys = [...history.keys()]
    .filter((k) => history.get(k)!.points.some((p) => p.topWeight > 0))
    .sort((a, b) => a.localeCompare(b, 'es'));
  const [selected, setSelected] = useState('');
  const exKey = exerciseKeys.includes(selected) ? selected : exerciseKeys[0] ?? '';
  const ex = exKey ? history.get(exKey) : undefined;

  const label = (start: string) => formatShort(start).replace(/\s\w+\.?$/, '');

  return (
    <div className="view">
      <header className="view-head">
        <h1>Progreso</h1>
        <div className="chips">
          {[4, 8, 12].map((n) => (
            <button key={n} className={`chip ${weeksN === n ? 'on' : ''}`} onClick={() => setWeeksN(n)}>
              {n} semanas
            </button>
          ))}
        </div>
      </header>

      <section className="card pad">
        <h2 className="card-title">Kilómetros por semana</h2>
        <BarChart
          unit="km"
          goal={data.settings.weeklyKmGoal}
          data={weeks.map((w, i) => ({ label: label(w.start), value: w.km, highlight: i === weeks.length - 1 }))}
        />
        <p className="muted small">La línea marca tu objetivo semanal ({data.settings.weeklyKmGoal} km).</p>
      </section>

      <section className="card pad">
        <h2 className="card-title">Sesiones de gimnasio por semana</h2>
        <BarChart
          unit="sesiones"
          tone="gym"
          goal={data.settings.weeklyGymGoal}
          data={weeks.map((w, i) => ({ label: label(w.start), value: w.gymCount, highlight: i === weeks.length - 1 }))}
        />
      </section>

      <section>
        <h2 className="section-title">Running total</h2>
        <div className="stats-grid">
          <div className="card stat">
            <span className="stat-label">Distancia</span>
            <span className="stat-value">{formatKm(totals.km)}</span>
            <span className="muted small">{totals.count} carreras</span>
          </div>
          <div className="card stat">
            <span className="stat-label">Tiempo</span>
            <span className="stat-value">{formatDuration(totals.sec)}</span>
            <span className="muted small">Ritmo medio {formatPace(totals.km, totals.sec)}</span>
          </div>
          <div className="card stat">
            <span className="stat-label">Tirada más larga</span>
            <span className="stat-value">{totals.longest ? formatKm(totals.longest.run!.distanceKm) : '—'}</span>
            <span className="muted small">{totals.longest ? formatShort(totals.longest.date) : 'Sin datos'}</span>
          </div>
          <div className="card stat">
            <span className="stat-label">Mejor ritmo (≥3 km)</span>
            <span className="stat-value">
              {totals.fastest ? formatPace(totals.fastest.run!.distanceKm, totals.fastest.run!.durationSec) : '—'}
            </span>
            <span className="muted small">
              {totals.fastest ? `${formatKm(totals.fastest.run!.distanceKm)} · ${formatShort(totals.fastest.date)}` : 'Sin datos'}
            </span>
          </div>
        </div>
      </section>

      <section className="card pad">
        <h2 className="card-title">Fuerza por ejercicio</h2>
        {ex ? (
          <>
            <select value={exKey} onChange={(e) => setSelected(e.target.value)} aria-label="Ejercicio">
              {exerciseKeys.map((k) => (
                <option key={k} value={k}>
                  {history.get(k)!.name}
                </option>
              ))}
            </select>
            <div className="stats-grid compact">
              <div className="stat">
                <span className="stat-label">Peso máximo</span>
                <span className="stat-value">{formatKg(Math.max(...ex.points.map((p) => p.topWeight)))}</span>
              </div>
              <div className="stat">
                <span className="stat-label">1RM estimado</span>
                <span className="stat-value">{formatKg(Math.max(...ex.points.map((p) => p.best1RM)))}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Sesiones</span>
                <span className="stat-value">{ex.points.length}</span>
              </div>
            </div>
            <LineChart values={ex.points.map((p) => p.best1RM)} labels={ex.points.map((p) => formatShort(p.date))} />
            <p className="muted small">1RM estimado con la fórmula de Epley a partir de tu mejor serie de cada sesión.</p>
          </>
        ) : (
          <p className="muted">Registra sesiones de gimnasio con series y peso para ver tu evolución.</p>
        )}
      </section>
    </div>
  );
}
