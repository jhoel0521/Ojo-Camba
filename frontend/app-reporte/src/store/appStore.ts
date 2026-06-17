import { create } from 'zustand';
import type { DeviceInfo } from '../hooks/useDevice';

interface AppState {
  device: DeviceInfo | null;
  setDevice: (d: DeviceInfo) => void;
  soloConReportes: boolean;
  toggleSoloConReportes: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  device: null,
  setDevice: (device) => set({ device }),
  soloConReportes: true,
  toggleSoloConReportes: () => set((s) => ({ soloConReportes: !s.soloConReportes })),
}));
