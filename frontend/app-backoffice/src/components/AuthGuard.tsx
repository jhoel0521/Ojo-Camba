import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useEffect, useState } from 'react';
import { fetchAPI } from '../lib/api';

const MODERATOR_ROLES = ['moderador', 'admin'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn, login, logout } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const [denied, setDenied] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('ojo_camba_admin_token');
    if (!token) {
      setChecking(false);
      return;
    }

    if (isLoggedIn && user?.roles) {
      if (user.roles.some((r) => MODERATOR_ROLES.includes(r))) {
        setChecking(false);
        return;
      }
      setDenied(true);
      setChecking(false);
      return;
    }

    fetchAPI<{ valid: boolean; user_id: number; roles: string[]; email: string }>(
      '/auth/validate',
      { method: 'POST', body: JSON.stringify({ token }) },
    )
      .then((res) => {
        if (res.valid) {
          const userRoles = res.roles ?? [];
          if (userRoles.some((r) => MODERATOR_ROLES.includes(r))) {
            login({
              access_token: token,
              refresh_token: localStorage.getItem('ojo_camba_admin_refresh') ?? '',
              user: { id: res.user_id, nombre: res.email, email: res.email, roles: userRoles },
            });
            setChecking(false);
            return;
          }
        }
        logout();
        setChecking(false);
      })
      .catch(() => {
        setChecking(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lienzo font-pirai">
        <div className="w-8 h-8 border-2 border-caoba/30 border-t-caoba rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (denied || (user?.roles && !user.roles.some((r) => MODERATOR_ROLES.includes(r)))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lienzo font-pirai p-4">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-semibold text-tierra mb-2">Acceso denegado</h1>
          <p className="text-sm text-arena mb-6">
            Esta aplicacion requiere permisos de moderador o administrador.
          </p>
          <button
            onClick={() => {
              logout();
              window.location.href = '/login';
            }}
            className="bg-catedral text-perla font-medium text-sm px-8 py-3.5 rounded-3xl-3"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
