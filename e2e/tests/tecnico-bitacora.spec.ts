import { expect, request as playwrightRequest, test, type APIRequestContext } from '@playwright/test';

const TECNICO_URL = process.env.TECNICO_URL ?? 'http://localhost:5175';
const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const ADMIN = { email: 'admin@ojocamba.bo', password: 'admin123' };
const RESPONSABLE = { email: 'jefe.cuadrilla@ojocamba.bo', password: 'cuadrilla123' };
const TECNICO = { email: 'tecnico.1@ojocamba.bo', password: 'cuadrilla123' };
const UBICACION = { lat: -17.7833, lng: -63.1821 };
const TINY_PNG_DATA_URL =
  'data:image/png;base64,' +
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mP8' +
  'z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';

async function loginApi(api: APIRequestContext, cred: { email: string; password: string }) {
  const respuesta = await api.post('/auth/login', { data: cred });
  expect(respuesta.ok()).toBeTruthy();
  return respuesta.json();
}

/** Prepara el recorrido real: responsable distribuye una visita a un técnico. */
async function prepararVisitaAsignada() {
  const api = await playwrightRequest.newContext({ baseURL: API_URL });
  const admin = await loginApi(api, ADMIN);
  const headersAdmin = { Authorization: `Bearer ${admin.access_token}` };
  const sufijo = Date.now();
  const reportes = await Promise.all(
    [0, -0.0001].map(async (delta, indice) => {
      const respuesta = await api.post('/reportes', {
        data: {
          device_id: `e2e-visita-${sufijo}-${indice}`,
          lat: UBICACION.lat + delta,
          lng: UBICACION.lng,
          categoria_id: 1,
          imagen_base64: TINY_PNG_DATA_URL,
        },
      });
      expect(respuesta.ok()).toBeTruthy();
      return respuesta.json();
    }),
  );
  const grupoRespuesta = await api.post('/admin/groups', {
    headers: headersAdmin,
    data: { report_ids: reportes.map((reporte) => reporte.id), creado_por_usuario_id: admin.user.id },
  });
  expect(grupoRespuesta.ok()).toBeTruthy();
  const grupo = await grupoRespuesta.json();

  const cuadrillaRespuesta = await api.post('/admin/cuadrillas', {
    headers: headersAdmin,
    data: { nombre: `E2E Ruta ${sufijo}` },
  });
  expect(cuadrillaRespuesta.ok()).toBeTruthy();
  const cuadrilla = await cuadrillaRespuesta.json();

  const responsable = await loginApi(api, RESPONSABLE);
  const tecnico = await loginApi(api, TECNICO);
  for (const [usuario, es_responsable] of [
    [responsable.user, true],
    [tecnico.user, false],
  ] as const) {
    const miembro = await api.post(`/operacion/cuadrillas/${cuadrilla.id}/miembros`, {
      headers: headersAdmin,
      data: { usuario_id: usuario.id, es_responsable },
    });
    expect(miembro.ok()).toBeTruthy();
  }
  const asignacionCuadrilla = await api.post(`/admin/groups/${grupo.id}/cuadrilla`, {
    headers: headersAdmin,
    data: { cuadrilla_id: cuadrilla.id, usuario_id: admin.user.id },
  });
  expect(asignacionCuadrilla.ok()).toBeTruthy();

  const pendientes = await api.get('/operacion/mi-cuadrilla/visitas?limit=100', {
    headers: { Authorization: `Bearer ${responsable.access_token}` },
  });
  expect(pendientes.ok()).toBeTruthy();
  const visita = (await pendientes.json()).data.find((item: { grupo_id: number }) => item.grupo_id === grupo.id);
  expect(visita).toBeTruthy();
  const fecha = new Date().toISOString().slice(0, 10);
  const distribucion = await api.put(`/operacion/mi-cuadrilla/visitas/${visita.id}/asignacion`, {
    headers: { Authorization: `Bearer ${responsable.access_token}` },
    data: { tecnico_id: tecnico.user.id, fecha_planificada: fecha, orden_ruta: 1 },
  });
  expect(distribucion.ok()).toBeTruthy();
  await api.dispose();
  return { codigoObra: grupo.codigo_obra, visitaId: visita.id };
}

test.describe('App técnica: recorrido asignado (ISSUE-29)', () => {
  test('responsable asigna una parada, el técnico ve la agrupación y registra su llegada GPS', async ({
    page,
    context,
  }) => {
    const visita = await prepararVisitaAsignada();
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: -17.7844, longitude: -63.1825, accuracy: 8 });

    await page.goto(`${TECNICO_URL}/login`);
    await page.getByPlaceholder('tecnico@ojocamba.bo').fill(TECNICO.email);
    await page.getByPlaceholder('********').fill(TECNICO.password);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page).toHaveURL(`${TECNICO_URL}/`, { timeout: 10_000 });

    await page.goto(`${TECNICO_URL}/mi-ruta`);
    await page.getByRole('link', { name: new RegExp(visita.codigoObra) }).click();
    await expect(page.getByText('2 reportes ciudadanos agrupados')).toBeVisible();
    await page.getByRole('button', { name: 'Registrar llegada' }).click();
    await expect(page.getByRole('button', { name: 'Llegada registrada' })).toBeVisible({
      timeout: 10_000,
    });

    const api = await playwrightRequest.newContext({ baseURL: API_URL });
    const tecnico = await loginApi(api, TECNICO);
    const detalle = await api.get(`/operacion/visitas/${visita.visitaId}`, {
      headers: { Authorization: `Bearer ${tecnico.access_token}` },
    });
    expect((await detalle.json()).visita.llegada_en).toBeTruthy();
    await api.dispose();
  });
});
