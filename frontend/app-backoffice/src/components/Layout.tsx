import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  MapPin,
  ClipboardList,
  FolderOpen,
  Users,
  LogOut,
  Construction,
  Settings2,
  Repeat,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { areasDisponibles, olvidarArea, puedeEntrar } from '../lib/areas';
import Asistente from './Asistente';

// Que rol ve cada entrada lo decide lib/areas.ts (misma matriz que usa el
// guard de rutas), no banderas sueltas por item: antes el menu y AuthGuard
// tenian listas de roles distintas y se desincronizaron (ISSUE-30).
const NAV_ITEMS = [
  { to: '/', icon: Construction, label: 'Panel estrategico' },
  { to: '/revisar', icon: ClipboardList, label: 'Bandeja' },
  { to: '/casos', icon: FolderOpen, label: 'Casos' },
  { to: '/accesos', icon: Users, label: 'Accesos y cuadrillas' },
  { to: '/configuracion/ia', icon: Settings2, label: 'IA y respaldos' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  // En movil la navegacion es un panel deslizable; en escritorio (lg) la barra
  // queda fija como siempre (ISSUE-30, criterio de 375/390/428 px).
  const [menuAbierto, setMenuAbierto] = useState(false);

  const itemsVisibles = NAV_ITEMS.filter((item) => puedeEntrar(item.to, user?.roles));
  const puedeCambiarArea = areasDisponibles(user?.roles).length > 1;

  // Al cambiar de pantalla el panel se cierra solo: si no, tapa el contenido
  // recien cargado.
  useEffect(() => setMenuAbierto(false), [location.pathname]);

  const handleLogout = () => {
    olvidarArea();
    logout();
    navigate('/login');
  };

  const currentLabel =
    NAV_ITEMS.find(
      (n) => location.pathname === n.to || (n.to !== '/' && location.pathname.startsWith(n.to)),
    )?.label ?? 'BackOffice';

  return (
    <div className="h-screen overflow-hidden flex bg-lienzo font-pirai">
      {menuAbierto && (
        <button
          type="button"
          aria-label="Cerrar menu"
          onClick={() => setMenuAbierto(false)}
          className="fixed inset-0 z-30 bg-catedral/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 bg-catedral flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-5 border-b border-ladrillo/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 bg-lienzo rounded-2xl flex items-center justify-center shrink-0">
              <MapPin className="w-[18px] h-[18px] text-catedral" />
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-base text-lienzo tracking-tight">Ojo Camba</span>
              <p className="text-[10px] text-arena">BackOffice</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMenuAbierto(false)}
            aria-label="Cerrar menu"
            className="w-11 h-11 -mr-2 flex items-center justify-center text-arena lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {itemsVisibles.map(({ to, icon: Icon, label }) => {
            const active =
              location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
            return (
              <NavLink
                key={to}
                to={to}
                className={`flex min-h-11 items-center gap-3 px-3 py-2.5 rounded-3xl-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-ladrillo/40 text-lienzo'
                    : 'text-arena hover:text-lienzo hover:bg-ladrillo/20'
                }`}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
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
          {puedeCambiarArea && (
            <NavLink
              to="/areas"
              className="flex min-h-11 w-full items-center gap-3 px-3 py-2.5 rounded-3xl-2 text-sm font-medium text-arena transition-colors hover:bg-ladrillo/20 hover:text-lienzo"
            >
              <Repeat className="w-4.5 h-4.5 shrink-0" />
              Cambiar de area
            </NavLink>
          )}
          <button
            onClick={handleLogout}
            className="flex min-h-11 w-full items-center gap-3 px-3 py-2.5 rounded-3xl-2 text-sm font-medium text-arena transition-colors hover:bg-rosa-toborochi/10 hover:text-rosa-toborochi"
          >
            <LogOut className="w-4.5 h-4.5 shrink-0" />
            Cerrar sesion
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="shrink-0 bg-perla border-b border-arcilla px-4 py-3 lg:px-6 lg:py-3.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menu"
            aria-expanded={menuAbierto}
            className="w-11 h-11 -ml-2 flex items-center justify-center text-caoba lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-base text-tierra truncate">{currentLabel}</h1>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6">{children}</main>
      </div>

      <Asistente />
    </div>
  );
}
