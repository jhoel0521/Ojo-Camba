import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ClipboardList, HardHat, Home, LogOut, Navigation } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useOperacionContext } from './OperacionProvider';

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { contexto } = useOperacionContext();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const esCoordinador = contexto?.roles.includes('coordinador_operativo');
  const navItems = esCoordinador
    ? [{ to: '/', label: 'Inicio', icon: Home }]
    : [
        { to: '/', label: 'Inicio', icon: Home },
        { to: '/mis-obras', label: 'Obras', icon: ClipboardList },
        { to: '/mi-ruta', label: 'Ruta', icon: Navigation },
      ];

  return (
    <div className="h-dvh flex flex-col bg-lienzo font-pirai overflow-hidden">
      {/* Header */}
      <header className="shrink-0 z-10 bg-catedral text-lienzo px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 min-w-0"
          aria-label="Ir al inicio"
        >
          <div className="w-9 h-9 bg-selva rounded-2xl flex items-center justify-center shrink-0">
            <HardHat className="w-[18px] h-[18px] text-lienzo" />
          </div>
          <div className="text-left min-w-0">
            <span className="font-semibold text-sm tracking-tight block leading-tight">
              Ojo Camba
            </span>
            <span className="text-[10px] text-arena leading-tight truncate block max-w-[40vw]">
              {user?.nombre ?? 'Tecnico en campo'}
            </span>
          </div>
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-arena hover:text-rosa-toborochi transition-colors px-2 py-1"
          aria-label="Cerrar sesion"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Contenido principal — scrollable */}
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="max-w-md mx-auto px-4 py-5">{children}</div>
      </main>

      {/* Bottom nav — patrón móvil */}
      <nav className="shrink-0 z-10 bg-perla border-t border-arcilla safe-area-bottom">
        <div className="flex items-center justify-around gap-2 px-2 py-2">
          {navItems.map(({ to, label, icon: Icon }) => {
            const activo = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors ${
                  activo ? 'bg-yeso text-catedral' : 'text-arena'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
              </Link>
            );
          })}

          <button
            onClick={handleLogout}
            className="flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-arena hover:text-ladrillo transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Salir</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
