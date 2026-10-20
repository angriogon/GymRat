import { useState } from 'react';
import type { LibraryExercise, RunCategory, RunTemplate, StrengthCategory } from '../lib/types';
import type { Store } from '../lib/store';
import { RUN_CATEGORIES, STRENGTH_CATEGORIES } from '../lib/library';
import { formatKm, uid } from '../lib/format';
import { Sheet } from '../components/Sheet';
import { Icon } from '../components/Icon';

type Section = 'fuerza' | 'running';

const toInt = (v: string, min: number) => Math.max(min, parseInt(v) || 0);

function ExerciseForm({
  item,
  isNew,
  onSave,
  onDelete,
  onClose,
}: {
  item: LibraryExercise;
  isNew: boolean;
  onSave: (e: LibraryExercise) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [sets, setSets] = useState(String(item.sets));
  const [reps, setReps] = useState(String(item.reps));
  const [notes, setNotes] = useState(item.notes ?? '');
  const [error, setError] = useState('');

  const save = () => {
    if (!name.trim()) return setError('Ponle un nombre al ejercicio.');
    onSave({ id: item.id, name: name.trim(), category, sets: toInt(sets, 1), reps: toInt(reps, 0), notes: notes.trim() || undefined });
  };

  return (
    <Sheet
      title={isNew ? 'Nuevo ejercicio' : 'Editar ejercicio'}
      onClose={onClose}
      footer={
        <>
          {!isNew && (
            <button className="btn ghost danger" onClick={() => confirm('¿Eliminar este ejercicio de la biblioteca?') && onDelete()}>
              <Icon name="trash" size={18} /> Eliminar
            </button>
          )}
          <span className="spacer" />
          <button className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" onClick={save}>
            Guardar
          </button>
        </>
      }
    >
      <label className="field">
        <span>Nombre</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Press banca con barra" />
      </label>
      <label className="field">
        <span>Grupo</span>
        <select value={category} onChange={(e) => setCategory(e.target.value as StrengthCategory)}>
          {(Object.keys(STRENGTH_CATEGORIES) as StrengthCategory[]).map((c) => (
            <option key={c} value={c}>
              {STRENGTH_CATEGORIES[c]}
            </option>
          ))}
        </select>
      </label>
      <div className="row">
        <label className="field">
          <span>Series</span>
          <input inputMode="numeric" value={sets} onChange={(e) => setSets(e.target.value)} />
        </label>
        <label className="field">
          <span>Repeticiones (o segundos)</span>
          <input inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} />
        </label>
      </div>
      <label className="field">
        <span>Notas</span>
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Técnica, máquina, variante…" />
      </label>
      {error && <p className="error">{error}</p>}
    </Sheet>
  );
}

function RunForm({
  item,
  isNew,
  onSave,
  onDelete,
  onClose,
}: {
  item: RunTemplate;
  isNew: boolean;
  onSave: (r: RunTemplate) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [distance, setDistance] = useState(item.distanceKm ? String(item.distanceKm).replace('.', ',') : '');
  const [session, setSession] = useState(item.session);
  const [error, setError] = useState('');

  const save = () => {
    if (!name.trim()) return setError('Ponle un nombre al entrenamiento.');
    const km = parseFloat(distance.replace(',', '.'));
    onSave({ id: item.id, name: name.trim(), category, distanceKm: Number.isFinite(km) && km > 0 ? km : 0, session: session.trim() });
  };

  return (
    <Sheet
      title={isNew ? 'Nuevo entrenamiento' : 'Editar entrenamiento'}
      onClose={onClose}
      footer={
        <>
          {!isNew && (
            <button className="btn ghost danger" onClick={() => confirm('¿Eliminar este entrenamiento de la biblioteca?') && onDelete()}>
              <Icon name="trash" size={18} /> Eliminar
            </button>
          )}
          <span className="spacer" />
          <button className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" onClick={save}>
            Guardar
          </button>
        </>
      }
    >
      <label className="field">
        <span>Nombre</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Series 1000 m" />
      </label>
      <div className="row">
        <label className="field">
          <span>Categoría</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as RunCategory)}>
            {(Object.keys(RUN_CATEGORIES) as RunCategory[]).map((c) => (
              <option key={c} value={c}>
                {RUN_CATEGORIES[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Distancia aprox. (km)</span>
          <input inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="9" />
        </label>
      </div>
      <label className="field">
        <span>Sesión</span>
        <textarea
          rows={4}
          value={session}
          onChange={(e) => setSession(e.target.value)}
          placeholder="Calentamiento 15 min · 6 × 1000 m a ritmo 10K, rec. 2 min · 10 min suave"
        />
      </label>
      {error && <p className="error">{error}</p>}
    </Sheet>
  );
}

export function LibraryView({ store }: { store: Store }) {
  const { library } = store.data;
  const [section, setSection] = useState<Section>('fuerza');
  const [strengthCat, setStrengthCat] = useState<StrengthCategory>('pecho');
  const [runCat, setRunCat] = useState<RunCategory>('tirada');
  const [editEx, setEditEx] = useState<{ item: LibraryExercise; isNew: boolean } | null>(null);
  const [editRun, setEditRun] = useState<{ item: RunTemplate; isNew: boolean } | null>(null);

  const exercises = library.exercises.filter((e) => e.category === strengthCat);
  const runs = library.runs.filter((r) => r.category === runCat);

  return (
    <div className="view">
      <header className="view-head">
        <h1>Biblioteca</h1>
        <div className="segmented">
          <button className={section === 'fuerza' ? 'on gym' : ''} onClick={() => setSection('fuerza')}>
            <Icon name="gym" size={18} /> Fuerza
          </button>
          <button className={section === 'running' ? 'on run' : ''} onClick={() => setSection('running')}>
            <Icon name="run" size={18} /> Running
          </button>
        </div>
      </header>

      {section === 'fuerza' ? (
        <>
          <div className="chips">
            {(Object.keys(STRENGTH_CATEGORIES) as StrengthCategory[]).map((c) => (
              <button key={c} className={`chip ${strengthCat === c ? 'on' : ''}`} onClick={() => setStrengthCat(c)}>
                {STRENGTH_CATEGORIES[c]}
                <span className="chip-count">{library.exercises.filter((e) => e.category === c).length}</span>
              </button>
            ))}
          </div>
          <div className="stack">
            {exercises.map((e) => (
              <button key={e.id} className="list-item" onClick={() => setEditEx({ item: e, isNew: false })}>
                <span className="list-item-text">
                  <span>{e.name}</span>
                  {e.notes && <span className="muted small">{e.notes}</span>}
                </span>
                <span className="muted small nowrap">
                  {e.sets}×{e.reps}
                </span>
              </button>
            ))}
            {!exercises.length && <p className="muted empty">Sin ejercicios en este grupo.</p>}
          </div>
          <button
            className="btn outline full"
            onClick={() => setEditEx({ item: { id: uid(), name: '', category: strengthCat, sets: 3, reps: 10 }, isNew: true })}
          >
            <Icon name="plus" size={18} /> Nuevo ejercicio en {STRENGTH_CATEGORIES[strengthCat]}
          </button>
        </>
      ) : (
        <>
          <div className="chips">
            {(Object.keys(RUN_CATEGORIES) as RunCategory[]).map((c) => (
              <button key={c} className={`chip ${runCat === c ? 'on' : ''}`} onClick={() => setRunCat(c)}>
                {RUN_CATEGORIES[c]}
                <span className="chip-count">{library.runs.filter((r) => r.category === c).length}</span>
              </button>
            ))}
          </div>
          <div className="stack">
            {runs.map((r) => (
              <button key={r.id} className="list-item tall" onClick={() => setEditRun({ item: r, isNew: false })}>
                <span className="list-item-text">
                  <strong>{r.name}</strong>
                  <span className="muted small">{r.session}</span>
                </span>
                {r.distanceKm > 0 && <span className="muted small nowrap">{formatKm(r.distanceKm)}</span>}
              </button>
            ))}
            {!runs.length && <p className="muted empty">Sin entrenamientos en esta categoría.</p>}
          </div>
          <button
            className="btn outline full"
            onClick={() => setEditRun({ item: { id: uid(), name: '', category: runCat, distanceKm: 0, session: '' }, isNew: true })}
          >
            <Icon name="plus" size={18} /> Nuevo entrenamiento de {RUN_CATEGORIES[runCat]}
          </button>
        </>
      )}

      <p className="muted small center">Al planificar un día, elige desde el editor de la sesión → "biblioteca".</p>

      {editEx && (
        <ExerciseForm
          item={editEx.item}
          isNew={editEx.isNew}
          onClose={() => setEditEx(null)}
          onSave={(e) => {
            store.saveLibExercise(e);
            setStrengthCat(e.category);
            setEditEx(null);
          }}
          onDelete={() => {
            store.deleteLibExercise(editEx.item.id);
            setEditEx(null);
          }}
        />
      )}
      {editRun && (
        <RunForm
          item={editRun.item}
          isNew={editRun.isNew}
          onClose={() => setEditRun(null)}
          onSave={(r) => {
            store.saveRunTemplate(r);
            setRunCat(r.category);
            setEditRun(null);
          }}
          onDelete={() => {
            store.deleteRunTemplate(editRun.item.id);
            setEditRun(null);
          }}
        />
      )}
    </div>
  );
}
