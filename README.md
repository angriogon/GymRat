# GymRat 🏃‍♂️🏋️

Web app minimalista para **planificar y registrar** entrenamientos de running y gimnasio. Funciona en el navegador, se puede instalar como app (PWA) en Windows, Android o iOS, y funciona sin conexión.

**Demo:** https://angriogon.github.io/GymRat/

## Funcionalidades

- **Hoy**: progreso semanal frente a tus objetivos (km y sesiones de gym), racha de semanas activas, sesiones del día, pendientes sin completar y próximas sesiones.
- **Plan**: vista semanal (lunes a domingo) para planificar sesiones, navegar entre semanas y copiar la semana anterior como plan.
- **Registro de running**: tipo (rodaje, series, tempo, tirada larga, competición), distancia, duración, ritmo calculado automáticamente, RPE y notas.
- **Registro de gimnasio**: ejercicios con series, repeticiones y peso; carga de rutinas plantilla y autocompletado de ejercicios.
- **Historial**: sesiones realizadas agrupadas por mes, con filtro por tipo.
- **Progreso**: km y sesiones de gym por semana (4/8/12 semanas), totales de running, tirada más larga, mejor ritmo y evolución del 1RM estimado por ejercicio.
- **Ajustes**: objetivos semanales, gestión de rutinas, exportar/importar copia de seguridad en JSON.

Una sesión planificada se completa con un toque (✓): se abre con los objetivos precargados para anotar lo que realmente hiciste.

## Datos y privacidad

Todo se guarda en el `localStorage` del navegador: no hay servidor ni cuentas. Consecuencia práctica: los datos **no se sincronizan** entre dispositivos y se pierden si borras los datos del sitio. Usa *Ajustes → Exportar JSON* para hacer copias o pasar los datos a otro dispositivo.

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
