import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const INITIAL_MIGRATION_TIMESTAMP = 1782762626216n;
const INITIAL_MIGRATION_NAME = 'InitialSchema1782762626216';

async function migrate() {
  const { AppDataSource } = require(join(__dirname, '..', 'libs', 'common', 'dist', 'data-source.js'));
  await AppDataSource.initialize();

  try {
    const applied = await AppDataSource.runMigrations();
    if (applied.length > 0) {
      console.log(`Migrations applied: ${applied.map((m) => m.name).join(', ')}`);
    } else {
      console.log('No pending migrations');
    }
  } catch (err) {
    // PostgreSQL 42P07 = "relation already exists".
    // Ocurre cuando la DB fue creada anteriormente con synchronize:true.
    // Las tablas ya existen, pero no hay registro en la tabla migrations.
    // Solución: marcar la migration inicial como aplicada sin volver a ejecutarla.
    if (err.code === '42P07' || String(err.message).includes('already exists')) {
      console.log('Tablas ya existen (DB migrada desde synchronize:true). Marcando migration como aplicada...');
      await AppDataSource.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id   SERIAL  NOT NULL,
          timestamp BIGINT  NOT NULL,
          name      VARCHAR NOT NULL,
          CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id)
        )
      `);
      await AppDataSource.query(`
        INSERT INTO migrations (timestamp, name)
        SELECT $1, $2
        WHERE NOT EXISTS (
          SELECT 1 FROM migrations WHERE name = $2
        )
      `, [INITIAL_MIGRATION_TIMESTAMP.toString(), INITIAL_MIGRATION_NAME]);
      console.log('Migration marcada como aplicada. Iniciando servicio...');
    } else {
      await AppDataSource.destroy();
      throw err;
    }
  }

  await AppDataSource.destroy();
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
