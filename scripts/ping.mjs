#!/usr/bin/env node

const ENDPOINTS = [
  { label: 'gateway-principal  /health', url: 'http://localhost:3000/health' },
  { label: 'gateway-status     /health', url: 'http://localhost:3005/health' },
  { label: 'gateway-status     /status', url: 'http://localhost:3005/status' },
];

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';

console.log('\nOjo Camba — ping\n');

for (const { label, url } of ENDPOINTS) {
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const ms = Date.now() - start;
    const data = await res.json();
    const icon = res.ok ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
    console.log(`${icon} ${label} ${DIM}(${ms}ms)${RESET}`);
    if (data.services) {
      for (const svc of data.services) {
        const sIcon = svc.status === 'ok' ? `${GREEN}  ✓${RESET}` : `${RED}  ✗${RESET}`;
        const lat = svc.latencyMs !== undefined ? ` ${DIM}${svc.latencyMs}ms${RESET}` : '';
        console.log(`${sIcon} ${svc.name}${lat}`);
      }
    }
  } catch {
    const ms = Date.now() - start;
    console.log(`${RED}✗${RESET} ${label} ${DIM}UNREACHABLE (${ms}ms)${RESET}`);
  }
}

console.log('');
