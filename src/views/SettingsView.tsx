import { useRef, useState } from 'react';
import type { AppData, StrengthCategory } from '../lib/types';
import type { Store } from '../lib/store';
import { emptyData, parseData } from '../lib/store';
import { DEFAULT_GYM_SPLIT, STRENGTH_CATEGORIES } from '../lib/library';
import { today } from '../lib/dates';
import { weekTargets } from '../lib/recommend';
import { Icon } from '../components/Icon';

export function SettingsView({ store }: { store: Store }) {
  const { data } = store;
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');

  // En iPhone se abre la hoja de Compartir (Guardar en Archivos, iCloud, AirDrop…);
  // si el navegador no permite compartir archivos, se descarga directamente.
  const exportData = async () => {
    const name = `gymrat-backup-${today()}.json`;
    const json = JSON.stringify(data, null, 2);
    const file = new File([json], name, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Copia de seguridad GymRat' });
        return;
      } catch (e) {
        if ((e as DOMException).name === 'AbortError') return; // el usuario cerró la hoja
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const importData = async (file: File) => {
    try {
      const parsed = parseData(JSON.parse(await file.text()));
      if (!parsed) throw new Error();
      if (!confirm(`Se importarán ${parsed.workouts.length} sesiones y la biblioteca (${parsed.library.exercises.length} ejercicios, ${parsed.library.runs.length} entrenamientos de running). Esto reemplaza los datos actuales. ¿Continuar?`)) return;
      store.replaceAll(parsed);
      setMsg('Datos importados correctamente.');
    } catch {
      setMsg('El archivo no es una copia de seguridad válida de GymRat.');
    }
  };

  const split = data.settings.gymSplit;
  const setSplit = (gymSplit: StrengthCategory[][]) => store.updateSettings({ gymSplit });

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
        <div className="field">
          <span>Días de entrenamiento</span>
          <div className="chips days-pick">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((label, i) => {
              const on = data.settings.trainDays.includes(i);
              return (
                <button
                  key={i}
                  className={`chip ${on ? 'on' : ''}`}
                  aria-pressed={on}
                  onClick={() =>
                    store.updateSettings({
                      trainDays: on ? data.settings.trainDays.filter((d) => d !== i) : [...data.settings.trainDays, i].sort(),
                    })
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <p className="muted small">
          {(() => {
            const tg = weekTargets(data);
            const n = data.settings.trainDays.length;
            if (!n) return 'Elige al menos un día para recibir sugerencias.';
            return `Con ${n} ${n === 1 ? 'día' : 'días'} y tu objetivo de gym, las sugerencias reparten ${tg.gym} de gym y ${tg.run} ${
              tg.run === 1 ? 'carrera' : 'carreras'
            } por semana. La fuerza va primero; los demás días son para correr.`;
          })()}
        </p>
      </section>

      <section className="card pad">
        <h2 className="card-title">Rotación de días de gym</h2>
        <p className="muted small">
          Las sugerencias y el plan semanal van alternando estos días. Los ejercicios salen de la Biblioteca: el principal de cada
          grupo siempre y el resto rota cada semana.
        </p>
        <div className="stack">
          {split.map((day, i) => (
            <div key={i} className="split-day">
              <div className="split-day-head">
                <strong>Día {i + 1}</strong>
                {split.length > 1 && (
                  <button className="icon-btn small" aria-label={`Quitar día ${i + 1}`} onClick={() => setSplit(split.filter((_, j) => j !== i))}>
                    <Icon name="trash" size={16} />
                  </button>
                )}
              </div>
              <div className="chips">
                {(Object.keys(STRENGTH_CATEGORIES) as StrengthCategory[]).map((c) => {
                  const on = day.includes(c);
                  return (
                    <button
                      key={c}
                      className={`chip small-chip ${on ? 'on' : ''}`}
                      aria-pressed={on}
                      onClick={() => {
                        const next = on ? day.filter((x) => x !== c) : [...day, c];
                        if (next.length) setSplit(split.map((d, j) => (j === i ? next : d)));
                      }}
                    >
                      {STRENGTH_CATEGORIES[c]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="btn-row">
          <button className="btn outline" onClick={() => setSplit([...split, ['pecho']])}>
            <Icon name="plus" size={18} /> Añadir día
          </button>
          <button className="btn ghost" onClick={() => confirm('¿Volver a la rotación por defecto?') && setSplit(DEFAULT_GYM_SPLIT)}>
            Restablecer
          </button>
        </div>
      </section>

      <section className="card pad">
        <h2 className="card-title">Datos</h2>
        <p className="muted small">
          Los datos se guardan solo en este iPhone. Exporta una copia de vez en cuando (por ejemplo a iCloud Drive): es lo que te
          permite recuperarlos si cambias de móvil o borras la app.
        </p>
        <div className="btn-row">
          <button className="btn outline" onClick={exportData}>
            Exportar copia
          </button>
          <button className="btn outline" onClick={() => fileRef.current?.click()}>
            Restaurar copia
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

    </div>
  );
}
