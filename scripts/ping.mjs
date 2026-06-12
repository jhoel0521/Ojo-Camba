#!/usr/bin/env node
import net from 'net';

const GREEN = '\x1b[32m';
const RED   = '\x1b[31m';
const DIM   = '\x1b[2m';
const RESET = '\x1b[0m';

const SERVICES = [
  { label: 'gateway-principal', type: 'http', port: 3000, path: '/health' },
  { label: 'gateway-status',    type: 'http', port: 3005, path: '/health' },
  { label: 'ms-auth',           type: 'tcp',  port: 3001 },
  { label: 'ms-register',       type: 'tcp',  port: 3002 },
  { label: 'ms-admin',          type: 'tcp',  port: 3003 },
  { label: 'ms-gamify',         type: 'tcp',  port: 3004 },
  { label: 'app-reporte',       type: 'http', port: 5173, path: '/' },
  { label: 'app-backoffice',    type: 'http', port: 5174, path: '/' },
  { label: 'app-tecnico',       type: 'http', port: 5175, path: '/' },
  { label: 'app-status',        type: 'http', port: 5176, path: '/' },
];

function checkTcp(port) {
  return new Promise((resolve) => {
    const start = Date.now();
    const sock = new net.Socket();
    sock.setTimeout(3000);
    sock.connect(port, '127.0.0.1', () => {
      sock.destroy();
      resolve({ ok: true, ms: Date.now() - start });
    });
    sock.on('error', () => resolve({ ok: false, ms: Date.now() - start }));
    sock.on('timeout', () => { sock.destroy(); resolve({ ok: false, ms: Date.now() - start }); });
  });
}

async function checkHttp(port, path) {
  const start = Date.now();
  try {
    const res = await fetch(`http://localhost:${port}${path}`, {
      signal: AbortSignal.timeout(3000),
    });
    return { ok: res.ok, ms: Date.now() - start };
  } catch {
    return { ok: false, ms: Date.now() - start };
  }
}

console.log('\nOjo Camba — services\n');

for (const svc of SERVICES) {
  const result = svc.type === 'http'
    ? await checkHttp(svc.port, svc.path)
    : await checkTcp(svc.port);

  const icon  = result.ok ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
  const proto = svc.type === 'http' ? 'HTTP' : 'TCP ';
  const label = `${svc.label.padEnd(20)} :${svc.port} [${proto}]`;
  const ms    = `${DIM}${result.ms}ms${RESET}`;
  const state = result.ok ? `${GREEN}UP${RESET}` : `${RED}DOWN${RESET}`;
  console.log(`${icon} ${label}  ${state}  ${ms}`);
}

console.log('');
