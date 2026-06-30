import { useNavigate, useLocation, Link } from 'react-router-dom';
import { HardHat, FolderOpen, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isCasos = location.pathname === '/';

  return (
    <div className="h-dvh flex flex-col bg-lienzo font-pirai overflow-hidden">
      {/* Header */}
      <header className="shrink-0 z-10 bg-catedral text-lienzo px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 min-w-0"
          aria-label="Ir a casos"
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
        <div className="max-w-sm mx-auto px-4 py-5">{children}</div>
      </main>

      {/* Bottom nav — patrón móvil */}
      <nav className="shrink-0 z-10 bg-perla border-t border-arcilla safe-area-bottom">
        <div className="flex items-center justify-around py-2.5">
          <Link
            to="/"
            className={`flex flex-col items-center gap-0.5 px-6 py-1 transition-colors ${
              isCasos ? 'text-catedral' : 'text-arena'
            }`}
          >
            <FolderOpen className="w-5 h-5" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Casos</span>
          </Link>

          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-0.5 px-6 py-1 text-arena hover:text-ladrillo transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Salir</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
