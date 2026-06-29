import { execSync, spawnSync } from 'child_process';

function run(cmd) {
  const result = spawnSync(cmd, { shell: true, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Buscar contenedor ms-auth corriendo
const containerId = execSync('docker ps -qf "name=ms-auth"').toString().trim();
if (!containerId) {
  console.error('No hay contenedor ms-auth corriendo. Verifica con: docker ps');
  process.exit(1);
}

const name = execSync(`docker inspect --format "{{.Name}}" ${containerId}`)
  .toString()
  .trim()
  .replace(/^\//, '');

console.log(`Conectando a: ${name} (${containerId.slice(0, 12)})\n`);

console.log('1/3  Limpiando schema (DROP + CREATE + extensiones)...');
run(`docker exec ${containerId} node scripts/db-fresh-seed.mjs`);

console.log('\n2/3  Aplicando migrations...');
run(`docker exec ${containerId} node scripts/db-migrate.mjs`);

console.log('\n3/3  Sembrando usuarios y roles...');
run(`docker exec ${containerId} node dist/seed.js`);

console.log('\nListo. Base de datos de produccion lista.');
