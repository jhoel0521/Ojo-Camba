const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Una doble pulsación puede ocurrir antes de que React alcance a deshabilitar
 * un botón. Las llamadas idénticas a IA comparten su promesa mientras están
 * activas, para que el gateway invoque una sola vez al proveedor.
 */
const solicitudesIaEnCurso = new Map<string, Promise<unknown>>();

function claveSolicitudIa(path: string, options?: RequestInit): string | null {
  const method = (options?.method ?? 'GET').toUpperCase();
  const esRutaIa = path.startsWith('/ia/') || path === '/asistente/chat';
  if (!esRutaIa || method === 'GET') return null;

  const body = options?.body;
  // Las llamadas actuales envían JSON. No se comparan FormData o archivos.
  if (body !== undefined && typeof body !== 'string') return null;
  return `${method}:${path}:${body ?? ''}`;
}

export function getImageUrl(url_imagen: string | null): string {
  if (!url_imagen) return '';
  if (url_imagen.startsWith('http')) return url_imagen;
  return API_URL + (url_imagen.startsWith('/') ? url_imagen : '/' + url_imagen);
}

async function ejecutarFetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('ojo_camba_admin_token');
  const headers = new Headers(options?.headers);
  if (options?.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const clave = claveSolicitudIa(path, options);
  if (!clave) return ejecutarFetchAPI<T>(path, options);

  const existente = solicitudesIaEnCurso.get(clave);
  if (existente) return existente as Promise<T>;

  const solicitud = ejecutarFetchAPI<T>(path, options);
  solicitudesIaEnCurso.set(clave, solicitud);
  const liberarSolicitud = () => {
    if (solicitudesIaEnCurso.get(clave) === solicitud) solicitudesIaEnCurso.delete(clave);
  };
  void solicitud.then(liberarSolicitud, liberarSolicitud);
  return solicitud;
}
