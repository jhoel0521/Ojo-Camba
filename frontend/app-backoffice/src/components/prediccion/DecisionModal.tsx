import { useEffect, useState } from 'react';
import { Check, PencilLine, X } from 'lucide-react';
import type { AccionRecomendacion, Alerta } from '../../lib/prediccionApi';

/**
 * Registro de la decision del coordinador (ISSUE-32, criterio 4).
 *
 * Aceptar, modificar y descartar exigen motivo por igual: la issue pide
 * justificar *cualquier* decision, no solo las que contradicen al modelo. El
 * boton queda deshabilitado hasta que el motivo alcanza el minimo que valida el
 * backend, para no ir al servidor a buscar un 400 evitable.
 */

const MOTIVO_MINIMO = 10;

const ACCIONES: {
  valor: AccionRecomendacion;
  label: string;
  ayuda: string;
  icono: typeof Check;
  clase: string;
}[] = [
  {
    valor: 'Aceptada',
    label: 'Aceptar',
    ayuda: 'Se solicita el apoyo tal como lo plantea la recomendacion.',
    icono: Check,
    clase: 'border-green-600 bg-green-50 text-green-800',
  },
  {
    valor: 'Modificada',
    label: 'Modificar',
    ayuda: 'Se actua, pero de otra forma. Explicá cual.',
    icono: PencilLine,
    clase: 'border-sol-camba bg-sol-camba/10 text-ladrillo',
  },
  {
    valor: 'Descartada',
    label: 'Descartar',
    ayuda: 'No se actua sobre esta alerta. Explicá por que.',
    icono: X,
    clase: 'border-rosa-toborochi bg-rosa-toborochi/10 text-tierra',
  },
];

interface Props {
  alerta: Alerta | null;
  periodo: { desde: string | null; hasta: string | null };
  versionModelo: string | null;
  versionDataset: string | null;
  guardando: boolean;
  error: string | null;
  onCancelar: () => void;
  onConfirmar: (accion: AccionRecomendacion, motivo: string) => void;
  nombreCategoria: (id: number | null) => string;
}

export default function DecisionModal({
  alerta,
  periodo,
  versionModelo,
  versionDataset,
  guardando,
  error,
  onCancelar,
  onConfirmar,
  nombreCategoria,
}: Props) {
  const [accion, setAccion] = useState<AccionRecomendacion>('Aceptada');
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (alerta) {
      setAccion('Aceptada');
      setMotivo('');
    }
  }, [alerta]);

  if (!alerta) return null;

  const motivoValido = motivo.trim().length >= MOTIVO_MINIMO;
  const seleccionada = ACCIONES.find((a) => a.valor === accion);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Cancelar"
        className="absolute inset-0 bg-catedral/50"
        onClick={onCancelar}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-decision"
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl-3 bg-perla p-5 shadow-lg sm:rounded-3xl-3 sm:p-6"
      >
        <h3 id="titulo-decision" className="text-base font-semibold text-tierra">
          Decidir sobre la recomendacion
        </h3>
        <p className="mt-1 text-xs text-arena">
          Zona {alerta.zona_h3} &middot; {nombreCategoria(alerta.categoria_id)}
        </p>

        <div className="mt-4 rounded-3xl-2 border border-sol-camba/40 bg-sol-camba/5 p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ladrillo">
            Recomendacion del modelo &middot; estimacion
          </p>
          <p className="mt-1.5 text-sm text-tierra">{alerta.recomendacion}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-ladrillo">
            <div>
              <dt className="text-arena">Casos estimados</dt>
              <dd className="font-semibold">{alerta.casos_estimados}</dd>
            </div>
            <div>
              <dt className="text-arena">Riesgo de capacidad</dt>
              <dd className="font-semibold">{Math.round(alerta.riesgo * 100)}%</dd>
            </div>
            <div>
              <dt className="text-arena">Confianza</dt>
              <dd className="font-semibold">{alerta.confianza}</dd>
            </div>
            <div>
              <dt className="text-arena">Semana pronosticada</dt>
              <dd className="font-semibold">
                {periodo.desde ?? '—'} a {periodo.hasta ?? '—'}
              </dd>
            </div>
          </dl>
          {alerta.factores.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-ladrillo">
              {alerta.factores.map((factor) => (
                <li key={factor}>&middot; {factor}</li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[10px] text-arena">
            Modelo {versionModelo ?? '—'} &middot; dataset {versionDataset ?? '—'}
          </p>
        </div>

        <fieldset className="mt-4">
          <legend className="text-xs font-medium text-tierra">Que se resuelve</legend>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {ACCIONES.map(({ valor, label, icono: Icono, clase }) => (
              <button
                key={valor}
                type="button"
                aria-pressed={accion === valor}
                onClick={() => setAccion(valor)}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-3xl-2 border px-3 py-2.5 text-sm font-medium transition-colors ${
                  accion === valor ? clase : 'border-arcilla bg-perla text-ladrillo hover:bg-yeso'
                }`}
              >
                <Icono className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-arena">{seleccionada?.ayuda}</p>
        </fieldset>

        <label className="mt-4 block">
          <span className="text-xs font-medium text-tierra">Motivo de la decision</span>
          <textarea
            value={motivo}
            onChange={(evento) => setMotivo(evento.target.value)}
            rows={3}
            placeholder="Que se hizo y por que. Queda registrado con tu nombre y la fecha."
            className="mt-1.5 w-full rounded-3xl-2 border border-arcilla bg-perla px-3.5 py-2.5 text-sm text-tierra outline-none placeholder:text-almendra focus:border-ladrillo"
          />
          <span className="mt-1 block text-[10px] text-arena">
            {motivoValido
              ? 'Queda en el historial junto a la recomendacion original.'
              : `Faltan ${MOTIVO_MINIMO - motivo.trim().length} caracteres: toda decision se justifica.`}
          </span>
        </label>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-3xl-2 bg-rosa-toborochi/10 p-3 text-xs text-tierra"
          >
            {error}
          </p>
        )}

        <p className="mt-4 text-[10px] text-arena">
          Registrar la decision no asigna ni reasigna cuadrillas: deja constancia de lo resuelto.
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancelar}
            disabled={guardando}
            className="min-h-11 rounded-3xl-3 bg-yeso px-5 py-2.5 text-sm font-medium text-ladrillo transition-colors hover:bg-arcilla disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirmar(accion, motivo.trim())}
            disabled={guardando || !motivoValido}
            className="min-h-11 rounded-3xl-3 bg-catedral px-5 py-2.5 text-sm font-semibold text-perla transition-all disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Registrar decision'}
          </button>
        </div>
      </div>
    </div>
  );
}
