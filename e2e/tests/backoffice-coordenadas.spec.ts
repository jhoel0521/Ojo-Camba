import { expect, request as playwrightRequest, test } from '@playwright/test';

const BACKOFFICE_URL = process.env.BACKOFFICE_URL ?? 'http://localhost:5174';
const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@ojocamba.bo';
const ADMIN_PASSWORD = 'admin123';

const TINY_PNG_DATA_URL =
  'data:image/png;base64,' +
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mP8' +
  'z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';

async function crearCasoConCoordenadasDecimales(): Promise<{ id: number }> {
  const api = await playwrightRequest.newContext({ baseURL: API_URL });
  const loginResponse = await api.post('/auth/login', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const login = await loginResponse.json();
  const headers = { Authorization: `Bearer ${login.access_token}` };
  const deviceId = `e2e-backoffice-coordenadas-${Date.now()}`;

  const reportes = await Promise.all(
    [-17.7833, -17.7834].map(async (lat) => {
      const response = await api.post('/reportes', {
        data: {
          device_id: deviceId,
          lat,
          lng: -63.1821,
          categoria_id: 1,
          imagen_base64: TINY_PNG_DATA_URL,
        },
      });
      return response.json();
    }),
  );

  const grupoResponse = await api.post('/admin/groups', {
    data: {
      report_ids: reportes.map((reporte) => reporte.id),
      creado_por_usuario_id: login.user.id,
    },
    headers,
  });
  const grupo = await grupoResponse.json();

  const actualizacionResponse = await api.post(`/admin/groups/${grupo.id}/updates`, {
    data: {
      usuario_id: login.user.id,
      comentario: 'Coordenadas decimales para la prueba de Backoffice.',
      lat_actualizada: -17.77777,
      lng_actualizada: -63.18222,
    },
    headers,
  });
  expect(actualizacionResponse.ok()).toBeTruthy();
  await api.dispose();

  return { id: grupo.id };
}

test.describe('Backoffice: coordenadas históricas en la bitácora', () => {
  test('muestra numeric de PostgreSQL sin romper el detalle del caso', async ({ page }) => {
    const caso = await crearCasoConCoordenadasDecimales();
    const erroresDePagina: Error[] = [];
    const advertenciasRouter: string[] = [];
    page.on('pageerror', (error) => erroresDePagina.push(error));
    page.on('console', (message) => {
      if (message.type() === 'warning' && message.text().includes('React Router Future Flag Warning')) {
        advertenciasRouter.push(message.text());
      }
    });

    await page.goto(`${BACKOFFICE_URL}/login`);
    await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page).toHaveURL(`${BACKOFFICE_URL}/areas`, { timeout: 10_000 });
    await page.getByRole('button', { name: /Usuarios y solicitudes/ }).click();
    await expect(page).toHaveURL(`${BACKOFFICE_URL}/accesos`, { timeout: 10_000 });
    await page.goto(`${BACKOFFICE_URL}/casos/${caso.id}`);

    await expect(page.getByText('GPS actualizado: -17.77777, -63.18222')).toBeVisible({
      timeout: 10_000,
    });
    expect(erroresDePagina).toEqual([]);
    expect(advertenciasRouter).toEqual([]);
  });
});
