import { Link, useLocation } from 'react-router-dom';
import { MapPin, Plus } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { device } = useAppStore();
  const isHome = location.pathname === '/';
  const isReporte = location.pathname === '/nuevo';
  const canReport = device?.canReport ?? false;
  const isMobile = device?.isMobile ?? true;

  return (
    <div className="h-dvh flex flex-col bg-lienzo font-pirai overflow-hidden">
      <header className="shrink-0 z-10 bg-catedral">
        <div
          className={`mx-auto px-4 py-3.5 flex items-center justify-between ${isMobile ? 'max-w-sm' : ''}`}
        >
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-lienzo rounded-2xl flex items-center justify-center">
              <MapPin className="w-[18px] h-[18px] text-catedral" />
            </div>
            <span className="font-semibold text-base text-lienzo tracking-tight">Ojo Camba</span>
          </Link>

          {!isMobile && (
            <nav className="flex items-center gap-6 text-sm text-arena">
              <Link
                to="/"
                className={`hover:text-lienzo transition-colors ${isHome ? 'text-lienzo font-medium' : ''}`}
              >
                Mapa
              </Link>
              <Link to="/mis-reportes" className="hover:text-lienzo transition-colors">
                Mis Reportes
              </Link>
              <Link to="/perfil" className="hover:text-lienzo transition-colors">
                Perfil
              </Link>
            </nav>
          )}

          {canReport && !isMobile && !isReporte && (
            <Link
              to="/nuevo"
              className="px-5 py-2.5 bg-sol-camba text-catedral text-sm font-bold rounded-pill hover:shadow-lg transition-all"
            >
              Reportar
            </Link>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-hidden">{children}</div>

      {canReport && !isReporte && (
        <Link
          to="/nuevo"
          className="fixed bottom-20 md:bottom-6 right-4 z-[9999] w-14 h-14 bg-sol-camba text-catedral rounded-pill shadow-lg active:scale-95 transition-all flex items-center justify-center"
        >
          <Plus className="w-7 h-7" />
        </Link>
      )}

      {isMobile && (
        <nav className="shrink-0 z-10 bg-perla border-t border-arcilla">
          <div className="max-w-sm mx-auto flex items-center justify-around py-2.5">
            <Link
              to="/"
              className={`flex flex-col items-center gap-0.5 px-4 ${isHome ? 'text-catedral' : 'text-arena'}`}
            >
              <MapPin className="w-5 h-5" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">Mapa</span>
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}
