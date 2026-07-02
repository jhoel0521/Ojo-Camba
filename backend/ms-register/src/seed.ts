import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as h3 from 'h3-js';
import {
  Reporte,
  GrupoReporte,
  Categoria,
  Dispositivo,
  ActualizacionCaso,
  EstadoReporte,
} from '@ojo-camba/common';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://ojocamba:ojocamba_secret@localhost:5432/ojocamba';

const ds = new DataSource({
  type: 'postgres',
  url: DATABASE_URL,
  synchronize: false,
  logging: false,
  entities: [Reporte, GrupoReporte, Categoria, Dispositivo, ActualizacionCaso],
});

// Bounding box de Santa Cruz de la Sierra
function randCoord() {
  return {
    lat: -(17.7 + Math.random() * 0.2),
    lng: -(63.1 + Math.random() * 0.15),
  };
}

// Distribución ponderada de categorías (35% bache, 20% luminaria, 20% residuos, 10% alcant, 10% tráfico, 5% otro)
const CAT_POOL = [1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 5, 5, 6];
const randCat = () => CAT_POOL[Math.floor(Math.random() * CAT_POOL.length)];

// Distribución ponderada de gravedad
const GRAV_POOL = [
  'Alta',
  'Alta',
  'Alta',
  'Alta',
  'Media',
  'Media',
  'Media',
  'Emergencia',
  'Baja',
  'Baja',
];
const randGrav = () => GRAV_POOL[Math.floor(Math.random() * GRAV_POOL.length)];

// Usuarios ya sembrados por ms-auth (admin, moderador2, tecnico, admin-demo) — se
// asignan al azar como autor de cada bitácora en vez de hardcodear siempre 1.
const USUARIOS_SEED = [1, 2, 3, 4];
const randUsuario = () => USUARIOS_SEED[Math.floor(Math.random() * USUARIOS_SEED.length)];

// Secuencia obligatoria del ciclo de vida de un Caso de Obra (debe coincidir con
// TRANSICIONES_VALIDAS en backend/ms-admin/src/admin.service.ts).
const SECUENCIA_ESTADOS = [
  EstadoReporte.Aceptado,
  EstadoReporte.ValidacionEnCampo,
  EstadoReporte.EnTrabajo,
  EstadoReporte.Finalizado,
];

const COMENTARIO_POR_ETAPA: Record<string, string> = {
  [EstadoReporte.ValidacionEnCampo]: 'Técnico asignado, validando la obra en terreno.',
  [EstadoReporte.EnTrabajo]: 'Cuadrilla iniciando los trabajos de reparación.',
  [EstadoReporte.Finalizado]: 'Obra finalizada y verificada.',
};

function siguienteEstado(actual: EstadoReporte): EstadoReporte | null {
  const idx = SECUENCIA_ESTADOS.indexOf(actual);
  if (idx === -1 || idx === SECUENCIA_ESTADOS.length - 1) return null;
  return SECUENCIA_ESTADOS[idx + 1];
}

// ── Parámetros de la simulación ─────────────────────────────────────────────
// Simulación hacia ADELANTE, día por día, desde hoy-DIAS_SIMULACION hasta hoy.
// El estado final de cada Caso de Obra emerge de la cadena de eventos — nunca
// se decide de antemano (a diferencia del seed anterior, que elegía el estado
// final primero y backdateaba una cadena retroactiva para que "cupiera").
const DIAS_SIMULACION = 700;
const P_REVISION_DIARIA = 0.35; // ~2.9 dias de espera promedio para revisar un Reportado
const TASA_ACEPTACION = 0.85;
const TASA_AGRUPAMIENTO = 0.8; // del resto queda Aceptado suelto, permanentemente
const TAM_LOTE_MIN = 2;
const TAM_LOTE_MAX = 5;

// Probabilidad DIARIA de avanzar un paso desde cada etapa (tiempo medio = 1/p).
// "EnTrabajo" es deliberadamente la más lenta: es el cuello de botella que ya
// asume buildInsights() en admin.service.ts ("tasa de resolución baja -> revisa
// los casos represados en 'En trabajo'", con link a /casos?estado=EnTrabajo).
const P_AVANCE: Record<string, number> = {
  [EstadoReporte.Aceptado]: 0.08, // ~12.5 dias
  [EstadoReporte.ValidacionEnCampo]: 0.06, // ~16.7 dias
  [EstadoReporte.EnTrabajo]: 0.035, // ~28.6 dias
};
const P_ESTANCAMIENTO_CRONICO = 0.05; // al ENTRAR a EnTrabajo, 5% de los casos queda con avance reducido
const P_AVANCE_ESTANCADO = 0.005;

interface CasoActivo {
  estadoActual: EstadoReporte;
  estancadoCronico: boolean;
}

interface PendienteRevision {
  id: number;
  categoria_id: number;
  creadoEnMs: number;
}

interface ReporteEnBuffer {
  id: number;
  creadoEnMs: number;
}

// Hora aleatoria dentro de una ventana horaria del día dado (7-18h para
// reportes ciudadanos, 8-17h para acciones de moderador/técnico) — nunca
// supera "ahora" si el día simulado es el día de hoy.
function horaAleatoria(dia: Date, horaMin: number, horaMax: number, ahoraMs: number): number {
  const base = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate()).getTime();
  const rangoMs = (horaMax - horaMin) * 60 * 60 * 1000;
  const ms = base + horaMin * 60 * 60 * 1000 + Math.random() * rangoMs;
  return Math.min(ms, ahoraMs);
}

// UPDATE en batch de creado_en (una sola consulta por tabla por día) — hace
// falta porque @CreateDateColumn sobreescribe con NOW() al guardar, sin
// importar el valor que traiga la entidad antes de .save().
async function bulkUpdateFechas(tabla: string, pares: { id: number; ms: number }[]) {
  if (pares.length === 0) return;
  const values = pares.map((_, i) => `($${i * 2 + 1}::int, $${i * 2 + 2}::timestamptz)`).join(', ');
  const params: (number | Date)[] = [];
  for (const p of pares) params.push(p.id, new Date(p.ms));
  await ds.query(
    `UPDATE ${tabla} AS t SET creado_en = v.creado_en FROM (VALUES ${values}) AS v(id, creado_en) WHERE t.id = v.id`,
    params,
  );
}

async function seed() {
  await ds.initialize();
  console.log('Conectado a PostgreSQL\n');

  console.log('Truncando tablas...');
  await ds.query(
    'TRUNCATE actualizaciones_caso, grupos_reportes, reportes, dispositivos RESTART IDENTITY CASCADE',
  );

  const categoriaRepo = ds.getRepository(Categoria);
  const reporteRepo = ds.getRepository(Reporte);
  const grupoRepo = ds.getRepository(GrupoReporte);
  const actualizacionRepo = ds.getRepository(ActualizacionCaso);

  for (const nombre of ['bache', 'luminaria', 'residuos', 'alcantarillado', 'trafico', 'otro']) {
    await categoriaRepo.upsert({ nombre }, ['nombre']);
  }
  console.log('Categorías: OK\n');

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const ahoraMs = Date.now();

  // ── Estado de la simulación (vive solo en memoria durante el loop) ───────
  const reportesPendientesRevision: PendienteRevision[] = [];
  const bufferAceptadosSinAgrupar = new Map<number, ReporteEnBuffer[]>(); // categoria_id -> reportes
  const casosActivos = new Map<number, CasoActivo>(); // grupoId -> estado
  let proximoCodigoObraSeq = 1;

  let totalReportes = 0;
  let totalRechazados = 0;
  let totalGrupos = 0;
  let totalActualizaciones = 0;

  console.log(`Simulando ${DIAS_SIMULACION} días día a día...\n`);

  for (let diaOffset = -DIAS_SIMULACION; diaOffset <= 0; diaOffset++) {
    const diaActual = new Date(hoy);
    diaActual.setDate(diaActual.getDate() + diaOffset);
    const esFinDeSemana = diaActual.getDay() === 0 || diaActual.getDay() === 6;

    // ── D1: nuevos reportes del día ──
    const progreso = (diaOffset + DIAS_SIMULACION) / DIAS_SIMULACION; // 0..1, crece hacia "hoy"
    const factorCrecimiento = 1 + progreso * 0.6;
    const factorFinDeSemana = esFinDeSemana ? 0.7 : 1.0;
    const cantidadHoy = Math.round((6 + Math.random() * 6) * factorCrecimiento * factorFinDeSemana);

    const diaStr = diaActual.toISOString().slice(0, 10);
    const entidadesDelDia: Reporte[] = [];
    const categoriasDelDia: number[] = [];
    const horasDelDia: number[] = [];

    for (let i = 0; i < cantidadHoy; i++) {
      const { lat, lng } = randCoord();
      const cat = randCat();
      categoriasDelDia.push(cat);
      horasDelDia.push(horaAleatoria(diaActual, 7, 18, ahoraMs));
      entidadesDelDia.push(
        reporteRepo.create({
          device_id: `seed-${diaStr}-r${i}`,
          lat,
          lng,
          categoria_id: cat,
          gravedad: randGrav(),
          h3_res_8: h3.latLngToCell(lat, lng, 8),
          h3_res_11: h3.latLngToCell(lat, lng, 11),
          h3_res_13: h3.latLngToCell(lat, lng, 13),
          url_imagen: `https://picsum.photos/seed/oc${diaStr}r${i}/400/300`,
          estado: EstadoReporte.Reportado,
        }),
      );
    }

    let guardados: Reporte[] = [];
    if (entidadesDelDia.length > 0) {
      guardados = await reporteRepo.save(entidadesDelDia);
      await bulkUpdateFechas(
        'reportes',
        guardados.map((r, i) => ({ id: r.id, ms: horasDelDia[i] })),
      );
      totalReportes += guardados.length;
    }

    // ── D2: revisar pendientes de DÍAS ANTERIORES (los de hoy se agregan después) ──
    const idsAceptar: number[] = [];
    const idsRechazar: number[] = [];
    const siguientesPendientes: PendienteRevision[] = [];

    for (const p of reportesPendientesRevision) {
      if (Math.random() < P_REVISION_DIARIA) {
        if (Math.random() < TASA_ACEPTACION) {
          idsAceptar.push(p.id);
          const buffer = bufferAceptadosSinAgrupar.get(p.categoria_id) ?? [];
          buffer.push({ id: p.id, creadoEnMs: p.creadoEnMs });
          bufferAceptadosSinAgrupar.set(p.categoria_id, buffer);
        } else {
          idsRechazar.push(p.id);
        }
      } else {
        siguientesPendientes.push(p);
      }
    }
    reportesPendientesRevision.length = 0;
    reportesPendientesRevision.push(...siguientesPendientes);

    if (idsAceptar.length > 0)
      await reporteRepo.update(idsAceptar, { estado: EstadoReporte.Aceptado });
    if (idsRechazar.length > 0) {
      await reporteRepo.update(idsRechazar, { estado: EstadoReporte.Rechazado });
      totalRechazados += idsRechazar.length;
    }

    // Los reportes de HOY entran a la cola recién ahora — nunca se revisan el mismo día que llegan.
    for (let i = 0; i < guardados.length; i++) {
      reportesPendientesRevision.push({
        id: guardados[i].id,
        categoria_id: categoriasDelDia[i],
        creadoEnMs: horasDelDia[i],
      });
    }

    // ── D3: agrupar aceptados acumulados, por categoría ──
    const gruposDelDia: {
      codigo_obra: string;
      categoria_id: number;
      reporteIds: number[];
      horaMs: number;
    }[] = [];

    for (const [categoriaId, buffer] of bufferAceptadosSinAgrupar) {
      while (buffer.length >= TAM_LOTE_MIN) {
        const tamDeseado =
          TAM_LOTE_MIN + Math.floor(Math.random() * (TAM_LOTE_MAX - TAM_LOTE_MIN + 1));
        const tam = Math.min(buffer.length, tamDeseado);

        if (Math.random() >= TASA_AGRUPAMIENTO) {
          // Este lote queda permanentemente "Aceptado" suelto — nunca se agrupa.
          buffer.splice(0, tam);
          continue;
        }

        const lote = buffer.splice(0, tam);
        const yy = String(diaActual.getFullYear()).slice(-2);
        const codigo_obra = `O-${yy}-${String(proximoCodigoObraSeq++).padStart(7, '0')}`;
        const maxHoraReportes = Math.max(...lote.map((r) => r.creadoEnMs));
        const horaGrupo = Math.min(maxHoraReportes + 1000 + Math.random() * 5 * 60 * 1000, ahoraMs);
        gruposDelDia.push({
          codigo_obra,
          categoria_id: categoriaId,
          reporteIds: lote.map((r) => r.id),
          horaMs: horaGrupo,
        });
      }
    }

    if (gruposDelDia.length > 0) {
      const gruposGuardados = await grupoRepo.save(
        gruposDelDia.map((g) =>
          grupoRepo.create({
            codigo_obra: g.codigo_obra,
            estado_actual: EstadoReporte.Aceptado,
            creado_por_usuario_id: randUsuario(),
            categoria_id: g.categoria_id,
            fecha_estimada_fin: null,
          }),
        ),
      );

      for (let i = 0; i < gruposGuardados.length; i++) {
        const grupo = gruposGuardados[i];
        const meta = gruposDelDia[i];
        await reporteRepo.update(meta.reporteIds, {
          grupo_id: grupo.id,
          estado: EstadoReporte.Aceptado,
        });
        casosActivos.set(grupo.id, {
          estadoActual: EstadoReporte.Aceptado,
          estancadoCronico: false,
        });
      }

      await bulkUpdateFechas(
        'grupos_reportes',
        gruposGuardados.map((g, i) => ({ id: g.id, ms: gruposDelDia[i].horaMs })),
      );
      totalGrupos += gruposGuardados.length;
    }

    // ── D4: avanzar casos activos, un paso por caso, con probabilidad diaria ──
    const actualizacionesDelDia: {
      grupoId: number;
      estadoAnterior: EstadoReporte;
      estadoNuevo: EstadoReporte;
      comentario: string;
      usuarioId: number;
    }[] = [];
    const cascadasDelDia: { grupoId: number; nuevoEstado: EstadoReporte }[] = [];

    for (const [grupoId, caso] of casosActivos) {
      const p = caso.estancadoCronico ? P_AVANCE_ESTANCADO : P_AVANCE[caso.estadoActual];
      if (Math.random() >= p) continue;

      const nuevo = siguienteEstado(caso.estadoActual);
      if (!nuevo) continue;

      actualizacionesDelDia.push({
        grupoId,
        estadoAnterior: caso.estadoActual,
        estadoNuevo: nuevo,
        comentario: COMENTARIO_POR_ETAPA[nuevo],
        usuarioId: randUsuario(),
      });
      cascadasDelDia.push({ grupoId, nuevoEstado: nuevo });

      caso.estadoActual = nuevo;
      if (nuevo === EstadoReporte.EnTrabajo) {
        caso.estancadoCronico = Math.random() < P_ESTANCAMIENTO_CRONICO;
      }
      if (nuevo === EstadoReporte.Finalizado) {
        casosActivos.delete(grupoId);
      }
    }

    if (actualizacionesDelDia.length > 0) {
      const horasActualizaciones = actualizacionesDelDia.map(() =>
        horaAleatoria(diaActual, 8, 17, ahoraMs),
      );
      const actualizacionesGuardadas = await actualizacionRepo.save(
        actualizacionesDelDia.map((a) =>
          actualizacionRepo.create({
            grupo_id: a.grupoId,
            usuario_id: a.usuarioId,
            estado_anterior: a.estadoAnterior,
            estado_nuevo: a.estadoNuevo,
            comentario: a.comentario,
            recursos_solicitados: null,
            fecha_estimada_fin: null,
            lat_actualizada: null,
            lng_actualizada: null,
            url_imagen: null,
          }),
        ),
      );
      await bulkUpdateFechas(
        'actualizaciones_caso',
        actualizacionesGuardadas.map((a, i) => ({ id: a.id, ms: horasActualizaciones[i] })),
      );
      totalActualizaciones += actualizacionesGuardadas.length;

      for (const cascada of cascadasDelDia) {
        await reporteRepo.update({ grupo_id: cascada.grupoId }, { estado: cascada.nuevoEstado });
        await grupoRepo.update(cascada.grupoId, { estado_actual: cascada.nuevoEstado });
      }
    }

    const diaIndex = diaOffset + DIAS_SIMULACION;
    if (diaIndex % 50 === 0 || diaOffset === 0) {
      console.log(
        `[día ${diaIndex}/${DIAS_SIMULACION}, ${diaStr}]  ` +
          `reportes=${totalReportes}  rechazados=${totalRechazados}  ` +
          `grupos=${totalGrupos}  actualizaciones=${totalActualizaciones}  ` +
          `casos activos=${casosActivos.size}`,
      );
    }
  }

  await ds.destroy();
  console.log(
    `\nSeed completado exitosamente: ${totalReportes} reportes, ${totalGrupos} grupos, ` +
      `${totalActualizaciones} actualizaciones de bitácora`,
  );
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
