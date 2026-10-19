import { useEffect, useMemo, useState } from 'react';
import type { Kind, Workout } from './lib/types';
import { useStore } from './lib/store';
import { today } from './lib/dates';
import { Icon, type IconName } from './components/Icon';
import { WorkoutEditor, newWorkout } from './components/WorkoutEditor';
import { TodayView } from './views/TodayView';
import { PlanView } from './views/PlanView';
import { HistoryView } from './views/HistoryView';
import { ProgressView } from './views/ProgressView';
import { SettingsView } from './views/SettingsView';

const TABS: { id: string; label: string; icon: IconName }[] = [
  { id: 'hoy', label: 'Hoy', icon: 'home' },
  { id: 'plan', label: 'Plan', icon: 'calendar' },
  { id: 'historial', label: 'Historial', icon: 'list' },
  { id: 'progreso', label: 'Progreso', icon: 'chart' },
  { id: 'ajustes', label: 'Ajustes', icon: 'settings' },
];

// La pestaña activa vive en el hash (#plan…) para que funcione el botón atrás y se pueda enlazar.
function useHashTab() {
  const read = () => {
    const h = location.hash.slice(1);
    return TABS.some((t) => t.id === h) ? h : 'hoy';
  };
  const [tab, setTab] = useState(read);
  useEffect(() => {
    const onHash = () => setTab(read());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return [tab, (id: string) => (location.hash = id)] as const;
}

export default function App() {
  const store = useStore();
  const { data } = store;
  const [tab, setTab] = useHashTab();
  const [editor, setEditor] = useState<{ workout: Workout; isNew: boolean } | null>(null);

  useEffect(() => window.scrollTo(0, 0), [tab]);

  const exerciseNames = useMemo(() => {
    const set = new Set<string>();
    data.routines.forEach((r) => r.exercises.forEach((e) => set.add(e.name)));
    data.workouts.forEach((w) => w.gym?.exercises.forEach((e) => set.add(e.name)));
    return [...set].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es'));
  }, [data]);

  const open = (w: Workout) => setEditor({ workout: w, isNew: false });
  const complete = (w: Workout) => setEditor({ workout: { ...w, status: 'done' }, isNew: false });
  // Sesiones en fechas futuras nacen como planificadas; hoy o pasadas, como hechas.
  const create = (kind: Kind, date: string) =>
    setEditor({ workout: newWorkout(kind, date, date > today() ? 'planned' : 'done'), isNew: true });

  const viewProps = { data, onOpen: open, onComplete: complete, onNew: create };

  return (
    <div className="app">
      <main>
        {tab === 'hoy' && <TodayView {...viewProps} />}
        {tab === 'plan' && <PlanView {...viewProps} onSaveMany={(ws) => ws.forEach(store.saveWorkout)} />}
        {tab === 'historial' && <HistoryView data={data} onOpen={open} />}
        {tab === 'progreso' && <ProgressView data={data} />}
        {tab === 'ajustes' && <SettingsView store={store} />}
      </main>

      {tab !== 'ajustes' && (
        <button className="fab" onClick={() => create('run', today())} aria-label="Nueva sesión">
          <Icon name="plus" size={26} />
        </button>
      )}

      <nav className="tabbar" aria-label="Navegación principal">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
            <Icon name={t.icon} size={22} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {editor && (
        <WorkoutEditor
          key={editor.workout.id}
          workout={editor.workout}
          isNew={editor.isNew}
          routines={data.routines}
          exerciseNames={exerciseNames}
          onClose={() => setEditor(null)}
          onSave={(w) => {
            store.saveWorkout(w);
            setEditor(null);
          }}
          onDelete={(id) => {
            store.deleteWorkout(id);
            setEditor(null);
          }}
        />
      )}
    </div>
  );
}
