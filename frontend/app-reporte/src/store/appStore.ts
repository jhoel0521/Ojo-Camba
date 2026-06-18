import { create } from 'zustand';
import type { DeviceInfo } from '../hooks/useDevice';

export interface FilterState {
  resolution: number;
  soloActivos: boolean;
  categorias: number[];
}

interface AppState {
  device: DeviceInfo | null;
  setDevice: (d: DeviceInfo) => void;
  filters: FilterState;
  setResolution: (r: number) => void;
  toggleSoloActivos: () => void;
  toggleCategoria: (id: number) => void;
  filterOpen: boolean;
  setFilterOpen: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  device: null,
  setDevice: (device) => set({ device }),
  filters: { resolution: 8, soloActivos: true, categorias: [1, 2, 3, 4, 5, 6] },
  setResolution: (resolution) => set((s) => ({ filters: { ...s.filters, resolution } })),
  toggleSoloActivos: () =>
    set((s) => ({
      filters: { ...s.filters, soloActivos: !s.filters.soloActivos },
    })),
  toggleCategoria: (id) =>
    set((s) => {
      const cats = s.filters.categorias.includes(id)
        ? s.filters.categorias.filter((c) => c !== id)
        : [...s.filters.categorias, id];
      return { filters: { ...s.filters, categorias: cats } };
    }),
  filterOpen: false,
  setFilterOpen: (v) => set({ filterOpen: v }),
}));
