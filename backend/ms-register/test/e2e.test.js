const { ClientProxyFactory, Transport } = require('@nestjs/microservices');
const { firstValueFrom, timeout } = require('rxjs');
const http = require('http');

const client = ClientProxyFactory.create({
  transport: Transport.TCP,
  options: { host: 'localhost', port: 3002 },
});

async function assert(desc, fn) {
  try {
    await fn();
    console.log(`  ✓ ${desc}`);
  } catch (e) {
    console.error(`  ✗ ${desc}: ${e.message}`);
    process.exitCode = 1;
  }
}

async function test() {
  await client.connect();
  console.log('ms-register — Tests E2E\n');

  // 1. PING
  await assert('PING responde', async () => {
    const r = await firstValueFrom(client.send('register.ping', {}).pipe(timeout(5000)));
    if (r.status !== 'ok' || r.service !== 'ms-register') throw new Error('unexpected response');
  });

  // 2. CREATE_REPORT
  let report;
  const imageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  await assert('CREATE_REPORT con imagen base64 y GPS', async () => {
    report = await firstValueFrom(client.send('register.create_report', {
      device_id: 'test-device-001',
      lat: -17.7833,
      lng: -63.1822,
      categoria_id: 1,
      gravedad: 'Alta',
      imagen_base64: imageBase64,
    }).pipe(timeout(5000)));
    if (!report.id) throw new Error('falta id');
    if (!report.url_imagen) throw new Error('falta url_imagen');
  });

  // 3. H3
  await assert('H3 res 8 valido (15 chars hex)', async () => {
    if (!/^[0-9a-f]{15}$/i.test(report.h3_res_8)) throw new Error(report.h3_res_8);
  });
  await assert('H3 res 11 valido', async () => {
    if (!/^[0-9a-f]{15}$/i.test(report.h3_res_11)) throw new Error(report.h3_res_11);
  });
  await assert('H3 res 13 valido', async () => {
    if (!/^[0-9a-f]{15}$/i.test(report.h3_res_13)) throw new Error(report.h3_res_13);
  });

  // 4. GET_REPORT
  await assert('GET_REPORT con categoria', async () => {
    const r = await firstValueFrom(client.send('register.get_report', {
      report_id: report.id,
    }).pipe(timeout(5000)));
    if (!r.categoria) throw new Error('falta categoria');
  });

  // 5. LIST_REPORTS
  await assert('LIST_REPORTS paginado', async () => {
    const r = await firstValueFrom(client.send('register.list_reports', {
      page: 1, limit: 10,
    }).pipe(timeout(5000)));
    if (r.total < 1) throw new Error('sin resultados');
  });

  // 6. GET_HEATMAP
  await assert('GET_HEATMAP agrupado por H3', async () => {
    const r = await firstValueFrom(client.send('register.get_heatmap', {
      resolution: 8,
    }).pipe(timeout(5000)));
    if (!r.length) throw new Error('sin resultados');
    if (!r[0].h3_cell || !r[0].count) throw new Error('formato invalido');
  });

  // 7. Imagen en MinIO
  await assert('Imagen accesible via MinIO', () => {
    return new Promise((resolve, reject) => {
      http.get(report.url_imagen, (res) => {
        if (res.statusCode !== 200) reject(new Error('HTTP ' + res.statusCode));
        else resolve();
      }).on('error', reject);
    });
  });

  // 8. Crear reporte sin imagen debe fallar
  await assert('CREATE sin imagen lanza error', async () => {
    try {
      await firstValueFrom(client.send('register.create_report', {
        device_id: 'test-002', lat: -17.78, lng: -63.18, categoria_id: 1,
      }).pipe(timeout(5000)));
      throw new Error('deberia haber fallado');
    } catch {
      // esperado
    }
  });

  // 9. GET_REPORT inexistente
  await assert('GET_REPORT no existente lanza error', async () => {
    try {
      await firstValueFrom(client.send('register.get_report', {
        report_id: 99999,
      }).pipe(timeout(5000)));
      throw new Error('deberia haber fallado');
    } catch {
      // esperado
    }
  });

  console.log('\n' + (process.exitCode ? 'ALGUNOS TESTS FALLARON' : 'TODOS LOS TESTS PASARON'));
  client.close();
  process.exit();
}

test();
