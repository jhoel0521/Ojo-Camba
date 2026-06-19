import { DataSource } from 'typeorm';
import {
  Reporte,
  GrupoReporte,
  Categoria,
  Dispositivo,
  ActualizacionCaso,
} from '../libs/common/dist/index.js';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://ojocamba:ojocamba_secret@localhost:5432/ojocamba';

const ds = new DataSource({
  type: 'postgres',
  url: DATABASE_URL,
  synchronize: false,
  logging: true,
  entities: [Reporte, GrupoReporte, Categoria, Dispositivo, ActualizacionCaso],
});

await ds.initialize();
await ds.synchronize();
await ds.destroy();
console.log('Schema sincronizado OK');
