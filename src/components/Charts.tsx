interface Bar {
  label: string;
  value: number;
  highlight?: boolean;
}

/** Gráfico de barras simple en SVG, sin dependencias. */
export function BarChart({ data, unit, goal, tone = 'run' }: { data: Bar[]; unit: string; goal?: number; tone?: 'run' | 'gym' }) {
  const max = Math.max(goal ?? 0, ...data.map((d) => d.value), 1);
  const w = 100 / data.length;
  return (
    <div className="chart">
      <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="chart-svg" role="img" aria-label={`Gráfico en ${unit}`}>
        {goal ? (
          <line x1="0" x2="100" y1={60 - (goal / max) * 56} y2={60 - (goal / max) * 56} className="chart-goal" vectorEffect="non-scaling-stroke" />
        ) : null}
        {data.map((d, i) => {
          const h = (d.value / max) * 56;
          return (
            <rect
              key={i}
              x={i * w + w * 0.18}
              width={w * 0.64}
              y={60 - h}
              height={Math.max(h, d.value ? 0.8 : 0)}
              rx="1"
              className={d.highlight ? `bar bar-hl ${tone}` : 'bar'}
            >
              <title>{`${d.label}: ${d.value.toLocaleString('es-ES', { maximumFractionDigits: 1 })} ${unit}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="chart-labels">
        {data.map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

/** Línea de progresión (p. ej. 1RM estimado por sesión). */
export function LineChart({ values, labels }: { values: number[]; labels: string[] }) {
  if (values.length < 2) return <p className="muted small">Registra al menos dos sesiones de este ejercicio para ver la evolución.</p>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 100, 54 - ((v - min) / span) * 48] as const);
  return (
    <div className="chart">
      <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="chart-svg" role="img" aria-label="Evolución">
        <polyline points={pts.map((p) => p.join(',')).join(' ')} className="line" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="chart-labels spread">
        <span>{labels[0]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}
