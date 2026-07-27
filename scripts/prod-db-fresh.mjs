import pg from 'pg';
import { runMigrations } from './db-migrate.mjs';

const REQUIRED_CONFIRMATION = 'DELETE_ALL_PRODUCTION_DATA';

function getArgument(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function databaseName(databaseUrl) {
  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    fail('DATABASE_URL no es una URL PostgreSQL válida.');
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    fail('DATABASE_URL debe usar el protocolo postgres:// o postgresql://.');
  }

  const name = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!name) fail('DATABASE_URL debe incluir el nombre de la base de datos.');
  return { name, host: parsed.hostname, port: parsed.port || '5432' };
}

async function freshProductionDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  const expectedDatabase = getArgument('database');
  const dryRun = process.argv.includes('--dry-run');

  if (!databaseUrl) fail('DATABASE_URL es obligatoria.');
  if (!expectedDatabase) fail('Indicá la base esperada: --database=<nombre>.');

  const target = databaseName(databaseUrl);
  if (target.name !== expectedDatabase) {
    fail(`La URL apunta a "${target.name}", no a "${expectedDatabase}".`);
  }

  console.log(`Destino confirmado: ${target.host}:${target.port}/${target.name}`);

  if (dryRun) {
    console.log('Dry run correcto: no se modificó ninguna tabla ni se ejecutaron migraciones.');
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    fail('Este comando sólo se permite con NODE_ENV=production.');
  }
  if (process.env.PROD_DB_BACKUP_ID?.trim().length < 8) {
    fail('Definí PROD_DB_BACKUP_ID con el identificador de un backup verificado.');
  }
  if (process.env.PROD_DB_FRESH_CONFIRM !== REQUIRED_CONFIRMATION) {
    fail(`Definí PROD_DB_FRESH_CONFIRM=${REQUIRED_CONFIRMATION} para continuar.`);
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    const result = await pool.query('SELECT current_database() AS database_name');
    if (result.rows[0]?.database_name !== expectedDatabase) {
      fail('La conexión no corresponde a la base indicada; se canceló el reset.');
    }

    console.log('Eliminando schema public...');
    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('CREATE SCHEMA public AUTHORIZATION CURRENT_USER');
    await pool.query('GRANT ALL ON SCHEMA public TO CURRENT_USER');

    console.log('Restaurando extensiones PostGIS requeridas...');
    await pool.query('CREATE EXTENSION IF NOT EXISTS postgis SCHEMA public CASCADE');
    await pool.query('CREATE EXTENSION IF NOT EXISTS postgis_raster SCHEMA public');
  } finally {
    await pool.end();
  }

  console.log('Aplicando migraciones...');
  await runMigrations();
  console.log('Base de producción limpia y migrada. No se ejecutó ningún seed.');
}

freshProductionDatabase().catch((error) => {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
