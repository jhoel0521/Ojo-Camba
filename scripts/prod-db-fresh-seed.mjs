import { execSync, spawnSync } from 'child_process';

function run(cmd) {
  const result = spawnSync(cmd, { shell: true, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function findContainer(name) {
  const id = execSync(`docker ps -qf "name=${name}"`).toString().trim();
  if (!id) {
    console.error(`No hay contenedor "${name}" corriendo. Verifica con: docker ps`);
    process.exit(1);
  }
  const label = execSync(`docker inspect --format "{{.Name}}" ${id}`)
    .toString()
    .trim()
    .replace(/^\//, '');
  return { id, label };
}

const auth = findContainer('ms-auth');
const register = findContainer('ms-register');

console.log(`ms-auth     → ${auth.label} (${auth.id.slice(0, 12)})`);
console.log(`ms-register → ${register.label} (${register.id.slice(0, 12)})\n`);

console.log('1/4  Limpiando schema (DROP + CREATE + extensiones)...');
run(`docker exec ${auth.id} node scripts/db-fresh-seed.mjs`);

console.log('\n2/4  Aplicando migrations...');
run(`docker exec ${auth.id} node scripts/db-migrate.mjs`);

console.log('\n3/4  Sembrando usuarios y roles (ms-auth)...');
run(`docker exec ${auth.id} node dist/seed.js`);

console.log('\n4/4  Sembrando reportes historicos (ms-register)...');
run(`docker exec ${register.id} node dist/seed.js`);

console.log('\nListo. Base de datos de produccion lista.');
