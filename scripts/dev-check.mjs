#!/usr/bin/env node
import { execSync, spawnSync } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const ROOT  = path.resolve(fileURLToPath(import.meta.url), '..', '..');
const PORTS = [3000, 3001, 3002, 3003, 3004, 3005, 5173, 5174, 5175, 5176];

function killPorts() {
  for (const port of PORTS) {
    try {
      const out = execSync(`netstat -aon | findstr ":${port} "`, { encoding: 'utf8' });
      const pids = [...new Set(
        out.trim().split('\n')
          .map(l => l.trim().split(/\s+/).pop())
          .filter(p => p && p !== '0' && /^\d+$/.test(p))
      )];
      for (const pid of pids) {
        try { execSync(`taskkill /PID ${pid} /F /T`, { stdio: 'ignore' }); } catch {}
      }
    } catch { /* puerto libre */ }
  }
}

// 1. Limpiar
console.log('\n[1/3] Matando procesos existentes...');
killPorts();
console.log('      Listo.\n');

// 2. Arrancar pnpm dev
console.log('[2/3] Arrancando pnpm dev...');
const PNPM_DIR = 'C:\\laragon\\bin\\nodejs\\node-v22';
const ps1 = path.join(ROOT, '_dev-launch.ps1');

import { writeFileSync } from 'fs';
writeFileSync(ps1,
  `$env:PATH += ";${PNPM_DIR}"\nSet-Location "${ROOT}"\npnpm dev\n`
);

const dev = execSync(
  `powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \\"${ps1}\\"' -WindowStyle Hidden"`,
  { stdio: 'ignore' }
);

console.log('      Esperando 25s...\n');
await sleep(25_000);

// 3. Health check — capturar resultado
console.log('[3/3] Health check:\n');
const result = spawnSync('pnpm', ['health'], { cwd: ROOT, stdio: 'pipe', shell: true, encoding: 'utf8' });
const output = (result.stdout + result.stderr).replace(/\x1b\[[0-9;]*m/g, '');
console.log(output);

const downCount  = (output.match(/DOWN/g) || []).length;
const upCount    = (output.match(/\bUP\b/g) || []).length;
const total      = PORTS.length;

// 4. Matar todo lo que arrancamos (solo nuestros puertos)
console.log('Limpiando procesos...');
killPorts();

// 5. Resultado final
console.log('─'.repeat(40));
if (upCount === total && downCount === 0) {
  console.log(`✓ PASS — ${upCount}/${total} servicios UP`);
  process.exit(0);
} else {
  console.log(`✗ FAIL — ${upCount}/${total} UP, ${downCount} DOWN`);
  process.exit(1);
}
