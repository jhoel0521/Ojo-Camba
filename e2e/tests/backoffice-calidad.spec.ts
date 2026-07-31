import { expect, request as playwrightRequest, test } from '@playwright/test';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const BACKOFFICE_URL = process.env.BACKOFFICE_URL ?? 'http://localhost:5174';
const CREDENCIALES = { email: 'moderador2@ojocamba.bo', password: 'mod123' };
const TINY_PNG_DATA_URL =
  'data:image/png;base64,' +
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mP8' +
  'z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';

async function crearReporte(api: Awaited<ReturnType<typeof playwrightRequest.newContext>>, suffix: string) {
  const respuesta = await api.post('/reportes', {
    data: {
      device_id: `e2e-calidad-${suffix}-${Date.now()}`,
      lat: -17.78331,
      lng: -63.18211,
      categoria_id: 1,
      gravedad: 'Media',
      imagen_base64: TINY_PNG_DATA_URL,
    },
  });
  expect(respuesta.ok()).toBeTruthy();
  return respuesta.json() as Promise<{ id: number }>;
}

test.describe('ISSUE-30 — decisiones auditables de Backoffice', () => {
  test('acepta en el Caso activo equivalente, descarta con motivo y expone sus bandejas', async ({ page }) => {
    const api = await playwrightRequest.newContext({ baseURL: API_URL });
    const login = await api.post('/auth/login', { data: CREDENCIALES });
    expect(login.ok()).toBeTruthy();
    const sesion = await login.json();
    const headers = { Authorization: `Bearer ${sesion.access_token}` };

    const primero = await crearReporte(api, 'primero');
    const aceptarPrimero = await api.post(`/admin/reports/${primero.id}/accept`, {
      data: { categoria_id: 1, gravedad: 'Media' },
      headers,
    });
    expect(aceptarPrimero.ok()).toBeTruthy();
    const casoInicial = await aceptarPrimero.json();

    const segundo = await crearReporte(api, 'segundo');
    const aceptarSegundo = await api.post(`/admin/reports/${segundo.id}/accept`, {
      data: { categoria_id: 1, gravedad: 'Media' },
      headers,
    });
    expect(aceptarSegundo.ok()).toBeTruthy();
    expect((await aceptarSegundo.json()).grupo_id).toBe(casoInicial.grupo_id);

    const descartable = await crearReporte(api, 'descarte');
    const descarte = await api.post(`/admin/reports/${descartable.id}/reject`, {
      data: { motivo: 'evidencia_insuficiente' },
      headers,
    });
    expect(descarte.ok()).toBeTruthy();
    expect(await descarte.json()).toEqual(
      expect.objectContaining({ estado: 'Rechazado', motivo: 'evidencia_insuficiente' }),
    );

    const calidad = await api.get('/admin/review/quality', { headers });
    expect(calidad.ok()).toBeTruthy();
    expect(await calidad.json()).toEqual(
      expect.objectContaining({ total_admisiones: expect.any(Number), por_categoria: expect.any(Array) }),
    );
    await api.dispose();

    await page.goto(`${BACKOFFICE_URL}/login`);
    await page.getByPlaceholder('moderador@ojocamba.bo').fill(CREDENCIALES.email);
    await page.getByPlaceholder('••••••••').fill(CREDENCIALES.password);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page).toHaveURL(`${BACKOFFICE_URL}/revisar`, { timeout: 10_000 });

    await page.goto(`${BACKOFFICE_URL}/revisar/alertas`);
    await expect(page.getByRole('heading', { name: 'Alertas de revisión' })).toBeVisible();
    await page.goto(`${BACKOFFICE_URL}/revisar/historial`);
    await expect(page.getByRole('heading', { name: 'Historial de decisiones' })).toBeVisible();
    await page.goto(`${BACKOFFICE_URL}/revisar/calidad`);
    await expect(page.getByRole('heading', { name: 'Calidad de admisiones' })).toBeVisible();
  });
});
