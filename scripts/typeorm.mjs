import { spawnSync } from 'child_process';
import { resolve } from 'path';

const root = resolve(import.meta.dirname, '..');
const cli = resolve(root, 'libs/common/node_modules/typeorm/cli.js');

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
