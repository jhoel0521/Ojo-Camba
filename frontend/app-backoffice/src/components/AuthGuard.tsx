import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useEffect, useRef, useState } from 'react';
import { fetchAPI } from '../lib/api';
import { getUser } from '../lib/auth';
import { areasDisponibles, olvidarArea, tieneAccesoAlBackoffice } from '../lib/areas';

/**
 * Valida la sesion y que el perfil tenga al menos un area del Backoffice
 * (ISSUE-30). Quien decide que rol entra a que area es lib/areas.ts: antes
 * habia una lista de roles hardcodeada aca que se quedo sin
 * coordinador_operativo ni autoridad_municipal, y esos perfiles recibian
 * "acceso denegado" pese a existir en el backend.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn, login, logout } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const [denied, setDenied] = useState(false);
  const location = useLocation();
  const validado = useRef(false);

  useEffect(() => {
    // Una sola validacion por sesion de pagina: el efecto se remonta con las
    // rutas anidadas (y StrictMode lo duplica en dev), y cada montaje disparaba
    // su propio POST /auth/validate.
    if (validado.current) return;
    validado.current = true;

    const token = localStorage.getItem('ojo_camba_admin_token');
    if (!token) {
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
        if (!res.valid) {
          logout();
          setChecking(false);
          return;
        }

        const userRoles = res.roles ?? [];
        if (!tieneAccesoAlBackoffice(userRoles)) {
          setDenied(true);
          setChecking(false);
          return;
        }

        login({
          access_token: token,
          refresh_token: localStorage.getItem('ojo_camba_admin_refresh') ?? '',
          user: { id: res.user_id, nombre: res.email, email: res.email, roles: userRoles },
        });
        setChecking(false);
      })
      .catch(() => {
        // Un fallo de red (o una respuesta vacia bajo carga) no es motivo para
        // cerrar la sesion: se sigue con lo guardado y el backend igual rechaza
        // con 401/403 lo que no corresponda. Antes cualquier hipo deslogueaba.
        const guardado = getUser();
        if (guardado && tieneAccesoAlBackoffice(guardado.roles)) {
          login({
            access_token: token,
            refresh_token: localStorage.getItem('ojo_camba_admin_refresh') ?? '',
            user: guardado,
          });
        } else {
          logout();
        }
        setChecking(false);
      });
  }, [login, logout]);

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

  if (denied || (user && areasDisponibles(user.roles).length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lienzo font-pirai p-4">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-semibold text-tierra mb-2">Acceso denegado</h1>
          <p className="text-sm text-arena mb-6">
            Tu cuenta no tiene un area asignada en el BackOffice. Si sos tecnico de campo, tu
            trabajo esta en la app tecnica.
          </p>
          <button
            onClick={() => {
              olvidarArea();
              logout();
              window.location.href = '/login';
            }}
            className="bg-catedral text-perla font-medium text-sm px-8 py-3.5 rounded-3xl-3 min-h-11"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
