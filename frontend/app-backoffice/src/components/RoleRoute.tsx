import { Link, useLocation } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { areasDisponibles, puedeEntrar, rutaInicial } from '../lib/areas';

/**
 * Corta el acceso por URL directa a una ruta que el rol no tiene (ISSUE-30).
 * No redirige en silencio: explica que no hay permiso y ofrece volver al area
 * propia, para que el usuario entienda por que no llego a donde queria.
 */
export default function RoleRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  if (puedeEntrar(location.pathname, user?.roles)) {
    return <>{children}</>;
  }

  const propias = areasDisponibles(user?.roles);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <ShieldOff className="w-10 h-10 text-arena mb-4" />
      <h2 className="text-lg font-semibold text-tierra mb-1">Sin permiso para esta seccion</h2>
      <p className="text-sm text-arena max-w-sm mb-6">
        Tu perfil no tiene acceso a <span className="font-medium">{location.pathname}</span>.
        {propias.length > 0 && ' Volve a tu area de trabajo para continuar.'}
      </p>
      {propias.length > 0 && (
        <Link
          to={rutaInicial(user?.roles)}
          className="inline-flex items-center min-h-11 bg-catedral text-perla font-medium text-sm px-6 py-3 rounded-3xl-3"
        >
          Ir a {propias[0].label}
        </Link>
      )}
    </div>
  );
}
