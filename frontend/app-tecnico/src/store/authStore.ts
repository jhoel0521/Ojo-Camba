import { create } from 'zustand';
import * as auth from '../lib/auth';
import type { TecnicoUser } from '../lib/auth';

interface AuthState {
  user: TecnicoUser | null;
  isLoggedIn: boolean;
  login: (data: { access_token: string; refresh_token: string; user: TecnicoUser }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: auth.getUser(),
  isLoggedIn: auth.isLoggedIn(),
  login: (data) => {
    auth.setToken(data.access_token);
    auth.setRefreshToken(data.refresh_token);
    auth.saveUser(data.user);
    set({ user: data.user, isLoggedIn: true });
  },
  logout: () => {
    auth.clearAuth();
    set({ user: null, isLoggedIn: false });
  },
}));
