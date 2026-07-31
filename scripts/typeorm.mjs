import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { resolve } from 'path';

const root = resolve(import.meta.dirname, '..');

// El .npmrc usa node-linker=hoisted, asi que typeorm queda en el node_modules
// raiz y libs/common/node_modules nunca se crea. Resolver el CLI por modulo (en
// vez de una ruta fija) funciona con ambos layouts de pnpm.
const cli = createRequire(import.meta.url).resolve('typeorm/cli.js', {
  paths: [root, resolve(root, 'libs/common')],
});

const result = spawnSync(
  process.execPath,
  ['-r', 'ts-node/register', cli, ...process.argv.slice(2)],
  {
    cwd: root,
    env: {
      ...process.env,
      TS_NODE_PROJECT: resolve(root, 'tsconfig.migration.json'),
    },
    stdio: 'inherit',
  },
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
