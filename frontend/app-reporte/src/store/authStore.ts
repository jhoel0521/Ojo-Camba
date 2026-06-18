import { create } from 'zustand';
import * as auth from '../lib/auth';

interface AuthState {
  user: { id: number; nombre: string; email: string } | null;
  isLoggedIn: boolean;
  login: (data: {
    access_token: string;
    refresh_token: string;
    user: { id: number; nombre: string; email: string };
  }) => void;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
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
  loadFromStorage: () => {
    const user = auth.getUser();
    const logged = auth.isLoggedIn();
    set({ user, isLoggedIn: logged });
  },
}));
