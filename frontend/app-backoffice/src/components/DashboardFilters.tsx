import { useState, useEffect, useCallback } from 'react';
import { X, CalendarRange } from 'lucide-react';
import TagFilterBar from './TagFilterBar';

type Granularidad = 'mes' | 'semana' | 'dia';

const GRANULARIDAD_LABELS: Record<Granularidad, string> = {
  mes: 'Meses',
  semana: 'Semanas',
  dia: 'Días',
};

interface DashboardFiltersProps {
  /** Valores aplicados actuales */
  desde: string;
  hasta: string;
  granularidad: Granularidad;
  /** Catálogos para los tag filters */
  estadoCatalog: readonly string[];
  categoriaCatalog: readonly string[];
  /** Estado de los tag filters */
  estadoInclude: Set<string>;
  estadoExclude: Set<string>;
  categoriaInclude: Set<string>;
  categoriaExclude: Set<string>;
  /** Callbacks */
  onDateRangeChange: (desde: string, hasta: string) => void;
  onClearDateRange: () => void;
  onGranularidadChange: (g: Granularidad) => void;
  onToggleEstadoInclude: (label: string) => void;
  onToggleEstadoExclude: (label: string) => void;
  onToggleCategoriaInclude: (label: string) => void;
  onToggleCategoriaExclude: (label: string) => void;
}

export default function DashboardFilters({
  desde,
  hasta,
  granularidad,
  estadoCatalog,
  categoriaCatalog,
  estadoInclude,
  estadoExclude,
  categoriaInclude,
  categoriaExclude,
  onDateRangeChange,
  onClearDateRange,
  onGranularidadChange,
  onToggleEstadoInclude,
  onToggleEstadoExclude,
  onToggleCategoriaInclude,
  onToggleCategoriaExclude,
}: DashboardFiltersProps) {
  // Estado local para fluidez inmediata al escribir/seleccionar fecha
  const [draftDesde, setDraftDesde] = useState(desde);
  const [draftHasta, setDraftHasta] = useState(hasta);

  // Sincronizar draft si los props desde/hasta cambian externamente (ej. URL o reset)
  useEffect(() => {
    setDraftDesde(desde);
  }, [desde]);

  useEffect(() => {
    setDraftHasta(hasta);
  }, [hasta]);

  // Commit al perder el foco (blur), no por temporizador: un debounce por
  // tiempo dispara con cualquier valor intermedio que el usuario tarde en
  // completar (ej. escribir el año dígito a dígito) — con día/mes ya
  // llenos, cada dígito nuevo arma una fecha completa aunque temporalmente
  // incorrecta, y si la pausa entre teclas supera el debounce, ese valor a
  // medio escribir se aplica como si fuera el definitivo. Blur es
  // determinístico: no importa cuánto tarde el usuario en escribir, solo se
  // aplica cuando termina de interactuar con el campo.
  const commit = useCallback(() => {
    if (draftDesde !== desde || draftHasta !== hasta) {
      onDateRangeChange(draftDesde, draftHasta);
    }
  }, [draftDesde, draftHasta, desde, hasta, onDateRangeChange]);

  const commitOnEnter = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') commit();
    },
    [commit],
  );

  const handleClear = useCallback(() => {
    setDraftDesde('');
    setDraftHasta('');
    onClearDateRange();
  }, [onClearDateRange]);

  const rangoActivo = !!(desde || hasta);

  return (
    <div className="bg-perla rounded-3xl-3 p-4 mb-6 space-y-4">
      {/* Fila 1: Rango de fecha + Granularidad */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Desde */}
        <div>
          <label
            htmlFor="filtro-desde"
            className="block text-[10px] text-arena uppercase tracking-wide font-medium mb-1"
          >
            Desde
          </label>
          <div className="relative">
            <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-arena pointer-events-none" />
            <input
              id="filtro-desde"
              type="date"
              value={draftDesde}
              onChange={(e) => setDraftDesde(e.target.value)}
              onBlur={commit}
              onKeyDown={commitOnEnter}
              className="bg-lienzo border border-arcilla rounded-2xl pl-9 pr-3 py-2 text-sm text-tierra min-h-[44px]"
            />
          </div>
        </div>

        {/* Hasta */}
        <div>
          <label
            htmlFor="filtro-hasta"
            className="block text-[10px] text-arena uppercase tracking-wide font-medium mb-1"
          >
            Hasta
          </label>
          <div className="relative">
            <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-arena pointer-events-none" />
            <input
              id="filtro-hasta"
              type="date"
              value={draftHasta}
              onChange={(e) => setDraftHasta(e.target.value)}
              onBlur={commit}
              onKeyDown={commitOnEnter}
              className="bg-lienzo border border-arcilla rounded-2xl pl-9 pr-3 py-2 text-sm text-tierra min-h-[44px]"
            />
          </div>
        </div>

        {/* Botón Limpiar (solo visible si hay filtro activo) */}
        {rangoActivo && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 text-sm font-medium text-caoba hover:text-ladrillo px-3 py-2.5 min-h-[44px] transition-colors"
          >
            <X className="w-4 h-4" />
            Limpiar fechas
          </button>
        )}

        {/* Separador visual */}
        <div className="hidden lg:block w-px h-8 bg-arcilla mx-1" />

        {/* Toggle de granularidad */}
        <div>
          <p className="text-[10px] text-arena uppercase tracking-wide font-medium mb-1">
            Granularidad
          </p>
          <div className="flex bg-lienzo rounded-pill p-1 gap-0.5">
            {(['mes', 'semana', 'dia'] as const).map((g) => (
              <button
                key={g}
                onClick={() => onGranularidadChange(g)}
                className={`px-4 py-1.5 text-xs font-medium rounded-pill min-h-[36px] transition-all ${
                  granularidad === g
                    ? 'bg-catedral text-perla shadow-sm'
                    : 'text-caoba hover:text-tierra'
                }`}
              >
                {GRANULARIDAD_LABELS[g]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fila 2: Filtros de tags */}
      <div className="flex flex-wrap gap-6 pt-2 border-t border-arcilla/50">
        <TagFilterBar
          title="Estado"
          catalog={estadoCatalog}
          include={estadoInclude}
          exclude={estadoExclude}
          onToggleInclude={onToggleEstadoInclude}
          onToggleExclude={onToggleEstadoExclude}
        />
        <TagFilterBar
          title="Categoría"
          catalog={categoriaCatalog}
          include={categoriaInclude}
          exclude={categoriaExclude}
          onToggleInclude={onToggleCategoriaInclude}
          onToggleExclude={onToggleCategoriaExclude}
        />
      </div>
    </div>
  );
}
