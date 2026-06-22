export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function getImageUrl(url_imagen: string | null): string {
  if (!url_imagen) return '';
  if (url_imagen.startsWith('http')) return url_imagen;
  return API_URL + url_imagen;
}

export async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}
