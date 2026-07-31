import { spawnSync } from 'child_process';
import { resolve } from 'path';

const root = resolve(import.meta.dirname, '..');
// pnpm enlaza las dependencias de los workspaces al almacén raíz; no todos los
// paquetes tienen un node_modules físico propio. Ejecutar el CLI raíz mantiene
// migration:show/run funcional tanto localmente como en CI.
const cli = resolve(root, 'node_modules/typeorm/cli.js');

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
