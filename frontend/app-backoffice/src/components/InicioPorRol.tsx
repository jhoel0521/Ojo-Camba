import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import DashboardPage from '../pages/DashboardPage';
import { areasDisponibles, puedeEntrar, rutaInicial } from '../lib/areas';

/**
 * Entrada de "/" (ISSUE-30): el tablero estrategico es un area mas, no el
 * destino por defecto de cualquier sesion. Segun
 * docs/ISSUE-26-matriz-permisos.md solo lo consultan coordinador operativo,
 * encargado IT y autoridad municipal; el resto aterriza en su propia area.
 */
export default function InicioPorRol() {
  const user = useAuthStore((s) => s.user);

  if (puedeEntrar('/', user?.roles)) {
    return <DashboardPage />;
  }

  // Con varias areas y ninguna elegida todavia, rutaInicial() manda a /areas.
  const destino = areasDisponibles(user?.roles).length > 0 ? rutaInicial(user?.roles) : '/areas';
  return <Navigate to={destino} replace />;
}
