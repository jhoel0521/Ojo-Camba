import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  Reporte,
  GrupoReporte,
  Categoria,
  Dispositivo,
  ActualizacionCaso,
} from '@ojo-camba/common';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL no definido');
  process.exit(1);
}

const ds = new DataSource({
  type: 'postgres',
  url: DATABASE_URL,
  synchronize: true,
  logging: true,
  entities: [Reporte, GrupoReporte, Categoria, Dispositivo, ActualizacionCaso],
});

ds.initialize()
  .then(() => ds.synchronize())
  .then(() => {
    console.log('Entity schemas synchronized OK');
    return ds.destroy();
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
