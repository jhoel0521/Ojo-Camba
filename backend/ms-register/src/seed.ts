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
  'Alta', 'Alta', 'Alta', 'Alta',
  'Media', 'Media', 'Media',
  'Emergencia',
  'Baja', 'Baja',
];
const randGrav = () => GRAV_POOL[Math.floor(Math.random() * GRAV_POOL.length)];

// Estado para grupos activos (no Finalizado)
// monthsAgo: 1 = mes más reciente, 4 = mes más viejo de los activos
function activeState(monthsAgo: number): string {
  const r = Math.random();
  if (monthsAgo >= 3) {
    return r < 0.55 ? EstadoReporte.EnTrabajo : EstadoReporte.ValidacionEnCampo;
  }
  if (monthsAgo === 2) {
    return r < 0.35
      ? EstadoReporte.EnTrabajo
      : r < 0.70
        ? EstadoReporte.ValidacionEnCampo
        : EstadoReporte.Aceptado;
  }
  // monthsAgo === 1: mes más reciente — mayoría recién aceptados
  return r < 0.60
    ? EstadoReporte.Aceptado
    : r < 0.85
      ? EstadoReporte.ValidacionEnCampo
      : EstadoReporte.EnTrabajo;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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

  const today = new Date();
  const ACCEPT_RATE = 0.85; // 85 aceptados, 15 rechazados
  const GROUP_RATE = 0.80;  // 80% de aceptados se agrupan en obra
  const GROUP_SIZE = 3;

  // Tasas de resolución para los últimos 4 meses activos
  // índice 0 = 4 meses atrás (90%), índice 3 = mes más reciente (25%)
  const RESOLUTION = [0.9, 0.8, 0.5, 0.25];

  let globalGroup = 1;
  let totalReportes = 0;
  let totalGrupos = 0;

  for (let monthAgo = 11; monthAgo >= 0; monthAgo--) {
    const d = new Date(today.getFullYear(), today.getMonth() - monthAgo, 1);
    const tYear = d.getFullYear();
    const tMonth = d.getMonth();
    const monthLabel = `${tYear}-${String(tMonth + 1).padStart(2, '0')}`;
    const monthStart = new Date(tYear, tMonth, 1);
    const monthEnd = new Date(tYear, tMonth + 1, 0, 23, 59, 59);
    const PER_MONTH = 100 + Math.floor(Math.random() * 901); // 100–1000

    // ── PASO 1: Crear 100 reportes como Reportado ──────────────────────────────
    const toCreate: Reporte[] = [];
    const catByIndex: number[] = [];

    for (let i = 0; i < PER_MONTH; i++) {
      const { lat, lng } = randCoord();
      const cat = randCat();
      catByIndex.push(cat);
      toCreate.push(
        reporteRepo.create({
          device_id: `seed-m${monthAgo}-r${i}`,
          lat,
          lng,
          categoria_id: cat,
          gravedad: randGrav(),
          h3_res_8: h3.latLngToCell(lat, lng, 8),
          h3_res_11: h3.latLngToCell(lat, lng, 11),
          h3_res_13: h3.latLngToCell(lat, lng, 13),
          url_imagen: `https://picsum.photos/seed/oc${monthAgo}r${i}/400/300`,
          estado: EstadoReporte.Reportado,
        }),
      );
    }

    const saved = await reporteRepo.save(toCreate);
    const reporteInfos = saved.map((r, i) => ({ id: r.id, cat: catByIndex[i] }));
    const allIds = reporteInfos.map(r => r.id);
    totalReportes += saved.length;

    // Backdate creado_en de todos los reportes del mes
    await ds.query(
      `UPDATE reportes SET creado_en = $1::timestamptz + random() * ($2::timestamptz - $1::timestamptz) WHERE id = ANY($3::int[])`,
      [monthStart, monthEnd, allIds],
    );

    // ── PASO 2: Aceptar 85 / Rechazar 15 ──────────────────────────────────────
    const shuffled = shuffle([...reporteInfos]);
    const acceptCount = Math.round(PER_MONTH * ACCEPT_RATE);
    const toAcceptInfos = shuffled.slice(0, acceptCount);
    const toRejectIds = shuffled.slice(acceptCount).map(r => r.id);

    if (toRejectIds.length > 0) {
      await reporteRepo.update(toRejectIds, { estado: 'Rechazado' as EstadoReporte });
    }

    // ── PASO 3: De aceptados, 80% agrupar / 20% quedan Aceptado suelto ────────
    const toGroupCount = Math.round(acceptCount * GROUP_RATE);
    const toGroupInfos = toAcceptInfos.slice(0, toGroupCount);
    const toSueltoIds = toAcceptInfos.slice(toGroupCount).map(r => r.id);

    if (toSueltoIds.length > 0) {
      await reporteRepo.update(toSueltoIds, { estado: EstadoReporte.Aceptado });
    }

    // ── PASO 4: Crear grupos de 3 reportes c/u ────────────────────────────────
    const isActivePeriod = monthAgo < 4;
    const resolution = isActivePeriod ? RESOLUTION[3 - monthAgo] : 1.0;
    // monthsAgo para activeState: 1=más reciente, 4=más viejo de los activos
    const monthsAgoActive = monthAgo + 1;

    const batches: { id: number; cat: number }[][] = [];
    for (let i = 0; i < toGroupInfos.length; i += GROUP_SIZE) {
      batches.push(toGroupInfos.slice(i, i + GROUP_SIZE));
    }

    const finCount = Math.round(batches.length * resolution);
    const grupoIds: number[] = [];

    for (let gi = 0; gi < batches.length; gi++) {
      const batch = batches[gi];
      const isFinalized = gi < finCount;
      const grupoEstado = isFinalized ? EstadoReporte.Finalizado : activeState(monthsAgoActive);

      const yy = String(tYear).slice(-2);
      const codigoObra = `O-${yy}-${String(globalGroup).padStart(7, '0')}`;
      globalGroup++;

      const grupo = await grupoRepo.save(
        grupoRepo.create({
          codigo_obra: codigoObra,
          estado_actual: grupoEstado,
          creado_por_usuario_id: 1,
          categoria_id: batch[0]?.cat ?? 1,
          fecha_estimada_fin: null,
        }),
      );
      grupoIds.push(grupo.id);

      await reporteRepo.update(
        batch.map(r => r.id),
        { grupo_id: grupo.id, estado: grupoEstado },
      );

      await actualizacionRepo.save(
        actualizacionRepo.create({
          grupo_id: grupo.id,
          usuario_id: 1,
          comentario: `Caso registrado. ${batch.length} reportes aceptados y agrupados.`,
          estado_nuevo: EstadoReporte.Aceptado,
          fecha_estimada_fin: null,
          recursos_solicitados: null,
          url_imagen: null,
          lat_actualizada: null,
          lng_actualizada: null,
          reporte_id: null,
        }),
      );

      totalGrupos++;
    }

    // Backdate creado_en de grupos y actualizaciones del mes
    if (grupoIds.length > 0) {
      await ds.query(
        `UPDATE grupos_reportes SET creado_en = $1::timestamptz + random() * ($2::timestamptz - $1::timestamptz) WHERE id = ANY($3::int[])`,
        [monthStart, monthEnd, grupoIds],
      );
      await ds.query(
        `UPDATE actualizaciones_caso SET creado_en = $1::timestamptz + random() * ($2::timestamptz - $1::timestamptz) WHERE grupo_id = ANY($3::int[])`,
        [monthStart, monthEnd, grupoIds],
      );
    }

    console.log(
      `[${monthLabel}]  ${PER_MONTH} rep  |  ` +
        `${acceptCount} aceptados  ${toRejectIds.length} rechazados  |  ` +
        `${batches.length} grupos  (${finCount} Finalizado  ${batches.length - finCount} activos)`,
    );
  }

  await ds.destroy();
  console.log(`\nSeed completado: ${totalReportes} reportes, ${totalGrupos} grupos`);
}

seed().catch(e => {
  console.error(e);
  process.exit(1);
});
