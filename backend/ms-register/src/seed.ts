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

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config();
} catch {
  // dotenv opcional
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL no definido');
  process.exit(1);
}

const ds = new DataSource({
  type: 'postgres',
  url: DATABASE_URL,
  synchronize: false,
  logging: false,
  entities: [Reporte, GrupoReporte, Categoria, Dispositivo, ActualizacionCaso],
});

async function seed() {
  await ds.initialize();
  console.log('Conectado a la base de datos');

  console.log('Truncando tablas...');
  await ds.query(
    'TRUNCATE actualizaciones_caso, grupos_reportes, reportes, dispositivos RESTART IDENTITY CASCADE',
  );

  // ── Categorías (datos esenciales) ────────────────────────────
  const categoriaRepo = ds.getRepository(Categoria);
  const categorias = ['bache', 'luminaria', 'residuos', 'alcantarillado', 'trafico', 'otro'];
  for (const nombre of categorias) {
    await categoriaRepo.upsert({ nombre }, ['nombre']);
  }
  console.log('Categorías sembradas');

  // ── Reportes con grupos (datos de prueba) ────────────────────
  const reporteRepo = ds.getRepository(Reporte);
  const grupoRepo = ds.getRepository(GrupoReporte);
  const year = new Date().getFullYear();

  const puntos = [
    // Zona 1
    { lat: -17.78119028280482, lng: -63.1314753201512, cat: 1, gravedad: 'Alta' },
    { lat: -17.78119028280482, lng: -63.1314753201512, cat: 2, gravedad: 'Media' },
    { lat: -17.78119028280482, lng: -63.1314753201512, cat: 1, gravedad: 'Alta' },
    { lat: -17.78119028280482, lng: -63.1314753201512, cat: 5, gravedad: 'Media' },
    // Zona 2
    { lat: -17.758194069241743, lng: -63.17412908279559, cat: 3, gravedad: 'Media' },
    { lat: -17.758194069241743, lng: -63.17412908279559, cat: 4, gravedad: 'Alta' },
    { lat: -17.758194069241743, lng: -63.17412908279559, cat: 3, gravedad: 'Baja' },
  ];

  for (let i = 0; i < puntos.length; i++) {
    const p = puntos[i];

    const reporte = await reporteRepo.save(
      reporteRepo.create({
        device_id: 'dev-seed',
        lat: p.lat,
        lng: p.lng,
        categoria_id: p.cat,
        gravedad: p.gravedad,
        h3_res_8: h3.latLngToCell(p.lat, p.lng, 8),
        h3_res_11: h3.latLngToCell(p.lat, p.lng, 11),
        h3_res_13: h3.latLngToCell(p.lat, p.lng, 13),
        url_imagen: `https://picsum.photos/seed/ojocamba${i + 1}/400/300`,
        estado: EstadoReporte.Aceptado,
      }),
    );

    const grupo = await grupoRepo.save(
      grupoRepo.create({
        codigo_obra: `OBRA-${year}-${String(i + 1).padStart(3, '0')}`,
        estado_actual: EstadoReporte.Aceptado,
        creado_por_usuario_id: 0,
        categoria_id: p.cat,
      }),
    );

    await reporteRepo.update(reporte.id, { grupo_id: grupo.id });
    console.log(`  [${i + 1}/${puntos.length}] Reporte #${reporte.id} → ${grupo.codigo_obra}`);
  }

  await ds.destroy();
  console.log('\nSeed completado exitosamente');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
