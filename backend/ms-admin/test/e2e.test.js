const { ClientProxyFactory, Transport } = require('@nestjs/microservices');
const { firstValueFrom, timeout } = require('rxjs');

const admin = ClientProxyFactory.create({ transport: Transport.TCP, options: { host: 'localhost', port: 3003 } });
const register = ClientProxyFactory.create({ transport: Transport.TCP, options: { host: 'localhost', port: 3002 } });

let passed = 0, failed = 0;
async function assert(desc, fn) {
  try { await fn(); passed++; console.log(`  OK ${desc}`); }
  catch (e) { failed++; console.error(`  FAIL ${desc}: ${e.message}`); process.exitCode = 1; }
}

const IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function test() {
  await admin.connect();
  await register.connect();

  console.log('=== FASE 12.1: CU-06 Bandeja de pendientes ===');
  let ids = [];
  for (let i = 0; i < 3; i++) {
    const r = await firstValueFrom(register.send('register.create_report', {
      device_id: `test-cu06-${i}`, lat: -17.78 + i*0.001, lng: -63.18, categoria_id: 1, imagen_base64: IMG,
    }).pipe(timeout(5000)));
    ids.push(r.id);
  }
  await assert('list_pending devuelve al menos 3', async () => {
    const r = await firstValueFrom(admin.send('admin.list_pending', { page: 1, limit: 10 }).pipe(timeout(5000)));
    if (r.total < 3) throw new Error('total < 3');
  });
  await assert('list_pending paginado (limit=2)', async () => {
    const r = await firstValueFrom(admin.send('admin.list_pending', { limit: 2 }).pipe(timeout(5000)));
    if (r.data.length !== 2 || r.total < 3) throw new Error('paginacion incorrecta');
  });

  console.log('\n=== FASE 12.2: CU-07 Aceptar y Rechazar ===');
  await assert('accept_report cambia estado', async () => {
    const r = await firstValueFrom(admin.send('admin.accept_report', { report_id: ids[0], moderador_id: 1 }).pipe(timeout(5000)));
    if (r.estado !== 'Aceptado') throw new Error(r.estado);
  });
  await assert('reporte aceptado ya no aparece en pending', async () => {
    const r = await firstValueFrom(admin.send('admin.list_pending', {}).pipe(timeout(5000)));
    if (r.data.some((x) => x.id === ids[0])) throw new Error('sigue en pending');
  });
  await assert('reject_report cambia estado', async () => {
    const r = await firstValueFrom(admin.send('admin.reject_report', { report_id: ids[1] }).pipe(timeout(5000)));
    if (r.estado !== 'Rechazado') throw new Error(r.estado);
  });
  await assert('aceptar ya aceptado lanza error', async () => {
    try { await firstValueFrom(admin.send('admin.accept_report', { report_id: ids[0], moderador_id: 1 }).pipe(timeout(5000))); throw new Error('no fallo'); }
    catch { /* esperado */ }
  });

  console.log('\n=== FASE 12.3: CU-09 Banear DeviceID ===');
  await assert('ban_device bloquea dispositivo', async () => {
    const r = await firstValueFrom(admin.send('admin.ban_device', { device_id: 'test-cu06-2', motivo: 'spam' }).pipe(timeout(5000)));
    if (!r.ok || !r.is_banned) throw new Error(JSON.stringify(r));
  });
  await assert('ban_device inexistente lanza error', async () => {
    try { await firstValueFrom(admin.send('admin.ban_device', { device_id: 'no-existe-xyz' }).pipe(timeout(5000))); throw new Error('no fallo'); }
    catch { /* esperado */ }
  });

  console.log('\n=== FASE 12.4: CU-08/CU-11 Crear Caso de Obra ===');
  // Crear 3 reportes con misma ubicacion (mismo H3)
  const sameH3Ids = [];
  for (let i = 0; i < 3; i++) {
    const r = await firstValueFrom(register.send('register.create_report', {
      device_id: `test-group-${i}`, lat: -17.7833, lng: -63.1822, categoria_id: 2, imagen_base64: IMG,
    }).pipe(timeout(5000)));
    sameH3Ids.push(r.id);
  }
  let grupoId;
  let codigoObra;
  await assert('create_group con 3 reportes mismo H3', async () => {
    const r = await firstValueFrom(admin.send('admin.create_group', { report_ids: sameH3Ids, creado_por_usuario_id: 1 }).pipe(timeout(5000)));
    if (!r.id || !r.codigo_obra) throw new Error(JSON.stringify(r));
    grupoId = r.id; codigoObra = r.codigo_obra;
  });
  await assert('codigo_obra tiene formato O-YY-NNNNNNN', async () => {
    if (!/^O-\d{2}-\d{7}$/.test(codigoObra)) throw new Error(codigoObra);
  });
  await assert('create_group con H3 distintos SI permite agrupar (decision de producto: sugerencia por proximidad, no restriccion estricta por celda)', async () => {
    const idA = (await firstValueFrom(register.send('register.create_report', {
      device_id: 'test-h3-a', lat: -17.7833, lng: -63.1822, categoria_id: 1, imagen_base64: IMG,
    }).pipe(timeout(5000)))).id;
    const idB = (await firstValueFrom(register.send('register.create_report', {
      device_id: 'test-h3-b', lat: -17.80, lng: -63.20, categoria_id: 1, imagen_base64: IMG,
    }).pipe(timeout(5000)))).id;
    const r = await firstValueFrom(admin.send('admin.create_group', { report_ids: [idA, idB], creado_por_usuario_id: 1 }).pipe(timeout(5000)));
    if (!r.id || !r.codigo_obra) throw new Error(JSON.stringify(r));
  });

  console.log('\n=== FASE 12.5: CU-12 Bitacora diaria sin cambiar estado ===');
  let actId;
  await assert('update_case solo comentario (sin estado)', async () => {
    const r = await firstValueFrom(admin.send('admin.update_case', {
      grupo_id: grupoId, usuario_id: 2, comentario: 'Dia 1 - Evaluando danos',
    }).pipe(timeout(5000)));
    if (!r.id || r.estado_nuevo !== null) throw new Error(JSON.stringify(r));
    actId = r.id;
  });

  console.log('\n=== FASE 12.6: CU-13 Corregir coordenadas GPS ===');
  await assert('update_case con GPS corregido', async () => {
    const r = await firstValueFrom(admin.send('admin.update_case', {
      grupo_id: grupoId, usuario_id: 2, comentario: 'GPS corregido en sitio',
      lat_actualizada: -17.784, lng_actualizada: -63.181,
    }).pipe(timeout(5000)));
    if (!r.id) throw new Error('no se creo');
  });

  console.log('\n=== FASE 12.7: CU-14 Cambiar estado del Caso ===');
  await assert('update_case a EnTrabajo', async () => {
    const r = await firstValueFrom(admin.send('admin.update_case', {
      grupo_id: grupoId, usuario_id: 2, estado_nuevo: 'EnTrabajo', comentario: 'Iniciando reparacion',
    }).pipe(timeout(5000)));
    if (r.estado_nuevo !== 'EnTrabajo') throw new Error(r.estado_nuevo);
  });
  await assert('update_case a Finalizado', async () => {
    const r = await firstValueFrom(admin.send('admin.update_case', {
      grupo_id: grupoId, usuario_id: 2, estado_nuevo: 'Finalizado', comentario: 'Obra completada',
    }).pipe(timeout(5000)));
    if (r.estado_nuevo !== 'Finalizado') throw new Error(r.estado_nuevo);
  });
  await assert('update_case estado invalido lanza error', async () => {
    try {
      await firstValueFrom(admin.send('admin.update_case', {
        grupo_id: grupoId, usuario_id: 2, estado_nuevo: 'Inexistente', comentario: 'test',
      }).pipe(timeout(5000)));
      throw new Error('no fallo');
    } catch { /* esperado */ }
  });

  console.log('\n=== FASE 12.8: CU-04 Bitacora publica / Timeline ===');
  await assert('get_group devuelve detalle con total_reportes', async () => {
    const r = await firstValueFrom(admin.send('admin.get_group', { grupo_id: grupoId }).pipe(timeout(5000)));
    if (!r.codigo_obra || r.total_reportes < 1) throw new Error(JSON.stringify(r));
  });
  await assert('list_groups devuelve paginado', async () => {
    const r = await firstValueFrom(admin.send('admin.list_groups', { page: 1, limit: 10 }).pipe(timeout(5000)));
    if (r.total < 1) throw new Error('sin grupos');
  });
  await assert('get_case_timeline devuelve cronologico', async () => {
    const r = await firstValueFrom(admin.send('admin.get_case_timeline', { grupo_id: grupoId }).pipe(timeout(5000)));
    if (r.length < 4) throw new Error(`solo ${r.length} actualizaciones`);
  });
  await assert('get_group no existente lanza error', async () => {
    try { await firstValueFrom(admin.send('admin.get_group', { grupo_id: 99999 }).pipe(timeout(5000))); throw new Error('no fallo'); }
    catch { /* esperado */ }
  });

  console.log('\n=== FASE 12.9: ACID — concurrencia en accept_report (ISSUE-18) ===');
  await assert('accept_report disparado 2 veces en paralelo solo transiciona una vez (atomicidad/aislamiento)', async () => {
    const concurrenteId = (await firstValueFrom(register.send('register.create_report', {
      device_id: 'test-concurrencia', lat: -17.79, lng: -63.19, categoria_id: 1, imagen_base64: IMG,
    }).pipe(timeout(5000)))).id;

    const intentos = await Promise.allSettled([
      firstValueFrom(admin.send('admin.accept_report', { report_id: concurrenteId, moderador_id: 1 }).pipe(timeout(5000))),
      firstValueFrom(admin.send('admin.accept_report', { report_id: concurrenteId, moderador_id: 2 }).pipe(timeout(5000))),
    ]);

    const exitosos = intentos.filter((r) => r.status === 'fulfilled');
    if (exitosos.length !== 1) {
      throw new Error(`se esperaba exactamente 1 transicion exitosa, hubo ${exitosos.length}`);
    }

    const grupoIds = new Set(exitosos.map((r) => r.value.grupo_id));
    if (grupoIds.size !== 1) throw new Error('se creo mas de un Caso de Obra para el mismo reporte');
  });

  console.log(`\n=== RESULTADO: ${passed} OK / ${failed} FAIL ===`);
  admin.close(); register.close();
  process.exit(failed ? 1 : 0);
}

test();
