import { create } from 'zustand';
import * as auth from '../lib/auth';

interface AuthState {
  user: { id: number; nombre: string; email: string; roles: string[] } | null;
  isLoggedIn: boolean;
  login: (data: {
    access_token: string;
    refresh_token: string;
    user: { id: number; nombre: string; email: string; roles: string[] };
  }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
  login: (data) => {
    auth.setToken(data.access_token);
    auth.saveUser({
      id: data.user.id,
      nombre: data.user.nombre,
      email: data.user.email,
      roles: data.user.roles,
    });
    set({ user: data.user, isLoggedIn: true });
  },
  logout: () => {
    auth.clearAuth();
    set({ user: null, isLoggedIn: false });
  },
}));
