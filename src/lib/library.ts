import type { Library, LibraryExercise, RunCategory, RunTemplate, RunType, StrengthCategory } from './types';
import { uid } from './format';

export const STRENGTH_CATEGORIES: Record<StrengthCategory, string> = {
  pecho: 'Pecho',
  'espalda-biceps': 'Espalda + bíceps',
  triceps: 'Tríceps',
  piernas: 'Piernas',
  abdominales: 'Abdominales',
  gluteos: 'Glúteos',
  propiocepcion: 'Propiocepción running',
};

export const RUN_CATEGORIES: Record<RunCategory, string> = {
  tirada: 'Tiradas largas',
  fartlek: 'Fartlek',
  series: 'Series',
};

/** Rotación de días de gym por defecto (3 sesiones semanales, prioridad fuerza). */
export const DEFAULT_GYM_SPLIT: StrengthCategory[][] = [
  ['pecho', 'triceps'],
  ['espalda-biceps', 'abdominales'],
  ['piernas', 'gluteos', 'propiocepcion'],
];

/** Ejercicios que se proponen de cada grupo en una sesión. */
export const EXERCISES_PER_SESSION: Record<StrengthCategory, number> = {
  pecho: 4,
  'espalda-biceps': 5,
  triceps: 3,
  piernas: 4,
  abdominales: 3,
  gluteos: 3,
  propiocepcion: 3,
};

export const splitLabel = (cats: StrengthCategory[]) => cats.map((c) => STRENGTH_CATEGORIES[c]).join(' + ');

/** Tipo de carrera que corresponde a cada categoría de la biblioteca. */
export const RUN_CATEGORY_TYPE: Record<RunCategory, RunType> = {
  tirada: 'tirada',
  fartlek: 'fartlek',
  series: 'series',
};

// [nombre, series, repeticiones]. "(seg)" indica que las repeticiones son segundos.
const STRENGTH_SEED: Record<StrengthCategory, [string, number, number][]> = {
  pecho: [
    ['Press banca con barra', 4, 8],
    ['Press inclinado con barra', 4, 8],
    ['Press plano con mancuernas', 3, 10],
    ['Press inclinado con mancuernas', 3, 10],
    ['Press declinado', 3, 10],
    ['Aperturas con mancuernas', 3, 12],
    ['Cruce de poleas', 3, 12],
    ['Contractor de pecho (pec deck)', 3, 12],
    ['Press de pecho en máquina', 3, 12],
    ['Fondos en paralelas (pecho)', 3, 10],
    ['Flexiones', 3, 15],
    ['Pullover con mancuerna', 3, 12],
  ],
  'espalda-biceps': [
    ['Dominadas', 4, 8],
    ['Jalón al pecho', 4, 10],
    ['Remo con barra', 4, 8],
    ['Remo con mancuerna a una mano', 3, 10],
    ['Remo en polea baja', 3, 12],
    ['Remo en máquina', 3, 12],
    ['Peso muerto', 3, 5],
    ['Pullover en polea alta', 3, 12],
    ['Face pull', 3, 15],
    ['Curl con barra', 3, 10],
    ['Curl alterno con mancuernas', 3, 12],
    ['Curl martillo', 3, 12],
    ['Curl en banco Scott', 3, 10],
    ['Curl en polea', 3, 12],
  ],
  triceps: [
    ['Press banca agarre cerrado', 4, 8],
    ['Press francés', 3, 10],
    ['Extensión en polea con cuerda', 3, 12],
    ['Extensión en polea con barra', 3, 12],
    ['Extensión unilateral en polea', 3, 12],
    ['Extensión por encima de la cabeza con mancuerna', 3, 12],
    ['Patada de tríceps con mancuerna', 3, 12],
    ['Fondos en paralelas (tríceps)', 3, 10],
    ['Fondos entre bancos', 3, 12],
    ['Flexiones diamante', 3, 12],
  ],
  piernas: [
    ['Sentadilla con barra', 4, 8],
    ['Sentadilla frontal', 4, 6],
    ['Sentadilla goblet', 3, 12],
    ['Prensa de piernas', 4, 10],
    ['Sentadilla búlgara', 3, 10],
    ['Zancadas con mancuernas', 3, 10],
    ['Step-up al cajón', 3, 10],
    ['Peso muerto rumano', 3, 10],
    ['Extensión de cuádriceps', 3, 12],
    ['Curl femoral tumbado', 3, 12],
    ['Curl femoral sentado', 3, 12],
    ['Elevación de gemelos de pie', 4, 15],
    ['Elevación de gemelos sentado', 3, 15],
  ],
  abdominales: [
    ['Plancha frontal (seg)', 3, 45],
    ['Plancha lateral (seg)', 3, 30],
    ['Crunch', 3, 20],
    ['Crunch en polea', 3, 15],
    ['Elevación de piernas colgado', 3, 12],
    ['Elevación de piernas tumbado', 3, 15],
    ['Rueda abdominal', 3, 10],
    ['Dead bug', 3, 12],
    ['Bird dog', 3, 12],
    ['Russian twist', 3, 20],
    ['Pallof press', 3, 12],
    ['Hollow hold (seg)', 3, 30],
    ['Mountain climbers (seg)', 3, 30],
  ],
  gluteos: [
    ['Hip thrust con barra', 4, 10],
    ['Hip thrust a una pierna', 3, 10],
    ['Puente de glúteo', 3, 15],
    ['Frog pump', 3, 20],
    ['Patada de glúteo en polea', 3, 12],
    ['Abducción en máquina', 3, 15],
    ['Sentadilla sumo', 3, 12],
    ['Peso muerto sumo', 3, 8],
    ['Zancada inversa', 3, 10],
    ['Hiperextensión enfocada a glúteo', 3, 12],
    ['Monster walk con banda (pasos)', 3, 15],
    ['Clamshell con banda', 3, 15],
  ],
  propiocepcion: [
    ['Equilibrio a una pierna (seg)', 3, 30],
    ['Equilibrio a una pierna ojos cerrados (seg)', 3, 20],
    ['Equilibrio en bosu (seg)', 3, 30],
    ['Star excursion / Y-balance', 3, 5],
    ['Peso muerto a una pierna', 3, 10],
    ['Sentadilla a una pierna al banco', 3, 8],
    ['Elevación de talones a una pierna', 3, 15],
    ['Saltos a una pierna (pogo)', 3, 10],
    ['Saltos laterales a una pierna', 3, 10],
    ['Saltos al cajón', 3, 8],
    ['Skipping alto (seg)', 3, 20],
    ['Talones al glúteo (seg)', 3, 20],
  ],
};

const RUN_SEED: [RunCategory, string, number, string][] = [
  ['tirada', 'Tirada larga suave', 14, 'Ritmo cómodo y constante, pudiendo hablar (zona 2).'],
  ['tirada', 'Tirada progresiva', 14, 'Empieza suave y acaba el último tercio a ritmo de maratón.'],
  ['tirada', 'Tirada con final rápido', 16, 'Ritmo suave y últimos 3 km a ritmo de media maratón.'],
  ['tirada', 'Tirada con cambios', 15, 'Ritmo suave; cada 3 km, 1 km algo más rápido.'],
  ['tirada', 'Tirada de mantenimiento', 10, 'Tirada corta a ritmo cómodo para semanas de descarga.'],
  ['fartlek', 'Fartlek clásico 1/1', 8, 'Calentamiento 15 min · 10 × (1 min rápido / 1 min suave) · 10 min vuelta a la calma.'],
  ['fartlek', 'Fartlek piramidal', 9, 'Calentamiento 15 min · 1-2-3-4-3-2-1 min rápido con la mitad de recuperación suave · 10 min suave.'],
  ['fartlek', 'Fartlek 30/30', 7, 'Calentamiento 15 min · 20 × (30 s rápido / 30 s suave) · 10 min suave.'],
  ['fartlek', 'Fartlek 3/2', 9, 'Calentamiento 15 min · 6 × (3 min a ritmo 10K / 2 min suave) · 10 min suave.'],
  ['fartlek', 'Fartlek libre', 8, '30 min alternando cambios de ritmo por sensaciones (farolas, cuestas, rectas).'],
  ['series', 'Series 200 m', 6, 'Calentamiento 15 min · 12 × 200 m rápido, rec. 1 min trotando · 10 min suave.'],
  ['series', 'Series 400 m', 7, 'Calentamiento 15 min · 10 × 400 m a ritmo 5K, rec. 1:30 · 10 min suave.'],
  ['series', 'Series 1000 m', 9, 'Calentamiento 15 min · 6 × 1000 m a ritmo 10K, rec. 2 min · 10 min suave.'],
  ['series', 'Series 2000 m', 10, 'Calentamiento 15 min · 3 × 2000 m a ritmo de media, rec. 3 min · 10 min suave.'],
  ['series', 'Series en cuesta', 6, 'Calentamiento 15 min · 10 × 100 m en cuesta fuerte, bajada trotando · 10 min suave.'],
  ['series', 'Series mixtas', 8, 'Calentamiento 15 min · 2 × (400-800-1200 m) a ritmo 5K-10K, rec. 2 min · 10 min suave.'],
];

export function defaultLibrary(): Library {
  const exercises: LibraryExercise[] = (Object.keys(STRENGTH_SEED) as StrengthCategory[]).flatMap((category) =>
    STRENGTH_SEED[category].map(([name, sets, reps]) => ({ id: uid(), name, category, sets, reps })),
  );
  const runs: RunTemplate[] = RUN_SEED.map(([category, name, distanceKm, session]) => ({
    id: uid(),
    category,
    name,
    distanceKm,
    session,
  }));
  return { exercises, runs };
}
