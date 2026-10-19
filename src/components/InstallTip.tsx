import { useState } from 'react';
import { Icon } from './Icon';

const KEY = 'gymrat:install-tip-dismissed';

/** True si la app se está usando instalada (icono en pantalla de inicio) y no dentro de Safari. */
export function isStandalone(): boolean {
  return (
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

/**
 * En Safari, iOS puede borrar los datos de una web tras 7 días sin visitarla.
 * Instalada en la pantalla de inicio no aplica ese límite, así que lo recomendamos.
 */
export function InstallTip() {
  const [hidden, setHidden] = useState(() => {
    try {
      return isStandalone() || localStorage.getItem(KEY) === '1';
    } catch {
      return isStandalone();
    }
  });
  if (hidden) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      // sin almacenamiento: se ocultará solo en esta sesión
    }
    setHidden(true);
  };

  return (
    <div className="card install-tip" role="note">
      <div>
        <strong>Instálala en tu iPhone</strong>
        <p className="muted small">
          En Safari pulsa <strong>Compartir</strong> → <strong>Añadir a pantalla de inicio</strong> y ábrela siempre desde el icono.
          Así funciona como una app y iOS no borra tus datos por inactividad.
        </p>
      </div>
      <button className="icon-btn" onClick={dismiss} aria-label="Ocultar aviso">
        <Icon name="x" size={18} />
      </button>
    </div>
  );
}
