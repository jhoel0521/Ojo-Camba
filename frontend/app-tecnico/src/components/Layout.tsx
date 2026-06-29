import { useNavigate } from 'react-router-dom';
import { HardHat, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-lienzo font-pirai">
      <header className="sticky top-0 z-10 bg-catedral text-lienzo px-4 py-3 flex items-center justify-between shadow-md">
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
            <span className="text-[10px] text-arena leading-tight">Tecnicos en campo</span>
          </div>
        </button>

        <div className="flex items-center gap-3 min-w-0">
          {user && (
            <span className="text-xs text-arena truncate max-w-[40vw] hidden sm:block">
              {user.nombre}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-arena hover:text-rosa-toborochi transition-colors"
            aria-label="Cerrar sesion"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-5">{children}</main>
    </div>
  );
}
