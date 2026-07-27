import { useEffect, useState } from 'react';
import {
  Users,
  Sparkles,
  Check,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import {
  listCuadrillas,
  recomendarCuadrilla,
  asignarCuadrilla,
  type Cuadrilla,
  type RecomendacionCuadrilla,
  type AsignacionResultado,
} from '../lib/cuadrillasApi';
import { friendlyError } from '../lib/errors';

interface CuadrillaAsignadaProps {
  grupoId: number;
  usuarioId: number;
  cuadrillaIdActual: number | null;
  cuadrillaNombreActual: string | null;
  onAsignada: (resultado: AsignacionResultado) => void;
}

/** "Sin asignar" viaja como null al backend; en los radios necesita un valor. */
const SIN_ASIGNAR = -1;

/**
 * Asignación de cuadrilla a un Caso de Obra, con recomendación explicable.
 * La IA (score de ms-ia) sugiere y muestra por qué; el moderador confirma —
 * mismo principio que la gravedad sugerida: nada se aplica solo.
 */
export default function CuadrillaAsignada({
  grupoId,
  usuarioId,
  cuadrillaIdActual,
  cuadrillaNombreActual,
  onAsignada,
}: CuadrillaAsignadaProps) {
  const [cuadrillas, setCuadrillas] = useState<Cuadrilla[]>([]);
  const [seleccion, setSeleccion] = useState<number>(cuadrillaIdActual ?? SIN_ASIGNAR);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [recomendacion, setRecomendacion] = useState<RecomendacionCuadrilla | null>(null);
  const [recomendando, setRecomendando] = useState(false);
  const [trazaAbierta, setTrazaAbierta] = useState(false);

  useEffect(() => {
    setCargando(true);
    listCuadrillas(true)
      .then(setCuadrillas)
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setCargando(false));
  }, []);

  const handleRecomendar = async () => {
    setRecomendando(true);
    setError('');
    try {
      const r = await recomendarCuadrilla(grupoId);
      setRecomendacion(r);
      // Precarga la sugerencia en los radios; el moderador la puede cambiar.
      if (r.recomendada) setSeleccion(r.recomendada.cuadrilla_id);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setRecomendando(false);
    }
  };

  const handleAsignar = async () => {
    setGuardando(true);
    setError('');
    try {
      const cuadrillaId = seleccion === SIN_ASIGNAR ? null : seleccion;
      const resultado = await asignarCuadrilla(grupoId, cuadrillaId, usuarioId);
      onAsignada(resultado);
      // La carga de cada cuadrilla cambió con esta asignación.
      setCuadrillas(await listCuadrillas(true));
      setRecomendacion(null);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setGuardando(false);
    }
  };

  const sinCambios = seleccion === (cuadrillaIdActual ?? SIN_ASIGNAR);

  return (
    <section className="bg-perla rounded-3xl-3 p-5 border border-arcilla">
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="font-semibold text-sm text-tierra flex items-center gap-2">
          <Users className="w-4 h-4 text-caoba" />
          Cuadrilla asignada
        </h3>
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-pill ${
            cuadrillaNombreActual ? 'bg-yeso text-catedral' : 'bg-lienzo text-arena'
          }`}
        >
          {cuadrillaNombreActual ?? 'Sin asignar'}
        </span>
      </div>

      <button
        type="button"
        onClick={handleRecomendar}
        disabled={recomendando || cargando}
        className="flex items-center gap-2 bg-yeso text-catedral font-medium text-xs px-4 py-3 rounded-pill hover:bg-arcilla hover:text-tierra disabled:opacity-60 transition-colors min-h-[44px] mb-4"
      >
        {recomendando ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        {recomendando ? 'Calculando…' : 'Recomendar cuadrilla'}
      </button>

      {recomendacion && (
        <div className="bg-lienzo border border-arcilla rounded-3xl-2 p-4 mb-4">
          {recomendacion.recomendada ? (
            <>
              <p className="text-sm text-tierra">
                Sugerida:{' '}
                <span className="font-semibold text-catedral">
                  {recomendacion.recomendada.nombre}
                </span>{' '}
                <span className="text-xs text-arena">
                  ({recomendacion.recomendada.puntaje} pts ·{' '}
                  {recomendacion.recomendada.casos_activos} caso(s) activo(s))
                </span>
              </p>
              <ul className="mt-2 space-y-1">
                {recomendacion.recomendada.motivos.map((m, i) => (
                  <li key={i} className="text-xs text-caoba flex gap-1.5">
                    <span className="text-arcilla">·</span>
                    {m}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-tierra">{recomendacion.nota}</p>
          )}

          {recomendacion.ranking.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setTrazaAbierta((v) => !v)}
                className="flex items-center gap-1 text-xs font-semibold text-caoba hover:text-tierra mt-3 transition-colors min-h-[44px]"
              >
                {trazaAbierta ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                Ver cómo se calculó
              </button>
              {trazaAbierta && (
                <div className="mt-1 space-y-2">
                  {recomendacion.traza.map((r) => (
                    <div key={r.id} className="text-xs">
                      <p className="text-tierra">{r.texto}</p>
                      <p className="text-arena">→ {r.conclusion}</p>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-arcilla">
                    {recomendacion.ranking.map((c) => (
                      <p key={c.cuadrilla_id} className="text-xs text-arena">
                        {c.nombre}: {c.puntaje} pts
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {cargando ? (
        <p className="text-xs text-arena">Cargando cuadrillas…</p>
      ) : cuadrillas.length === 0 ? (
        <p className="text-xs text-arena italic">No hay cuadrillas activas registradas todavía.</p>
      ) : (
        <div role="radiogroup" className="flex flex-wrap gap-2">
          {[
            { id: SIN_ASIGNAR, etiqueta: 'Sin asignar', detalle: '' },
            ...cuadrillas.map((c) => ({
              id: c.id,
              etiqueta: c.nombre,
              detalle: `${c.casos_activos} activo${c.casos_activos === 1 ? '' : 's'}`,
            })),
          ].map((opt) => {
            const checked = seleccion === opt.id;
            const esSugerida = recomendacion?.recomendada?.cuadrilla_id === opt.id;
            return (
              <label key={opt.id} className="cursor-pointer">
                <input
                  type="radio"
                  name={`cuadrilla-${grupoId}`}
                  value={opt.id}
                  checked={checked}
                  onChange={() => setSeleccion(opt.id)}
                  className="sr-only"
                  data-testid={`cuadrilla-${opt.id}`}
                />
                <span
                  className={`flex items-center gap-1.5 h-11 px-3.5 rounded-pill text-xs font-semibold whitespace-nowrap transition-colors ${
                    checked
                      ? 'bg-tierra text-perla shadow-sm'
                      : 'bg-yeso text-catedral hover:bg-arcilla hover:text-tierra'
                  }`}
                >
                  {esSugerida && <Sparkles className="w-3 h-3" />}
                  {opt.etiqueta}
                  {opt.detalle && (
                    <span className={checked ? 'text-arcilla' : 'text-arena'}>· {opt.detalle}</span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 mt-3 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleAsignar}
        disabled={guardando || sinCambios || cargando}
        className="flex items-center gap-2 bg-catedral text-perla font-medium text-sm px-6 py-3.5 rounded-3xl-3 shadow-md hover:bg-tierra disabled:opacity-60 transition-all min-h-[44px] mt-4"
      >
        <Check className="w-4 h-4" />
        {guardando ? 'Guardando…' : 'Guardar asignación'}
      </button>
    </section>
  );
}
