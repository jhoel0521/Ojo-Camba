const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function getImageUrl(url_imagen: string | null): string {
  if (!url_imagen) return '';
  if (url_imagen.startsWith('http')) return url_imagen;
  return API_URL + (url_imagen.startsWith('/') ? url_imagen : '/' + url_imagen);
}

export async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
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
