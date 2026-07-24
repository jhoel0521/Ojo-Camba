const { ClientProxyFactory, Transport } = require('@nestjs/microservices');
const { firstValueFrom, timeout } = require('rxjs');

const ia = ClientProxyFactory.create({ transport: Transport.TCP, options: { host: 'localhost', port: 3006 } });

let passed = 0, failed = 0;
async function assert(desc, fn) {
  try { await fn(); passed++; console.log(`  OK ${desc}`); }
  catch (e) { failed++; console.error(`  FAIL ${desc}: ${e.message}`); process.exitCode = 1; }
}

const send = (pattern, payload) => firstValueFrom(ia.send(pattern, payload).pipe(timeout(8000)));

async function test() {
  await ia.connect();

  console.log('=== FASE I.0: Ping ===');
  await assert('ia.ping responde', async () => {
    const r = await send('ia.ping', {});
    if (r.status !== 'ok' || r.service !== 'ms-ia') throw new Error(JSON.stringify(r));
  });

  console.log('\n=== FASE I.1: Motor de triaje (mismo resultado que el viejo motor de frontend) ===');
  await assert('bache en via_principal -> Alta, dispara R4', async () => {
    const r = await send('ia.inferir_triaje', {
      categoria_id: 1,
      creado_en: new Date().toISOString(),
      distancias_cercanas_m: [],
      ubicacion_sensible: 'via_principal',
      palabra_clave_riesgo: false,
    });
    if (r.gravedad_sugerida !== 'Alta') throw new Error(JSON.stringify(r));
    if (!r.traza.some((t) => t.id === 'R4')) throw new Error(`traza sin R4: ${JSON.stringify(r.traza)}`);
  });
  await assert('palabra_clave_riesgo=true -> Emergencia, dispara R1', async () => {
    const r = await send('ia.inferir_triaje', {
      categoria_id: 4,
      creado_en: new Date().toISOString(),
      distancias_cercanas_m: [],
      palabra_clave_riesgo: true,
    });
    if (r.gravedad_sugerida !== 'Emergencia') throw new Error(JSON.stringify(r));
    if (!r.traza.some((t) => t.id === 'R1')) throw new Error(`traza sin R1: ${JSON.stringify(r.traza)}`);
  });
  await assert('categoria_id faltante -> {status:error} con mensaje claro (convencion RPC del repo)', async () => {
    const r = await send('ia.inferir_triaje', { creado_en: new Date().toISOString() });
    if (r.status !== 'error' || !r.message.includes('es requerido')) throw new Error(JSON.stringify(r));
  });

  console.log('\n=== FASE I.2: Asistente (validacion sin depender de GROQ_API_KEY) ===');
  await assert('ia.chat con message vacio -> {status:error} "es requerido"', async () => {
    const r = await send('ia.chat', { message: '' });
    if (r.status !== 'error' || !r.message.includes('es requerido')) throw new Error(JSON.stringify(r));
  });

  console.log(`\n=== RESULTADO: ${passed} OK / ${failed} FAIL ===`);
  ia.close();
  process.exit(failed ? 1 : 0);
}

test();
