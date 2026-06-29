import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

async function migrate() {
  // libs/common/dist/data-source.js detecta que corre como .js compilado
  // y carga migrations desde libs/common/dist/migrations/*.js
  const { AppDataSource } = require(join(__dirname, '..', 'libs', 'common', 'dist', 'data-source.js'));
  await AppDataSource.initialize();
  const applied = await AppDataSource.runMigrations();
  if (applied.length > 0) {
    console.log(`Migrations applied: ${applied.map((m) => m.name).join(', ')}`);
  } else {
    console.log('No pending migrations');
  }
  await AppDataSource.destroy();
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
