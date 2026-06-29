const TOKEN_KEY = 'ojo_camba_tecnico_token';
const REFRESH_KEY = 'ojo_camba_tecnico_refresh';
const USER_KEY = 'ojo_camba_tecnico_user';

export interface TecnicoUser {
  id: number;
  nombre: string;
  email: string;
  roles: string[];
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function setRefreshToken(token: string) {
  localStorage.setItem(REFRESH_KEY, token);
}
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}
export function isLoggedIn(): boolean {
  return !!getToken();
}
export function saveUser(user: TecnicoUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function getUser(): TecnicoUser | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as TecnicoUser) : null;
}
