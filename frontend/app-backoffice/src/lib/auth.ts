const TOKEN_KEY = 'ojo_camba_admin_token';
const USER_KEY = 'ojo_camba_admin_user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
export function isLoggedIn(): boolean {
  return !!getToken();
}
export function saveUser(user: { id: number; nombre: string; email: string; roles: string[] }) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}
