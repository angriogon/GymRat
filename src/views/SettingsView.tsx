import { useRef, useState } from 'react';
import type { AppData, Routine, RoutineExercise } from '../lib/types';
import type { Store } from '../lib/store';
import { emptyData, parseData } from '../lib/store';
import { uid } from '../lib/format';
import { today } from '../lib/dates';
import { Sheet } from '../components/Sheet';
import { Icon } from '../components/Icon';

function RoutineEditor({
  routine,
  onSave,
  onDelete,
  onClose,
}: {
  routine: Routine;
  onSave: (r: Routine) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(routine.name);
  const [rows, setRows] = useState(
    routine.exercises.map((e) => ({ key: uid(), name: e.name, sets: String(e.sets), reps: String(e.reps) })),
  );
  const [error, setError] = useState('');

  const save = () => {
    if (!name.trim()) return setError('Ponle un nombre a la rutina.');
    const exercises: RoutineExercise[] = rows
      .filter((r) => r.name.trim())
      .map((r) => ({ name: r.name.trim(), sets: Math.max(1, parseInt(r.sets) || 1), reps: Math.max(0, parseInt(r.reps) || 0) }));
    onSave({ id: routine.id, name: name.trim(), exercises });
  };

  return (
    <Sheet
      title="Rutina"
      onClose={onClose}
      footer={
        <>
          {onDelete && (
            <button className="btn ghost danger" onClick={() => confirm('¿Eliminar esta rutina?') && onDelete()}>
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
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Torso, Pierna…" />
      </label>
      <div className="routine-rows">
        <div className="routine-row set-head">
          <span>Ejercicio</span>
          <span>Series</span>
          <span>Reps</span>
          <span />
        </div>
        {rows.map((r) => (
          <div className="routine-row" key={r.key}>
            <input
              value={r.name}
              placeholder="Ejercicio"
              onChange={(e) => setRows((l) => l.map((x) => (x.key === r.key ? { ...x, name: e.target.value } : x)))}
            />
            <input
              inputMode="numeric"
              value={r.sets}
              aria-label="Series"
              onChange={(e) => setRows((l) => l.map((x) => (x.key === r.key ? { ...x, sets: e.target.value } : x)))}
            />
            <input
              inputMode="numeric"
              value={r.reps}
              aria-label="Repeticiones"
              onChange={(e) => setRows((l) => l.map((x) => (x.key === r.key ? { ...x, reps: e.target.value } : x)))}
            />
            <button className="icon-btn small" aria-label="Quitar" onClick={() => setRows((l) => l.filter((x) => x.key !== r.key))}>
              <Icon name="x" size={16} />
            </button>
          </div>
        ))}
      </div>
      <button className="btn outline full" onClick={() => setRows((l) => [...l, { key: uid(), name: '', sets: '3', reps: '10' }])}>
        <Icon name="plus" size={18} /> Añadir ejercicio
      </button>
      {error && <p className="error">{error}</p>}
    </Sheet>
  );
}

export function SettingsView({ store }: { store: Store }) {
  const { data } = store;
  const [editing, setEditing] = useState<{ routine: Routine; isNew: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gymrat-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (file: File) => {
    try {
      const parsed = parseData(JSON.parse(await file.text()));
      if (!parsed) throw new Error();
      if (!confirm(`Se importarán ${parsed.workouts.length} sesiones y ${parsed.routines.length} rutinas. Esto reemplaza los datos actuales. ¿Continuar?`)) return;
      store.replaceAll(parsed);
      setMsg('Datos importados correctamente.');
    } catch {
      setMsg('El archivo no es una copia de seguridad válida de GymRat.');
    }
  };

  const setGoal = (key: keyof AppData['settings'], v: string) => {
    const n = parseFloat(v.replace(',', '.'));
    store.updateSettings({ [key]: Number.isFinite(n) && n >= 0 ? n : 0 });
  };

  return (
    <div className="view">
      <header className="view-head">
        <h1>Ajustes</h1>
      </header>

      <section className="card pad">
        <h2 className="card-title">Objetivos semanales</h2>
        {/* key: fuerza a refrescar los campos si los ajustes cambian por importación o borrado */}
        <div className="row" key={`${data.settings.weeklyKmGoal}-${data.settings.weeklyGymGoal}`}>
          <label className="field">
            <span>Kilómetros</span>
            <input inputMode="decimal" defaultValue={data.settings.weeklyKmGoal} onBlur={(e) => setGoal('weeklyKmGoal', e.target.value)} />
          </label>
          <label className="field">
            <span>Sesiones de gym</span>
            <input inputMode="numeric" defaultValue={data.settings.weeklyGymGoal} onBlur={(e) => setGoal('weeklyGymGoal', e.target.value)} />
          </label>
        </div>
      </section>

      <section className="card pad">
        <h2 className="card-title">Rutinas de gimnasio</h2>
        <p className="muted small">Plantillas para cargar ejercicios rápidamente al planificar o registrar.</p>
        <div className="stack">
          {data.routines.map((r) => (
            <button key={r.id} className="list-item" onClick={() => setEditing({ routine: r, isNew: false })}>
              <span>{r.name}</span>
              <span className="muted small">{r.exercises.length} ejercicios</span>
            </button>
          ))}
        </div>
        <button
          className="btn outline full"
          onClick={() => setEditing({ routine: { id: uid(), name: '', exercises: [{ name: '', sets: 3, reps: 10 }] }, isNew: true })}
        >
          <Icon name="plus" size={18} /> Nueva rutina
        </button>
      </section>

      <section className="card pad">
        <h2 className="card-title">Datos</h2>
        <p className="muted small">
          Los datos se guardan solo en este navegador. Exporta una copia de seguridad de vez en cuando o para pasarlos a otro dispositivo.
        </p>
        <div className="btn-row">
          <button className="btn outline" onClick={exportData}>
            Exportar JSON
          </button>
          <button className="btn outline" onClick={() => fileRef.current?.click()}>
            Importar JSON
          </button>
          <button
            className="btn ghost danger"
            onClick={() => confirm('¿Borrar TODOS los datos? Esta acción no se puede deshacer.') && store.replaceAll(emptyData())}
          >
            Borrar todo
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importData(f);
            e.target.value = '';
          }}
        />
        {msg && <p className="small">{msg}</p>}
      </section>

      <p className="muted small center">GymRat · {data.workouts.length} sesiones guardadas</p>

      {editing && (
        <RoutineEditor
          routine={editing.routine}
          onClose={() => setEditing(null)}
          onSave={(r) => {
            store.saveRoutine(r);
            setEditing(null);
          }}
          onDelete={
            editing.isNew
              ? undefined
              : () => {
                  store.deleteRoutine(editing.routine.id);
                  setEditing(null);
                }
          }
        />
      )}
    </div>
  );
}
