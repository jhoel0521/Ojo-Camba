import 'reflect-metadata';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Reporte } from './entities/reporte.entity';
import { GrupoReporte } from './entities/grupo-reporte.entity';
import { Categoria } from './entities/categoria.entity';
import { Dispositivo } from './entities/dispositivo.entity';
import { ActualizacionCaso } from './entities/actualizacion-caso.entity';
import { Usuario } from './entities/usuario.entity';
import { Rol } from './entities/rol.entity';
import { UsuarioRol } from './entities/usuario-rol.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Nivel } from './entities/nivel.entity';
import { HistorialPuntos } from './entities/historial-puntos.entity';
import { PingLog } from './entities/ping-log.entity';

config({ path: './backend/ms-auth/.env' });

// ts-node ejecuta el .ts → __filename termina en .ts → usa fuentes TypeScript.
// tsc compila a libs/common/dist/data-source.js → __filename termina en .js → usa compilados.
const migrations = __filename.endsWith('.js')
  ? [join(__dirname, 'migrations', '*.js')]
  : [join(__dirname, 'migrations', '*.ts')];

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL ?? 'postgresql://ojocamba:ojocamba_secret@localhost:5432/ojocamba',
  synchronize: false,
  logging: ['error'],
  entities: [
    Reporte,
    GrupoReporte,
    Categoria,
    Dispositivo,
    ActualizacionCaso,
    Usuario,
    Rol,
    UsuarioRol,
    RefreshToken,
    Nivel,
    HistorialPuntos,
    PingLog,
  ],
  migrations,
});
