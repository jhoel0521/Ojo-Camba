import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, FileText, LogOut, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function UserMenu() {
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    if (user) {
      await fetch('/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      }).catch(() => {});
    }
    logout();
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 flex items-center justify-center text-arena hover:text-lienzo transition-colors"
      >
        <div className="w-8 h-8 bg-lienzo rounded-full flex items-center justify-center text-catedral text-xs font-bold">
          {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-perla border border-arcilla rounded-3xl-2 shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3.5 border-b border-arcilla bg-lienzo">
            <p className="text-[10px] text-arena uppercase tracking-wide font-medium">
              Conectado como
            </p>
            <p className="text-sm text-tierra font-medium mt-0.5 truncate">{user?.email}</p>
          </div>

          <div className="py-1">
            <Link
              to="/perfil"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-tierra hover:bg-yeso transition-colors"
            >
              <div className="w-8 h-8 rounded-2xl bg-lienzo flex items-center justify-center">
                <User className="w-4 h-4 text-caoba" />
              </div>
              <span className="font-medium flex-1">Perfil</span>
              <ChevronRight className="w-3.5 h-3.5 text-arena" />
            </Link>

            <Link
              to="/mis-reportes"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-tierra hover:bg-yeso transition-colors"
            >
              <div className="w-8 h-8 rounded-2xl bg-lienzo flex items-center justify-center">
                <FileText className="w-4 h-4 text-caoba" />
              </div>
              <span className="font-medium flex-1">Mis Reportes</span>
              <ChevronRight className="w-3.5 h-3.5 text-arena" />
            </Link>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-tierra hover:bg-rosa-toborochi/10 transition-colors"
            >
              <div className="w-8 h-8 rounded-2xl bg-rosa-toborochi/10 flex items-center justify-center">
                <LogOut className="w-4 h-4 text-rosa-toborochi" />
              </div>
              <span className="font-medium flex-1 text-left">Cerrar sesion</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
