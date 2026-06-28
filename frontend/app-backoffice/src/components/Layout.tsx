import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { MapPin, ClipboardList, FolderOpen, Users, LogOut, Construction } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const NAV_ITEMS = [
  { to: '/', icon: Construction, label: 'Dashboard' },
  { to: '/revisar', icon: ClipboardList, label: 'Revisar' },
  { to: '/casos', icon: FolderOpen, label: 'Casos' },
  { to: '/usuarios', icon: Users, label: 'Usuarios' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentLabel =
    NAV_ITEMS.find(
      (n) => location.pathname === n.to || (n.to !== '/' && location.pathname.startsWith(n.to)),
    )?.label ?? 'BackOffice';

  return (
    <div className="h-screen overflow-hidden flex bg-lienzo font-pirai">
      <aside className="w-64 shrink-0 bg-catedral flex flex-col">
        <div className="px-5 py-5 border-b border-ladrillo/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-lienzo rounded-2xl flex items-center justify-center">
              <MapPin className="w-[18px] h-[18px] text-catedral" />
            </div>
            <div>
              <span className="font-semibold text-base text-lienzo tracking-tight">Ojo Camba</span>
              <p className="text-[10px] text-arena">BackOffice</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
            const active =
              location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
            return (
              <NavLink
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-3xl-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-ladrillo/40 text-lienzo'
                    : 'text-arena hover:text-lienzo hover:bg-ladrillo/20'
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                {label}
              </NavLink>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-ladrillo/30 space-y-1">
          {user && (
            <div className="px-3 py-2 text-xs text-arena">
              <p className="text-lienzo font-medium truncate">{user.nombre}</p>
              <p className="truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-3xl-2 text-sm font-medium text-arena hover:text-rosa-toborochi hover:bg-rosa-toborochi/10 transition-colors"
          >
            <LogOut className="w-4.5 h-4.5" />
            Cerrar sesion
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="shrink-0 bg-perla border-b border-arcilla px-6 py-3.5">
          <h1 className="font-semibold text-base text-tierra">{currentLabel}</h1>
        </header>
        <main className="flex-1 overflow-hidden p-6">{children}</main>
      </div>
    </div>
  );
}
