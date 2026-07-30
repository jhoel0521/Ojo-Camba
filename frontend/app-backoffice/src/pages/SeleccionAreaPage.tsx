import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { areasDisponibles, recordarArea, type Area } from '../lib/areas';

/**
 * Selector de area para quien tiene mas de un rol (ISSUE-30). La eleccion se
 * recuerda en localStorage, asi que esta pantalla solo aparece la primera vez
 * o cuando el usuario pide cambiar de area desde el menu.
 */
export default function SeleccionAreaPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const areas = areasDisponibles(user?.roles);

  const elegir = (area: Area) => {
    recordarArea(area.id);
    navigate(area.ruta, { replace: true });
  };

  return (
    <div className="min-h-screen bg-lienzo font-pirai flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-catedral rounded-hero mb-4">
            <MapPin className="w-7 h-7 text-lienzo" />
          </div>
          <h1 className="text-xl font-semibold text-tierra">Elegi tu area de trabajo</h1>
          <p className="text-sm text-arena mt-1">
            Tu cuenta tiene varios roles. Podes cambiar de area cuando quieras desde el menu.
          </p>
        </div>

        <div className="space-y-3">
          {areas.map((area) => (
            <button
              key={area.id}
              onClick={() => elegir(area)}
              className="w-full min-h-11 bg-perla border border-arcilla rounded-3xl-3 px-5 py-4 text-left flex items-center gap-4 hover:border-caoba transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-tierra">{area.label}</p>
                <p className="text-xs text-arena mt-0.5">{area.descripcion}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-caoba shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
