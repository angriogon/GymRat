import { useState } from 'react';
import type { Workout } from '../lib/types';
import { type Choice, type ImportRow, applyImport, countPlanMatches, parseHealthText, proposeImport } from '../lib/healthImport';
import { formatShort } from '../lib/dates';
import { formatDuration, formatKm } from '../lib/format';
import { Sheet } from './Sheet';

interface Props {
  workouts: Workout[];
  onImport: (ws: Workout[]) => void;
  onClose: () => void;
}

const timeFmt = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

export function HealthImport({ workouts, onImport, onClose }: Props) {
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const load = (raw: string) => {
    const entries = parseHealthText(raw);
    if (!entries.length) {
      setError('No se ha encontrado ningún entrenamiento. Ejecuta primero el atajo "GymRat Salud" y vuelve a intentarlo.');
      return;
    }
    setError('');
    setRows(proposeImport(entries, workouts));
  };

  const paste = async () => {
    try {
      load(await navigator.clipboard.readText());
    } catch {
      setError('No se ha podido leer el portapapeles. Mantén pulsado el cuadro de abajo, pulsa "Pegar" y luego "Revisar".');
    }
  };

  const setChoice = (i: number, choice: Choice) =>
    setRows((r) => r && r.map((row, j) => (j === i ? { ...row, choice } : row)));

  const selected = rows?.filter((r) => r.choice !== 'skip').length ?? 0;
  const completes = rows ? countPlanMatches(rows, workouts) : 0;

  const footer = rows ? (
    <>
      <button className="btn ghost" onClick={() => setRows(null)}>
        Atrás
      </button>
      <span className="spacer" />
      <button className="btn primary" disabled={!selected} onClick={() => onImport(applyImport(rows, workouts))}>
        Importar {selected}
      </button>
    </>
  ) : undefined;

  return (
    <Sheet title="Importar de Apple Salud" onClose={onClose} footer={footer}>
      {!rows ? (
        <>
          <p className="muted small">
            Ejecuta el atajo <strong>GymRat Salud</strong> (copia tus entrenamientos recientes) y después pulsa el botón.
          </p>
          <button className="btn primary full" onClick={paste}>
            Pegar entrenamientos
          </button>
          <label className="field">
            <span>O pégalos aquí manualmente</span>
            <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="GYMRAT|…" />
          </label>
          {text.trim() && (
            <button className="btn outline full" onClick={() => load(text)}>
              Revisar
            </button>
          )}
          {error && <p className="error">{error}</p>}

          <details className="help">
            <summary>Cómo crear el atajo (una sola vez)</summary>
            <ol>
              <li>
                Abre <strong>Atajos</strong> → <strong>+</strong> y llámalo <strong>GymRat Salud</strong>.
              </li>
              <li>
                Añade <strong>Buscar muestras de Salud</strong>: tipo <em>Entrenamientos</em>, filtro <em>Fecha de inicio está en los
                últimos 14 días</em>, ordenar por <em>Fecha de inicio</em> (más reciente primero), límite 50.
              </li>
              <li>
                Añade <strong>Repetir con cada</strong> elemento de <em>Muestras de Salud</em>.
              </li>
              <li>
                Dentro del bucle, añade <strong>Texto</strong> y escribe exactamente:
                <code>GYMRAT|Inicio|Fin|Distancia|Tipo|Fuente</code>
                sustituyendo cada palabra por la variable <em>Elemento de repetición</em> con su propiedad (tócala y elige):
                <em>Fecha de inicio</em> y <em>Fecha de finalización</em> con formato <strong>ISO 8601</strong> (y “Incluir hora”),
                <em>Distancia</em>, <em>Tipo de entrenamiento</em> (o <em>Nombre</em>) y <em>Fuente</em>.
              </li>
              <li>
                Después del bucle: <strong>Combinar texto</strong> (<em>Texto de Repetir resultados</em>, con <em>Nueva línea</em>) y{' '}
                <strong>Copiar en el portapapeles</strong>.
              </li>
              <li>
                La primera vez, iOS pedirá permiso para leer Salud: permite <em>Entrenamientos</em>.
              </li>
            </ol>
            <p className="muted small">
              Truco: añade el atajo como widget o asígnalo a <em>Ajustes → Accesibilidad → Tocar → Toque posterior</em>.
            </p>
          </details>
        </>
      ) : (
        <>
          <p className="muted small">
            {rows.length} entrenamientos encontrados · {selected} se importarán
            {completes === 1 && ' · 1 completará una sesión planificada'}
            {completes > 1 && ` · ${completes} completarán sesiones planificadas`}. Revisa el tipo de cada uno.
          </p>
          <div className="stack">
            {rows.map((r, i) => {
              const e = r.entry;
              const detail = [
                e.distanceKm ? formatKm(e.distanceKm) : null,
                e.durationSec ? formatDuration(e.durationSec) : null,
                e.source || null,
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <div key={e.key} className={`card import-row ${r.choice === 'skip' ? 'is-skip' : ''}`}>
                  <div className="import-text">
                    <strong>{e.label}</strong>
                    <span className="muted small">
                      {formatShort(e.date)} {timeFmt.format(new Date(e.startedAt))}
                      {detail && ` · ${detail}`}
                    </span>
                    {r.note && <span className="small note">{r.note}</span>}
                  </div>
                  <select value={r.choice} onChange={(ev) => setChoice(i, ev.target.value as Choice)} aria-label="Importar como">
                    <option value="run">Carrera</option>
                    <option value="gym">Gym</option>
                    <option value="skip">No importar</option>
                  </select>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Sheet>
  );
}
