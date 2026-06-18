import { X } from 'lucide-react';
import { useAppStore } from '../store/appStore';

const RESOLUTIONS = [
  { value: 8, label: 'Ciudad' },
  { value: 11, label: 'Barrio' },
  { value: 13, label: 'Calle' },
];

const CATEGORIAS = [
  { id: 1, nombre: 'Bache', color: 'bg-red-600' },
  { id: 2, nombre: 'Luminaria', color: 'bg-amber-500' },
  { id: 3, nombre: 'Residuos', color: 'bg-gray-600' },
  { id: 4, nombre: 'Alcantarillado', color: 'bg-blue-600' },
  { id: 5, nombre: 'Trafico', color: 'bg-green-600' },
  { id: 6, nombre: 'Otro', color: 'bg-purple-600' },
];

export default function FilterModal() {
  const filterOpen = useAppStore((s) => s.filterOpen);
  const setFilterOpen = useAppStore((s) => s.setFilterOpen);
  const filters = useAppStore((s) => s.filters);
  const setResolution = useAppStore((s) => s.setResolution);
  const toggleSoloActivos = useAppStore((s) => s.toggleSoloActivos);
  const toggleCategoria = useAppStore((s) => s.toggleCategoria);

  if (!filterOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-catedral/30"
      onClick={() => setFilterOpen(false)}
    >
      <div
        className="w-full max-w-sm bg-lienzo rounded-t-3xl-3 p-6 animate-slide-up max-h-[85dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-lg text-tierra">Filtros</h3>
          <button
            onClick={() => setFilterOpen(false)}
            className="w-8 h-8 bg-perla rounded-2xl flex items-center justify-center"
          >
            <X className="w-4 h-4 text-caoba" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-xs font-semibold text-arena uppercase tracking-wider mb-3">
            Resolucion H3
          </p>
          <div className="flex gap-2">
            {RESOLUTIONS.map((r) => (
              <button
                key={r.value}
                onClick={() => setResolution(r.value)}
                className={`flex-1 py-2.5 rounded-pill text-sm font-semibold border transition-all ${
                  filters.resolution === r.value
                    ? 'bg-catedral text-perla border-catedral'
                    : 'bg-perla text-tierra border-arcilla'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-xs font-semibold text-arena uppercase tracking-wider mb-3">Estado</p>
          <div className="flex gap-2">
            <button
              onClick={toggleSoloActivos}
              className={`flex-1 py-2.5 rounded-pill text-sm font-semibold border transition-all ${
                filters.soloActivos
                  ? 'bg-catedral text-perla border-catedral'
                  : 'bg-perla text-tierra border-arcilla'
              }`}
            >
              Activos
            </button>
            <button
              onClick={toggleSoloActivos}
              className={`flex-1 py-2.5 rounded-pill text-sm font-semibold border transition-all ${
                !filters.soloActivos
                  ? 'bg-catedral text-perla border-catedral'
                  : 'bg-perla text-tierra border-arcilla'
              }`}
            >
              Todos
            </button>
          </div>
        </div>

        <div className="mb-8">
          <p className="text-xs font-semibold text-arena uppercase tracking-wider mb-3">
            Categorias
          </p>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat.id}
                onClick={() => toggleCategoria(cat.id)}
                className={`flex items-center gap-2 py-2.5 px-3 rounded-3xl-2 border text-sm font-medium transition-all ${
                  filters.categorias.includes(cat.id)
                    ? 'bg-catedral text-perla border-catedral'
                    : 'bg-perla text-tierra border-arcilla'
                }`}
              >
                <span className={`w-3 h-3 rounded-full ${cat.color}`} />
                {cat.nombre}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setFilterOpen(false)}
          className="w-full bg-catedral text-perla font-semibold text-base py-3.5 rounded-pill"
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}
