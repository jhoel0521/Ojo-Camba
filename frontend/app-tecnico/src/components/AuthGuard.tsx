import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { fetchAPI } from '../lib/api';
import { getToken, getRefreshToken } from '../lib/auth';

/**
 * La app de tecnicos acepta a cualquier usuario autenticado: los endpoints
 * de actualizacion no estan restringidos por rol, y no existe un rol
 * `tecnico` dedicado en el seed. Solo validamos que el token sea valido.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, login, logout } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setChecking(false);
      return;
    }

    if (isLoggedIn) {
      setChecking(false);
      return;
    }

    fetchAPI<{ valid: boolean; user_id: number; roles: string[]; email: string }>(
      '/auth/validate',
      {
        method: 'POST',
        body: JSON.stringify({ token }),
      },
    )
      .then((res) => {
        if (res.valid) {
          login({
            access_token: token,
            refresh_token: getRefreshToken() ?? '',
            user: {
              id: res.user_id,
              nombre: res.email,
              email: res.email,
              roles: res.roles ?? [],
            },
          });
        } else {
          logout();
        }
      })
      .catch(() => logout())
      .finally(() => setChecking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lienzo font-pirai">
        <div className="w-8 h-8 border-2 border-selva/30 border-t-selva rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
