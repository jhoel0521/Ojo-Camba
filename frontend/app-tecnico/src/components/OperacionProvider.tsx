import { createContext, useContext, useEffect, useState } from 'react';
import { getContextoOperativo, type ContextoOperativo } from '../lib/tecnicoApi';
import { useAuthStore } from '../store/authStore';

interface OperacionContextValue {
  contexto: ContextoOperativo | null;
  cargando: boolean;
}

const OperacionContext = createContext<OperacionContextValue>({ contexto: null, cargando: true });

export function OperacionProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;
  const [contexto, setContexto] = useState<ContextoOperativo | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setCargando(true);
    getContextoOperativo()
      .then(setContexto)
      .catch(() => setContexto(null))
      .finally(() => setCargando(false));
  }, [userId]);

  return (
    <OperacionContext.Provider value={{ contexto, cargando }}>{children}</OperacionContext.Provider>
  );
}

export function useOperacionContext() {
  return useContext(OperacionContext);
}
