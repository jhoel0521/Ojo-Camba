import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, FileText, Search, ShieldCheck, UserPlus, UsersRound } from 'lucide-react';
import {
  type CiudadanoGestionable,
  type RolGestionable,
  type SolicitudTi,
  listCiudadanos,
  listRolesGestionables,
  listSolicitudesTi,
  registrarSolicitudTi,
} from '../lib/accesosApi';
import { friendlyError } from '../lib/errors';

const solicitudSchema = z.object({
  tipo: z.enum(['alta', 'cambio', 'baja', 'conformacion_cuadrilla']),
  referencia_carta: z.string().min(2, 'Indica la referencia de la carta o solicitud.'),
  comentario: z.string().max(1000, 'El comentario no puede superar 1000 caracteres.').optional(),
  crearCuadrilla: z.boolean(),
  nombreCuadrilla: z.string(),
  cuadrillaId: z.string(),
  responsable: z.string(),
});

type SolicitudForm = z.infer<typeof solicitudSchema>;
type Seleccion = Record<number, string[]>;

const ETIQUETAS_TIPO = {
  alta: 'Alta de funciones',
  cambio: 'Cambio de funciones',
  baja: 'Baja de funciones',
  conformacion_cuadrilla: 'Conformación de cuadrilla',
};

function etiquetaRol(rol: string) {
  return rol.replace(/_/g, ' ');
}

function estaSeleccionado(seleccion: Seleccion, usuarioId: number) {
  return Object.prototype.hasOwnProperty.call(seleccion, usuarioId);
}

export default function GestionAccesosPage() {
  const [busqueda, setBusqueda] = useState('');
  const [ciudadanos, setCiudadanos] = useState<CiudadanoGestionable[]>([]);
  const [roles, setRoles] = useState<RolGestionable[]>([]);
  const [seleccion, setSeleccion] = useState<Seleccion>({});
  const [personasSeleccionadas, setPersonasSeleccionadas] = useState<
    Record<number, CiudadanoGestionable>
  >({});
  const [historial, setHistorial] = useState<SolicitudTi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SolicitudForm>({
    resolver: zodResolver(solicitudSchema),
    defaultValues: {
      tipo: 'alta',
      referencia_carta: '',
      comentario: '',
      crearCuadrilla: false,
      nombreCuadrilla: '',
      cuadrillaId: '',
      responsable: '',
    },
  });
  const crearCuadrilla = watch('crearCuadrilla');
  const responsable = watch('responsable');

  const cargar = useCallback(async (q?: string) => {
    setCargando(true);
    try {
      const [resCiudadanos, resRoles, resHistorial] = await Promise.all([
        listCiudadanos(1, 20, q),
        listRolesGestionables(),
        listSolicitudesTi(),
      ]);
      setCiudadanos(resCiudadanos.data);
      setRoles(resRoles.filter((rol) => rol.gestionable));
      setHistorial(resHistorial.data);
      setError('');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void cargar(busqueda || undefined), 300);
    return () => clearTimeout(timer);
  }, [busqueda, cargar]);

  const seleccionados = useMemo(
    () => Object.values(personasSeleccionadas),
    [personasSeleccionadas],
  );
  const tecnicosSeleccionados = seleccionados.filter((ciudadano) =>
    (seleccion[ciudadano.id] ?? []).includes('tecnico'),
  );

  const alternarPersona = (ciudadano: CiudadanoGestionable) => {
    const activo = estaSeleccionado(seleccion, ciudadano.id);
    setSeleccion((actual) => {
      const siguiente = { ...actual };
      if (activo) delete siguiente[ciudadano.id];
      else {
        siguiente[ciudadano.id] = ciudadano.roles.filter(
          (rol) => rol !== 'ciudadano' && roles.some((item) => item.nombre === rol),
        );
      }
      return siguiente;
    });
    setPersonasSeleccionadas((actual) => {
      const siguiente = { ...actual };
      if (activo) delete siguiente[ciudadano.id];
      else siguiente[ciudadano.id] = ciudadano;
      return siguiente;
    });
  };

  const alternarRol = (usuarioId: number, rol: string) => {
    setSeleccion((actual) => {
      const actuales = actual[usuarioId] ?? [];
      return {
        ...actual,
        [usuarioId]: actuales.includes(rol)
          ? actuales.filter((item) => item !== rol)
          : [...actuales, rol],
      };
    });
  };

  const enviar = async (form: SolicitudForm) => {
    setError('');
    setExito('');
    if (seleccionados.length === 0) {
      setError('Selecciona al menos una persona ciudadana.');
      return;
    }
    const responsableId = Number(form.responsable);
    if (form.crearCuadrilla && !form.nombreCuadrilla.trim() && !form.cuadrillaId.trim()) {
      setError('Escribe el nombre de la cuadrilla nueva o el ID de una cuadrilla existente.');
      return;
    }
    if (
      form.crearCuadrilla &&
      !tecnicosSeleccionados.some((persona) => persona.id === responsableId)
    ) {
      setError('El responsable debe ser uno de los técnicos seleccionados.');
      return;
    }

    setGuardando(true);
    try {
      const resultado = await registrarSolicitudTi({
        tipo: form.tipo,
        referencia_carta: form.referencia_carta,
        comentario: form.comentario?.trim() || undefined,
        cambios: seleccionados.map((persona) => ({
          usuario_id: persona.id,
          roles: seleccion[persona.id] ?? [],
        })),
        cuadrilla: form.crearCuadrilla
          ? {
              cuadrilla_id: form.cuadrillaId.trim() ? Number(form.cuadrillaId) : undefined,
              nombre: form.nombreCuadrilla.trim() || undefined,
              responsable_usuario_id: responsableId,
              miembro_usuario_ids: tecnicosSeleccionados.map((persona) => persona.id),
            }
          : undefined,
      });
      setExito(`Solicitud #${resultado.id} aplicada para ${seleccionados.length} persona(s).`);
      setSeleccion({});
      setPersonasSeleccionadas({});
      reset();
      await cargar(busqueda || undefined);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <section className="bg-catedral text-lienzo rounded-3xl-4 p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-7 h-7 shrink-0 text-amarillo" />
          <div>
            <p className="text-xs uppercase tracking-wider text-arena">Encargado TI</p>
            <h2 className="font-semibold text-2xl mt-1">Promoción y cuadrillas</h2>
            <p className="text-sm text-arena mt-2 max-w-2xl">
              Cada persona conserva su condición de ciudadana. Este flujo deja una evidencia
              verificable de la solicitud y actualiza sus permisos de forma segura.
            </p>
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-3xl-2 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {exito && (
        <p className="rounded-3xl-2 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {exito}
        </p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)] gap-6">
        <section className="bg-perla rounded-3xl-3 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-semibold text-tierra">1. Buscar y seleccionar ciudadanos</h3>
              <p className="text-xs text-arena mt-1">
                Puedes atender varias personas en una sola carta.
              </p>
            </div>
            <span className="shrink-0 rounded-pill bg-arena/20 px-3 py-1 text-xs font-semibold text-ladrillo">
              {seleccionados.length} seleccionado(s)
            </span>
          </div>
          <label className="relative block mb-3">
            <Search className="absolute left-3.5 top-1/2 w-4 h-4 -translate-y-1/2 text-arena" />
            <input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por nombre o correo"
              className="w-full min-h-12 rounded-3xl-3 border border-arcilla bg-lienzo pl-10 pr-4 text-sm text-tierra outline-none focus:border-caoba"
            />
          </label>
          <div className="space-y-2 max-h-[29rem] overflow-y-auto pr-1">
            {cargando ? (
              [1, 2, 3].map((item) => (
                <div key={item} className="h-20 animate-pulse rounded-3xl-2 bg-yeso" />
              ))
            ) : ciudadanos.length === 0 ? (
              <p className="py-8 text-center text-sm text-arena">No se encontraron ciudadanos.</p>
            ) : (
              ciudadanos.map((ciudadano) => {
                const activo = estaSeleccionado(seleccion, ciudadano.id);
                return (
                  <button
                    type="button"
                    key={ciudadano.id}
                    onClick={() => alternarPersona(ciudadano)}
                    aria-pressed={activo}
                    className={`w-full min-h-16 rounded-3xl-2 border p-3 text-left transition-colors ${activo ? 'border-caoba bg-amarillo/15' : 'border-arcilla bg-lienzo hover:border-caoba/60'}`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${activo ? 'border-caoba bg-caoba text-perla' : 'border-arena text-transparent'}`}
                      >
                        <Check className="w-4 h-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-tierra">
                          {ciudadano.nombre}
                        </span>
                        <span className="block truncate text-xs text-arena">{ciudadano.email}</span>
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <form
          onSubmit={handleSubmit(enviar)}
          className="bg-perla rounded-3xl-3 p-4 sm:p-5 space-y-5"
        >
          <div>
            <h3 className="font-semibold text-tierra">2. Respaldar y ejecutar</h3>
            <p className="text-xs text-arena mt-1">La acción se aplica en una única transacción.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-ladrillo">
              Tipo de solicitud
              <select
                {...register('tipo')}
                className="mt-1.5 min-h-12 w-full rounded-3xl-3 border border-arcilla bg-lienzo px-4 text-sm font-normal normal-case text-tierra outline-none focus:border-caoba"
              >
                {Object.entries(ETIQUETAS_TIPO).map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-ladrillo">
              Carta o referencia
              <input
                {...register('referencia_carta')}
                placeholder="Ej. CITE-DSI-024/2026"
                className="mt-1.5 min-h-12 w-full rounded-3xl-3 border border-arcilla bg-lienzo px-4 text-sm font-normal normal-case text-tierra outline-none focus:border-caoba"
              />
              {errors.referencia_carta && (
                <span className="mt-1 block normal-case text-red-600">
                  {errors.referencia_carta.message}
                </span>
              )}
            </label>
          </div>

          <label className="block text-xs font-semibold uppercase tracking-wide text-ladrillo">
            Comentario de respaldo
            <textarea
              {...register('comentario')}
              rows={3}
              placeholder="Motivo, alcance o referencia de la nota recibida"
              className="mt-1.5 w-full rounded-3xl-3 border border-arcilla bg-lienzo px-4 py-3 text-sm font-normal normal-case text-tierra outline-none focus:border-caoba"
            />
          </label>

          {seleccionados.length > 0 && (
            <div className="space-y-3 border-t border-arcilla pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ladrillo">
                Funciones solicitadas
              </p>
              {seleccionados.map((persona) => (
                <div key={persona.id} className="rounded-3xl-2 bg-lienzo p-3">
                  <p className="text-sm font-medium text-tierra">{persona.nombre}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {roles.map((rol) => {
                      const activo = (seleccion[persona.id] ?? []).includes(rol.nombre);
                      return (
                        <button
                          type="button"
                          key={rol.nombre}
                          onClick={() => alternarRol(persona.id, rol.nombre)}
                          aria-pressed={activo}
                          className={`min-h-11 rounded-pill border px-3 text-xs font-medium capitalize ${activo ? 'border-caoba bg-caoba text-perla' : 'border-arcilla text-ladrillo hover:border-caoba'}`}
                        >
                          {etiquetaRol(rol.nombre)}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[11px] text-arena">Ciudadano permanece siempre activo.</p>
                </div>
              ))}
            </div>
          )}

          <label className="flex min-h-12 items-center gap-3 rounded-3xl-2 border border-arcilla bg-lienzo px-4 text-sm text-tierra">
            <input
              type="checkbox"
              {...register('crearCuadrilla')}
              className="h-4 w-4 accent-caoba"
            />
            <UsersRound className="w-4 h-4 text-caoba" />
            Conformar o actualizar una cuadrilla en esta solicitud
          </label>

          {crearCuadrilla && (
            <div className="space-y-3 rounded-3xl-2 border border-amarillo/50 bg-amarillo/10 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-ladrillo">
                  Nombre nueva cuadrilla
                  <input
                    {...register('nombreCuadrilla')}
                    placeholder="Cuadrilla Norte"
                    className="mt-1.5 min-h-12 w-full rounded-3xl-3 border border-arcilla bg-lienzo px-4 text-sm font-normal normal-case text-tierra outline-none focus:border-caoba"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-ladrillo">
                  O ID a actualizar
                  <input
                    {...register('cuadrillaId')}
                    inputMode="numeric"
                    placeholder="Ej. 4"
                    className="mt-1.5 min-h-12 w-full rounded-3xl-3 border border-arcilla bg-lienzo px-4 text-sm font-normal normal-case text-tierra outline-none focus:border-caoba"
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-ladrillo">
                Responsable de cuadrilla
                <select
                  {...register('responsable')}
                  value={responsable}
                  onChange={(event) => setValue('responsable', event.target.value)}
                  className="mt-1.5 min-h-12 w-full rounded-3xl-3 border border-arcilla bg-lienzo px-4 text-sm font-normal normal-case text-tierra outline-none focus:border-caoba"
                >
                  <option value="">Selecciona un técnico</option>
                  {tecnicosSeleccionados.map((persona) => (
                    <option key={persona.id} value={persona.id}>
                      {persona.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-ladrillo">
                Los técnicos seleccionados formarán la cuadrilla. Debe haber un responsable.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={guardando}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-3xl-3 bg-catedral px-5 text-sm font-semibold text-perla shadow-sm transition-colors hover:bg-tierra disabled:opacity-60"
          >
            {guardando ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-perla/40 border-t-perla" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {guardando ? 'Aplicando solicitud…' : 'Guardar solicitud y aplicar cambios'}
          </button>
        </form>
      </div>

      <section className="bg-perla rounded-3xl-3 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus className="w-4 h-4 text-caoba" />
          <h3 className="font-semibold text-tierra">Últimas solicitudes TI</h3>
        </div>
        {historial.length === 0 ? (
          <p className="text-sm text-arena">Aún no hay solicitudes registradas.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {historial.map((solicitud) => (
              <article
                key={solicitud.id}
                className="rounded-3xl-2 border border-arcilla bg-lienzo p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold capitalize text-caoba">
                    {ETIQUETAS_TIPO[solicitud.tipo as keyof typeof ETIQUETAS_TIPO] ??
                      solicitud.tipo}
                  </span>
                  <span className="rounded-pill bg-green-100 px-2 py-1 text-[10px] font-semibold text-green-800">
                    {solicitud.resultado}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-tierra">{solicitud.referencia_carta}</p>
                <p className="mt-1 text-xs text-arena">
                  {solicitud.usuarios.length} persona(s) ·{' '}
                  {new Date(solicitud.creado_en).toLocaleDateString('es-BO')}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
