const http = require('http');

const BASE = 'http://localhost:3000';
const IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length } }, (res) => {
      let out = ''; res.on('data', (c) => out += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(out) }); } catch { resolve({ status: res.statusCode, body: out }); } });
    });
    req.on('error', reject); req.write(data); req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${path}`, (res) => {
      let out = ''; res.on('data', (c) => out += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(out) }); } catch { resolve({ status: res.statusCode, body: out }); } });
    }).on('error', reject);
  });
}

let passed = 0, failed = 0;
async function assert(desc, fn) {
  try { await fn(); passed++; console.log(`  OK ${desc}`); }
  catch (e) { failed++; console.error(`  FAIL ${desc}: ${e.message}`); process.exitCode = 1; }
}

async function test() {
  console.log('=== Gateway Principal — E2E Tests ===\n');

  // 1. Health
  await assert('GET /health', async () => {
    const r = await get('/health');
    if (r.status !== 200 || r.body.status !== 'ok') throw new Error(JSON.stringify(r.body));
  });

  // 2. Auth register
  let token, refreshToken, userId, email;
  await assert('POST /auth/register', async () => {
    const r = await post('/auth/register', { nombre: 'GW Test', email: `gwtest${Date.now()}@test.com`, password: 'test123' });
    if (r.status !== 201 || !r.body.access_token) throw new Error(JSON.stringify(r.body));
    token = r.body.access_token; refreshToken = r.body.refresh_token; userId = r.body.user.id;
    email = r.body.user.email;
  });

  // 3. Auth login
  await assert('POST /auth/login', async () => {
    const r = await post('/auth/login', { email: email, password: 'test123' });
    if (r.status !== 201 || !r.body.access_token) throw new Error(JSON.stringify(r.body));
  });

  // 4. Create report
  let reportId;
  await assert('POST /reportes (crear con imagen)', async () => {
    const r = await post('/reportes', { device_id: 'gw-device-01', lat: -17.78, lng: -63.18, categoria_id: 1, imagen_base64: IMG });
    if (r.status !== 201 || !r.body.id || !r.body.h3_res_8) throw new Error(JSON.stringify(r.body));
    reportId = r.body.id;
  });

  // 5. List reports
  await assert('GET /reportes', async () => {
    const r = await get('/reportes');
    if (r.status !== 200 || r.body.total < 1) throw new Error(JSON.stringify(r.body));
  });

  // 6. Heatmap
  await assert('GET /reportes/heatmap', async () => {
    const r = await get('/reportes/heatmap');
    if (r.status !== 200 || !Array.isArray(r.body)) throw new Error(JSON.stringify(r.body));
  });

  // 7. Admin pending
  await assert('GET /admin/reports/pending', async () => {
    const r = await get('/admin/reports/pending');
    if (r.status !== 200 || !Array.isArray(r.body.data)) throw new Error(JSON.stringify(r.body));
  });

  // 8. Admin create group (con 3 reportes en el MISMO punto)
  let grupoId;
  const groupIds = [];
  for (let i = 0; i < 3; i++) {
    const r = await post('/reportes', { device_id: `gw-group-${i}`, lat: -17.7833, lng: -63.1822, categoria_id: 2, imagen_base64: IMG });
    groupIds.push(r.body.id);
  }
  await assert('POST /admin/groups (crear caso de obra)', async () => {
    const r = await post('/admin/groups', { report_ids: groupIds, creado_por_usuario_id: 1 });
    if (r.status !== 201 || !r.body.codigo_obra) throw new Error(JSON.stringify(r.body));
    grupoId = r.body.id;
  });

  // 9. Timeline
  await assert('GET /admin/groups/:id/timeline', async () => {
    await post(`/admin/groups/${grupoId}/updates`, { usuario_id: 2, comentario: 'Test update from gateway' });
    const r = await get(`/admin/groups/${grupoId}/timeline`);
    if (r.status !== 200 || r.body.length < 1) throw new Error(JSON.stringify(r.body));
  });

  // 10. Auth logout
  await assert('POST /auth/logout', async () => {
    const r = await post('/auth/logout', { user_id: userId });
    if (r.status !== 201 || !r.body.ok) throw new Error(JSON.stringify(r.body));
  });

  console.log(`\n=== RESULTADO: ${passed} OK / ${failed} FAIL ===`);
  process.exit(failed ? 1 : 0);
}

test();
