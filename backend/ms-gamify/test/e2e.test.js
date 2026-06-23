const { ClientProxyFactory, Transport } = require('@nestjs/microservices');
const { firstValueFrom, timeout } = require('rxjs');

const gamify = ClientProxyFactory.create({ transport: Transport.TCP, options: { host: 'localhost', port: 3004 } });
const auth = ClientProxyFactory.create({ transport: Transport.TCP, options: { host: 'localhost', port: 3001 } });

let passed = 0, failed = 0;
async function assert(desc, fn) {
  try { await fn(); passed++; console.log(`  OK ${desc}`); }
  catch (e) { failed++; console.error(`  FAIL ${desc}: ${e.message}`); process.exitCode = 1; }
}

const send = (client, pattern, payload) =>
  firstValueFrom(client.send(pattern, payload).pipe(timeout(5000)));

async function registrarUsuario() {
  const email = `gamify-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
  const reg = await send(auth, 'auth.register', { nombre: 'Tester Gamify', email, password: 'secret123' });
  return reg.user.id;
}

async function test() {
  await gamify.connect();
  await auth.connect();

  console.log('=== FASE G.0: Ping ===');
  await assert('gamify.ping sigue respondiendo', async () => {
    const r = await send(gamify, 'gamify.ping', {});
    if (r.status !== 'ok' || r.service !== 'ms-gamify') throw new Error(JSON.stringify(r));
  });

  console.log('\n=== FASE G.1: Catalogo de niveles ===');
  await assert('get_levels devuelve los 3 niveles seed ordenados ASC', async () => {
    const r = await send(gamify, 'gamify.get_levels', {});
    if (!Array.isArray(r) || r.length < 3) throw new Error(JSON.stringify(r));
    const nombres = r.map((n) => n.nombre);
    if (!nombres.includes('Bronce') || !nombres.includes('Plata') || !nombres.includes('Oro')) {
      throw new Error(`niveles: ${nombres.join(', ')}`);
    }
    for (let i = 1; i < r.length; i++) {
      if (r[i].puntos_requeridos < r[i - 1].puntos_requeridos) throw new Error('desordenado');
    }
  });

  console.log('\n=== FASE G.2: Otorgar puntos sin cruzar umbral ===');
  const userA = await registrarUsuario();
  await assert('award_points otorga puntos (null -> nivel base Bronce)', async () => {
    const r = await send(gamify, 'gamify.award_points', { user_id: userA, report_id: 1001 });
    if (r.ya_otorgado !== false || r.puntos !== 10 || !r.nivel || r.nivel.nombre !== 'Bronce') {
      throw new Error(JSON.stringify(r));
    }
  });
  await assert('award_points NO sube de nivel por debajo del umbral (20 < 50)', async () => {
    const r = await send(gamify, 'gamify.award_points', { user_id: userA, report_id: 1002 });
    if (r.puntos !== 20 || r.subio_de_nivel !== false || r.nivel.nombre !== 'Bronce') {
      throw new Error(JSON.stringify(r));
    }
  });

  console.log('\n=== FASE G.3: Idempotencia ===');
  await assert('mismo report_id no suma dos veces (conserva puntos)', async () => {
    const r = await send(gamify, 'gamify.award_points', { user_id: userA, report_id: 1001 });
    if (r.ya_otorgado !== true || r.puntos !== 20) throw new Error(JSON.stringify(r));
  });

  console.log('\n=== FASE G.4: get_user_stats con progreso ===');
  await assert('get_user_stats devuelve { puntos, nivel, progreso }', async () => {
    const r = await send(gamify, 'gamify.get_user_stats', { user_id: userA });
    if (r.puntos !== 20 || !r.nivel || r.nivel.nombre !== 'Bronce') throw new Error(JSON.stringify(r));
    if (!r.progreso || r.progreso.puntos_actuales !== 20 || r.progreso.puntos_siguiente_nivel !== 50 || r.progreso.porcentaje !== 40) {
      throw new Error(`progreso: ${JSON.stringify(r.progreso)}`);
    }
  });

  console.log('\n=== FASE G.5: Subida de nivel al cruzar umbral ===');
  await assert('award_points sube a Plata al cruzar 50', async () => {
    const r = await send(gamify, 'gamify.award_points', { user_id: userA, puntos: 40, motivo: 'bonus' });
    if (r.puntos !== 60 || r.subio_de_nivel !== true || r.nivel.nombre !== 'Plata') throw new Error(JSON.stringify(r));
  });

  console.log('\n=== FASE G.6: Salto de varios niveles de golpe ===');
  const userB = await registrarUsuario();
  await assert('award_points salta de Bronce directo a Oro (>=200)', async () => {
    const r = await send(gamify, 'gamify.award_points', { user_id: userB, puntos: 250, report_id: 2001 });
    if (r.puntos !== 250 || r.subio_de_nivel !== true || r.nivel.nombre !== 'Oro') throw new Error(JSON.stringify(r));
  });
  await assert('get_user_stats en nivel maximo: sin siguiente, 100%', async () => {
    const r = await send(gamify, 'gamify.get_user_stats', { user_id: userB });
    if (r.nivel.nombre !== 'Oro') throw new Error(JSON.stringify(r));
    if (r.progreso.puntos_siguiente_nivel !== null || r.progreso.porcentaje !== 100) {
      throw new Error(`progreso: ${JSON.stringify(r.progreso)}`);
    }
  });

  console.log('\n=== FASE G.7: Usuario sin registro de puntos ===');
  await assert('get_user_stats de usuario recien creado: 0 puntos, Bronce', async () => {
    const nuevo = await registrarUsuario();
    const r = await send(gamify, 'gamify.get_user_stats', { user_id: nuevo });
    if (r.puntos !== 0 || !r.nivel || r.nivel.nombre !== 'Bronce') throw new Error(JSON.stringify(r));
    if (r.progreso.porcentaje !== 0 || r.progreso.puntos_siguiente_nivel !== 50) {
      throw new Error(`progreso: ${JSON.stringify(r.progreso)}`);
    }
  });
  await assert('get_user_stats de usuario inexistente no revienta (estado inicial)', async () => {
    const r = await send(gamify, 'gamify.get_user_stats', { user_id: 999999999 });
    if (r.puntos !== 0 || !r.nivel || r.nivel.nombre !== 'Bronce') throw new Error(JSON.stringify(r));
  });

  console.log(`\n=== RESULTADO: ${passed} OK / ${failed} FAIL ===`);
  gamify.close(); auth.close();
  process.exit(failed ? 1 : 0);
}

test();
