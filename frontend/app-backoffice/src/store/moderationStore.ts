import { create } from 'zustand';

export interface ClaimInfo {
  moderadorId: number;
  nombre: string;
}

interface ModerationState {
  /** reportId -> quién lo tiene tomado. */
  claims: Record<number, ClaimInfo>;
  connected: boolean;
  setConnected: (v: boolean) => void;
  setClaim: (reportId: number, info: ClaimInfo) => void;
  removeClaim: (reportId: number) => void;
  setSnapshot: (claims: Array<{ reportId: number; moderadorId: number; nombre: string }>) => void;
  /** ¿el reporte está tomado por OTRO moderador (no por mí)? */
  isLockedByOther: (reportId: number, myModeradorId: number | undefined) => boolean;
}

export const useModerationStore = create<ModerationState>((set, get) => ({
  claims: {},
  connected: false,
  setConnected: (v) => set({ connected: v }),
  setClaim: (reportId, info) =>
    set((s) => ({ claims: { ...s.claims, [reportId]: info } })),
  removeClaim: (reportId) =>
    set((s) => {
      const next = { ...s.claims };
      delete next[reportId];
      return { claims: next };
    }),
  setSnapshot: (list) =>
    set(() => ({
      claims: Object.fromEntries(
        list.map((c) => [c.reportId, { moderadorId: c.moderadorId, nombre: c.nombre }]),
      ),
    })),
  isLockedByOther: (reportId, myModeradorId) => {
    const claim = get().claims[reportId];
    return !!claim && claim.moderadorId !== myModeradorId;
  },
}));
