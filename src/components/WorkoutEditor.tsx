import { useMemo, useState } from 'react';
import type { Kind, Library, Routine, RunType, Status, Workout } from '../lib/types';
import { RUN_CATEGORY_TYPE, STRENGTH_CATEGORIES } from '../lib/library';
import { ExercisePicker, RunPicker } from './LibraryPickers';
import { RUN_TYPES } from '../lib/types';
import { formatPace, uid } from '../lib/format';
import { today } from '../lib/dates';
import { Sheet } from './Sheet';
import { Icon } from './Icon';

interface SetForm {
  reps: string;
  weight: string;
}
interface ExerciseForm {
  key: string;
  name: string;
  sets: SetForm[];
}

interface Props {
  workout: Workout;
  isNew: boolean;
  routines: Routine[];
  exerciseNames: string[];
  library: Library;
  lastWeight: (exerciseName: string) => number;
  onSave: (w: Workout) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const num = (s: string) => {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const str = (n: number | undefined) => (n ? String(n) : '');

export function newWorkout(kind: Kind, date = today(), status: Status = 'done'): Workout {
  return {
    id: uid(),
    date,
    kind,
    status,
    createdAt: Date.now(),
    ...(kind === 'run'
      ? { run: { runType: 'rodaje', distanceKm: 0, durationSec: 0 } }
      : { gym: { routineName: '', exercises: [] } }),
  };
}

export function WorkoutEditor({ workout, isNew, routines, exerciseNames, library, lastWeight, onSave, onDelete, onClose }: Props) {
  const [kind, setKind] = useState<Kind>(workout.kind);
  const [status, setStatus] = useState<Status>(workout.status);
  const [date, setDate] = useState(workout.date);
  const [runType, setRunType] = useState<RunType>(workout.run?.runType ?? 'rodaje');
  const [distance, setDistance] = useState(str(workout.run?.distanceKm));
  // Duración en tres casillas numéricas: el teclado numérico de iOS no tiene ":".
  const initSec = workout.run?.durationSec ?? 0;
  const [dur, setDur] = useState({
    h: initSec >= 3600 ? String(Math.floor(initSec / 3600)) : '',
    m: initSec ? String(Math.floor((initSec % 3600) / 60)) : '',
    s: initSec % 60 ? String(initSec % 60) : '',
  });
  const [runName, setRunName] = useState(workout.run?.name ?? '');
  const [session, setSession] = useState(workout.run?.session ?? '');
  const [picker, setPicker] = useState(false);
  const [routineName, setRoutineName] = useState(workout.gym?.routineName ?? '');
  const [exercises, setExercises] = useState<ExerciseForm[]>(
    (workout.gym?.exercises ?? []).map((e) => ({
      key: uid(),
      name: e.name,
      sets: e.sets.map((s) => ({ reps: str(s.reps), weight: str(s.weight) })),
    })),
  );
  const [rpe, setRpe] = useState<number | undefined>(workout.rpe);
  const [notes, setNotes] = useState(workout.notes ?? '');
  const [error, setError] = useState('');

  const durParts = [dur.h, dur.m, dur.s].map((v) => (v.trim() ? Number(v) : 0));
  const durationSec =
    durParts.every((n) => Number.isInteger(n) && n >= 0) && durParts[1] < 60 && durParts[2] < 60
      ? durParts[0] * 3600 + durParts[1] * 60 + durParts[2]
      : null;
  const pace = useMemo(
    () => (durationSec ? formatPace(num(distance), durationSec) : '—'),
    [distance, durationSec],
  );

  const loadRoutine = (id: string) => {
    const r = routines.find((x) => x.id === id);
    if (!r) return;
    setRoutineName(r.name);
    setExercises(
      r.exercises.map((e) => ({
        key: uid(),
        name: e.name,
        sets: Array.from({ length: Math.max(1, e.sets) }, () => ({ reps: str(e.reps), weight: '' })),
      })),
    );
  };

  const addFromLibrary = (items: Library['exercises'], cats: (keyof typeof STRENGTH_CATEGORIES)[]) => {
    setExercises((list) => [
      ...list,
      ...items.map((e) => {
        // Precarga el último peso usado en ese ejercicio para no tener que recordarlo.
        const w = lastWeight(e.name);
        return {
          key: uid(),
          name: e.name,
          sets: Array.from({ length: Math.max(1, e.sets) }, () => ({ reps: str(e.reps), weight: str(w) })),
        };
      }),
    ]);
    if (!routineName.trim()) setRoutineName(cats.map((c) => STRENGTH_CATEGORIES[c]).join(' + '));
    setPicker(false);
  };

  const pickRun = (t: Library['runs'][number]) => {
    setRunType(RUN_CATEGORY_TYPE[t.category]);
    setRunName(t.name);
    setSession(t.session);
    if (t.distanceKm) setDistance(String(t.distanceKm).replace('.', ','));
    setPicker(false);
  };

  const updateEx = (key: string, fn: (e: ExerciseForm) => ExerciseForm) =>
    setExercises((list) => list.map((e) => (e.key === key ? fn(e) : e)));

  const save = () => {
    if (!date) return setError('Indica una fecha.');
    if (kind === 'run') {
      if (durationSec === null) return setError('Duración no válida: los minutos y segundos deben estar entre 0 y 59.');
      if (status === 'done' && !num(distance)) return setError('Indica la distancia recorrida.');
    }
    const result: Workout = {
      id: workout.id,
      createdAt: workout.createdAt,
      date,
      kind,
      status,
      rpe: status === 'done' ? rpe : undefined,
      notes: notes.trim() || undefined,
    };
    if (kind === 'run') {
      result.run = {
        runType,
        distanceKm: num(distance),
        durationSec: durationSec ?? 0,
        name: runName.trim() || undefined,
        session: session.trim() || undefined,
      };
    } else {
      result.gym = {
        routineName: routineName.trim(),
        exercises: exercises
          .filter((e) => e.name.trim())
          .map((e) => ({
            name: e.name.trim(),
            sets: e.sets
              .map((s) => ({ reps: Math.round(num(s.reps)), weight: num(s.weight) }))
              .filter((s) => s.reps > 0 || s.weight > 0),
          })),
      };
    }
    onSave(result);
  };

  const footer = (
    <>
      {!isNew && onDelete && (
        <button
          className="btn ghost danger"
          onClick={() => confirm('¿Eliminar esta sesión?') && onDelete(workout.id)}
        >
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
  );

  return (
    <Sheet title={isNew ? 'Nueva sesión' : 'Editar sesión'} onClose={onClose} footer={footer}>
      {isNew && (
        <div className="segmented" role="tablist">
          <button className={kind === 'run' ? 'on run' : ''} onClick={() => setKind('run')}>
            <Icon name="run" size={18} /> Running
          </button>
          <button className={kind === 'gym' ? 'on gym' : ''} onClick={() => setKind('gym')}>
            <Icon name="gym" size={18} /> Gimnasio
          </button>
        </div>
      )}

      <div className="row">
        <label className="field">
          <span>Fecha</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="field">
          <span>Estado</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
            <option value="planned">Planificado</option>
            <option value="done">Hecho</option>
          </select>
        </label>
      </div>

      {kind === 'run' ? (
        <>
          {picker ? (
            <RunPicker library={library} onPick={pickRun} onCancel={() => setPicker(false)} />
          ) : (
            <button className="btn outline full" onClick={() => setPicker(true)}>
              <Icon name="book" size={18} /> Elegir de la biblioteca
            </button>
          )}
          <div className="field">
            <span>Tipo</span>
            <div className="chips">
              {(Object.keys(RUN_TYPES) as RunType[]).map((t) => (
                <button key={t} className={`chip ${runType === t ? 'on' : ''}`} onClick={() => setRunType(t)}>
                  {RUN_TYPES[t]}
                </button>
              ))}
            </div>
          </div>
          <div className="row">
            <label className="field">
              <span>Distancia (km){status === 'planned' && ' · objetivo'}</span>
              <input
                inputMode="decimal"
                placeholder="10"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
              />
            </label>
          </div>
          <div className="row">
            <div className="field">
              <span>Duración{status === 'planned' && ' · objetivo'}</span>
              <div className="duration" aria-invalid={durationSec === null}>
                {(
                  [
                    ['h', 'h'],
                    ['m', 'min'],
                    ['s', 's'],
                  ] as const
                ).map(([k, unit]) => (
                  <label key={k}>
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="0"
                      aria-label={unit === 'h' ? 'Horas' : unit === 'min' ? 'Minutos' : 'Segundos'}
                      value={dur[k]}
                      onChange={(e) => setDur((d) => ({ ...d, [k]: e.target.value.replace(/\D/g, '').slice(0, 2) }))}
                    />
                    <span>{unit}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <p className="muted small">
            Ritmo: <strong>{pace}</strong>
          </p>
          <label className="field">
            <span>Nombre (opcional)</span>
            <input placeholder="Series 1000 m, Tirada progresiva…" value={runName} onChange={(e) => setRunName(e.target.value)} />
          </label>
          <label className="field">
            <span>Sesión</span>
            <textarea
              rows={2}
              placeholder="6 × 1000 m a ritmo 10K, rec. 2 min…"
              value={session}
              onChange={(e) => setSession(e.target.value)}
            />
          </label>
        </>
      ) : (
        <>
          <div className="row">
            <label className="field grow">
              <span>Rutina / nombre</span>
              <input placeholder="Pierna, Torso…" value={routineName} onChange={(e) => setRoutineName(e.target.value)} />
            </label>
            {routines.length > 0 && (
              <label className="field">
                <span>Cargar plantilla</span>
                <select value="" onChange={(e) => loadRoutine(e.target.value)}>
                  <option value="">Elegir…</option>
                  {routines.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <datalist id="exercise-names">
            {exerciseNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>

          <div className="exercises">
            {exercises.map((ex) => (
              <div className="exercise" key={ex.key}>
                <div className="exercise-head">
                  <input
                    list="exercise-names"
                    placeholder="Ejercicio"
                    value={ex.name}
                    onChange={(e) => updateEx(ex.key, (x) => ({ ...x, name: e.target.value }))}
                  />
                  <button
                    className="icon-btn"
                    aria-label="Quitar ejercicio"
                    onClick={() => setExercises((l) => l.filter((x) => x.key !== ex.key))}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </div>
                <div className="sets">
                  <div className="set set-head">
                    <span>#</span>
                    <span>Reps</span>
                    <span>Kg</span>
                    <span />
                  </div>
                  {ex.sets.map((s, i) => (
                    <div className="set" key={i}>
                      <span className="muted">{i + 1}</span>
                      <input
                        inputMode="numeric"
                        aria-label={`Repeticiones serie ${i + 1}`}
                        value={s.reps}
                        onChange={(e) =>
                          updateEx(ex.key, (x) => ({
                            ...x,
                            sets: x.sets.map((y, j) => (j === i ? { ...y, reps: e.target.value } : y)),
                          }))
                        }
                      />
                      <input
                        inputMode="decimal"
                        aria-label={`Peso serie ${i + 1}`}
                        value={s.weight}
                        onChange={(e) =>
                          updateEx(ex.key, (x) => ({
                            ...x,
                            sets: x.sets.map((y, j) => (j === i ? { ...y, weight: e.target.value } : y)),
                          }))
                        }
                      />
                      <button
                        className="icon-btn small"
                        aria-label={`Quitar serie ${i + 1}`}
                        onClick={() => updateEx(ex.key, (x) => ({ ...x, sets: x.sets.filter((_, j) => j !== i) }))}
                      >
                        <Icon name="x" size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  className="btn ghost small"
                  onClick={() =>
                    updateEx(ex.key, (x) => ({
                      ...x,
                      // Copia la última serie: lo habitual es repetir reps y peso.
                      sets: [...x.sets, x.sets[x.sets.length - 1] ?? { reps: '', weight: '' }],
                    }))
                  }
                >
                  <Icon name="plus" size={16} /> Serie
                </button>
              </div>
            ))}
          </div>
          <button
            className="btn outline full"
            onClick={() =>
              setExercises((l) => [...l, { key: uid(), name: '', sets: [{ reps: '', weight: '' }] }])
            }
          >
            <Icon name="plus" size={18} /> Añadir ejercicio
          </button>
          {picker ? (
            <ExercisePicker library={library} onAdd={addFromLibrary} onCancel={() => setPicker(false)} />
          ) : (
            <button className="btn outline full" onClick={() => setPicker(true)}>
              <Icon name="book" size={18} /> Añadir de la biblioteca
            </button>
          )}
        </>
      )}

      {status === 'done' && (
        <div className="field">
          <span>Esfuerzo percibido (RPE)</span>
          <div className="chips rpe">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button key={n} className={`chip ${rpe === n ? 'on' : ''}`} onClick={() => setRpe(rpe === n ? undefined : n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="field">
        <span>Notas</span>
        <textarea rows={2} placeholder="Sensaciones, ruta, molestias…" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </Sheet>
  );
}
