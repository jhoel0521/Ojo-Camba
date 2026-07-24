const KEY = 'ojo_camba_device_id';

/**
 * crypto.randomUUID() solo existe en contextos seguros (HTTPS o localhost).
 * Probar la app desde el celular por IP de LAN en HTTP (ej. 192.168.x.x:5173)
 * es un contexto inseguro: crypto.randomUUID es undefined ahi y llamarlo
 * revienta sin catch, dejando pantalla en blanco. Con fallback no crashea.
 */
function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getDeviceId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = randomId();
    localStorage.setItem(KEY, id);
  }
  return id;
}
