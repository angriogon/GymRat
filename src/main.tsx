import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Bloquea el zoom con pellizco. Safari ignora user-scalable=no desde iOS 10,
// pero respeta preventDefault en sus eventos de gesto propios.
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
}
document.addEventListener(
  'touchmove',
  (e) => {
    const scale = (e as TouchEvent & { scale?: number }).scale; // solo existe en Safari
    if (scale !== undefined && scale !== 1) e.preventDefault();
  },
  { passive: false },
);

// Pide al navegador que no borre los datos locales al liberar espacio (Safari 17+).
navigator.storage?.persist?.().catch(() => {});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
