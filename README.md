# GymRat 🏃‍♂️🏋️

Web app minimalista para **planificar y registrar** entrenamientos de running y gimnasio, pensada para usarse **en iPhone como app instalada** (PWA). Funciona sin conexión.

**Demo:** https://angriogon.github.io/GymRat/

## Instalación en iPhone

1. Abre https://angriogon.github.io/GymRat/ en **Safari** (otros navegadores de iOS no permiten instalarla igual).
2. Pulsa **Compartir** → **Añadir a pantalla de inicio**.
3. Ábrela siempre desde el icono.

Por qué importa: los datos que se guardan desde Safari y los de la app instalada están separados, y Safari puede borrar los datos de una web tras 7 días sin usarla. La app instalada no tiene ese límite.

## Funcionalidades

- **Hoy**: progreso semanal frente a tus objetivos (km y sesiones de gym), racha de semanas activas, sesiones del día, pendientes sin completar y próximas sesiones.
- **Plan**: vista semanal (lunes a domingo) para planificar sesiones, navegar entre semanas y copiar la semana anterior como plan.
- **Registro de running**: tipo (rodaje, series, tempo, tirada larga, competición), distancia, duración, ritmo calculado automáticamente, RPE y notas.
- **Registro de gimnasio**: ejercicios con series, repeticiones y peso; carga de rutinas plantilla y autocompletado de ejercicios.
- **Historial**: sesiones realizadas agrupadas por mes, con filtro por tipo.
- **Progreso**: km y sesiones de gym por semana (4/8/12 semanas), totales de running, tirada más larga, mejor ritmo y evolución del 1RM estimado por ejercicio.
- **Importar de Apple Salud**: trae las carreras y sesiones de fuerza de tus relojes (Garmin, Redmi Watch…) que ya sincronizan con Salud, mediante un atajo de iOS. Vista previa editable, detección de duplicados (misma sesión grabada por dos relojes o reimportada) y completado automático de sesiones planificadas. Las instrucciones para crear el atajo están dentro de la app.
- **Ajustes**: objetivos semanales, gestión de rutinas y copia de seguridad en JSON (se exporta con el menú Compartir de iOS: Archivos, iCloud Drive, AirDrop…).

Una sesión planificada se completa con un toque (✓): se abre con los objetivos precargados para anotar lo que realmente hiciste.

## Datos y privacidad

Todo se guarda en el propio iPhone (`localStorage`): no hay servidor ni cuentas. Si borras la app de la pantalla de inicio, sus datos se borran con ella, y las copias de seguridad de iCloud del iPhone no garantizan conservarlos. Usa *Ajustes → Exportar copia* de vez en cuando y guárdala en iCloud Drive; con *Restaurar copia* la recuperas.

## Desarrollo

Requisitos: Node.js 20+.

```bash
npm install
npm run dev       # servidor de desarrollo
npm run build     # typecheck + build de producción en dist/
npm run preview   # sirve el build en local
```

### Stack

- React 18 + TypeScript + Vite, sin más dependencias en tiempo de ejecución.
- Gráficos en SVG propio (sin librerías).
- PWA con `manifest.webmanifest` y un service worker propio (`public/sw.js`).

### Estructura

```
src/
  lib/          modelo de datos, persistencia, fechas, formato y estadísticas
  components/   piezas reutilizables (editor de sesión, tarjetas, gráficos, modal)
  views/        pantallas: Hoy, Plan, Historial, Progreso, Ajustes
public/         manifest, service worker e iconos
```

## Despliegue

Cada push a `main` compila y publica en GitHub Pages mediante `.github/workflows/deploy.yml`.

Configuración inicial (solo una vez): en GitHub, **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Si cambias el nombre del repositorio, actualiza `base` en `vite.config.ts`.
