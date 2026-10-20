import { useState } from 'react';
import type { Library, LibraryExercise, RunCategory, RunTemplate, StrengthCategory } from '../lib/types';
import { RUN_CATEGORIES, STRENGTH_CATEGORIES } from '../lib/library';
import { formatKm } from '../lib/format';
import { Icon } from './Icon';

/** Elegir grupos musculares del día y marcar ejercicios de la biblioteca. */
export function ExercisePicker({
  library,
  onAdd,
  onCancel,
}: {
  library: Library;
  onAdd: (exercises: LibraryExercise[], categories: StrengthCategory[]) => void;
  onCancel: () => void;
}) {
  const [cats, setCats] = useState<StrengthCategory[]>([]);
  const [picked, setPicked] = useState<string[]>([]);

  const toggleCat = (c: StrengthCategory) =>
    setCats((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]));
  const toggle = (id: string) => setPicked((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  // Respeta el orden de la biblioteca, agrupado por el orden en que se eligieron los grupos.
  const chosen = cats.flatMap((c) => library.exercises.filter((e) => e.category === c && picked.includes(e.id)));

  return (
    <div className="picker">
      <div className="picker-head">
        <strong>Grupos del día</strong>
        <button className="icon-btn small" onClick={onCancel} aria-label="Cerrar biblioteca">
          <Icon name="x" size={16} />
        </button>
      </div>
      <div className="chips">
        {(Object.keys(STRENGTH_CATEGORIES) as StrengthCategory[]).map((c) => (
          <button key={c} className={`chip ${cats.includes(c) ? 'on' : ''}`} onClick={() => toggleCat(c)}>
            {STRENGTH_CATEGORIES[c]}
          </button>
        ))}
      </div>
      {cats.length === 0 && <p className="muted small">Elige uno o varios grupos para ver sus ejercicios.</p>}
      {cats.map((c) => {
        const items = library.exercises.filter((e) => e.category === c);
        const allOn = items.length > 0 && items.every((e) => picked.includes(e.id));
        return (
          <div key={c} className="picker-group">
            <div className="picker-group-head">
              <span>{STRENGTH_CATEGORIES[c]}</span>
              <button
                className="link small"
                onClick={() =>
                  setPicked((l) => (allOn ? l.filter((id) => !items.some((e) => e.id === id)) : [...new Set([...l, ...items.map((e) => e.id)])]))
                }
              >
                {allOn ? 'Ninguno' : 'Todos'}
              </button>
            </div>
            {items.length === 0 && <p className="muted small">Sin ejercicios. Añádelos en Biblioteca.</p>}
            {items.map((e) => (
              <label key={e.id} className="check-row">
                <input type="checkbox" checked={picked.includes(e.id)} onChange={() => toggle(e.id)} />
                <span>{e.name}</span>
                <span className="muted small">
                  {e.sets}×{e.reps}
                </span>
              </label>
            ))}
          </div>
        );
      })}
      {cats.length > 0 && (
        <button className="btn primary full" disabled={!chosen.length} onClick={() => onAdd(chosen, cats)}>
          Añadir {chosen.length} {chosen.length === 1 ? 'ejercicio' : 'ejercicios'}
        </button>
      )}
    </div>
  );
}

/** Elegir un entrenamiento de carrera de la biblioteca. */
export function RunPicker({
  library,
  onPick,
  onCancel,
}: {
  library: Library;
  onPick: (t: RunTemplate) => void;
  onCancel: () => void;
}) {
  const [cat, setCat] = useState<RunCategory>('series');
  const items = library.runs.filter((r) => r.category === cat);
  return (
    <div className="picker">
      <div className="picker-head">
        <strong>Biblioteca de running</strong>
        <button className="icon-btn small" onClick={onCancel} aria-label="Cerrar biblioteca">
          <Icon name="x" size={16} />
        </button>
      </div>
      <div className="chips">
        {(Object.keys(RUN_CATEGORIES) as RunCategory[]).map((c) => (
          <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>
            {RUN_CATEGORIES[c]}
          </button>
        ))}
      </div>
      {items.length === 0 && <p className="muted small">Sin entrenamientos en esta categoría. Añádelos en Biblioteca.</p>}
      <div className="stack">
        {items.map((t) => (
          <button key={t.id} className="list-item tall" onClick={() => onPick(t)}>
            <span className="list-item-text">
              <strong>{t.name}</strong>
              <span className="muted small">{t.session}</span>
            </span>
            {t.distanceKm > 0 && <span className="muted small nowrap">{formatKm(t.distanceKm)}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
