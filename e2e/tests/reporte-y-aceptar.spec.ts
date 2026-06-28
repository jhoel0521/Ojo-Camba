import { test, expect, request as playwrightRequest } from '@playwright/test';
import { readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

const REPORTE_URL = process.env.REPORTE_URL ?? 'http://localhost:5173';
const BACKOFFICE_URL = process.env.BACKOFFICE_URL ?? 'http://localhost:5174';
const API_URL = process.env.API_URL ?? 'http://localhost:3000';

function getConfiguredApiOrigin(): string {
  try {
    const env = readFileSync(
      resolve(__dirname, '../../frontend/app-reporte/.env'),
      'utf-8',
    );
    const m = env.match(/^VITE_API_URL=(.+)$/m);
    return m ? m[1].trim() : 'http://localhost:3000';
  } catch {
    return 'http://localhost:3000';
  }
}

const CONFIGURED_API = getConfiguredApiOrigin();
const LOCAL_API = 'http://localhost:3000';

const MODERATOR_EMAIL = 'admin@ojocamba.bo';
const MODERATOR_PASSWORD = 'admin123';

const GEOLOCATION = { latitude: -17.7833, longitude: -63.1821, accuracy: 10 };

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mP8' +
  'z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

function findResourceImage(): { name: string; mimeType: string; buffer: Buffer } | string {
  const dir = resolve(__dirname, '../resources');
  try {
    const files = readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
    if (files.length > 0) {
      const filePath = join(dir, files[0]);
      const { size } = require('fs').statSync(filePath);
      if (size < 5 * 1024 * 1024) return filePath;
    }
  } catch { /* sin recursos */ }
  return { name: 'bache-test.png', mimeType: 'image/png', buffer: TINY_PNG };
}

async function loginBackoffice(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${BACKOFFICE_URL}/login`);
  await expect(page.getByPlaceholder('moderador@ojocamba.bo')).toBeVisible();
  await page.getByPlaceholder('moderador@ojocamba.bo').fill(MODERATOR_EMAIL);
  await page.getByPlaceholder('••••••••').fill(MODERATOR_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(`${BACKOFFICE_URL}/`, { timeout: 10_000 });
}

test.describe('Flujo completo: ciudadano reporta → moderador acepta', () => {
  test('crear reporte anónimo en app-reporte y aceptarlo individualmente en backoffice', async ({
    page,
    context,
  }) => {
    const imageSource = findResourceImage();

    // ── PARTE 1: Crear el reporte en app-reporte ─────────────────────────────

    await context.route(new RegExp(CONFIGURED_API.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), async (route) => {
      const newUrl = route.request().url().replace(CONFIGURED_API, LOCAL_API);
      const response = await route.fetch({ url: newUrl });
      await route.fulfill({ response });
    });

    await context.grantPermissions(['geolocation']);
    await context.setGeolocation(GEOLOCATION);

    await page.goto(`${REPORTE_URL}/nuevo`);
    await expect(page.getByText('Tomar foto')).toBeVisible({ timeout: 10_000 });

    await page.locator('input[type="file"]').setInputFiles(imageSource);
    await expect(page.locator('img[alt="Preview"]')).toBeVisible({ timeout: 5_000 });

    await page.getByRole('button', { name: 'Bache' }).click();
    await expect(page.getByRole('button', { name: 'Enviar Reporte' })).toBeEnabled();
    await page.getByRole('button', { name: 'Enviar Reporte' }).click();
    await expect(page.getByText('Reporte Enviado')).toBeVisible({ timeout: 15_000 });

    // ── PARTE 2: Login en el backoffice ──────────────────────────────────────

    await loginBackoffice(page);

    // ── PARTE 3: Revisar reportes pendientes ─────────────────────────────────

    await page.goto(`${BACKOFFICE_URL}/revisar`);

    // Actualizar la bandeja
    await page.locator('[data-testid="btn-actualizar"]').click();

    // Esperar que aparezca al menos un report-card
    await expect(page.locator('[data-testid^="report-card-"]').first()).toBeVisible({ timeout: 10_000 });

    // Hacer clic en el primer reporte para abrirlo en Col 2
    await page.locator('[data-testid^="report-card-"]').first().click();

    // Verificar que Col 2 muestra la inspección
    await expect(page.getByText('Inspección del Reporte')).toBeVisible({ timeout: 5_000 });

    // Verificar que la imagen se cargó
    const imgSrc = await page.locator('img[alt="Evidencia"]').getAttribute('src');
    expect(imgSrc).toBeTruthy();
    expect(imgSrc).not.toBe('');

    // ── PARTE 4: Aceptar el reporte individualmente ───────────────────────────

    await page.locator('[data-testid="btn-aceptar"]').click();

    // Modal de confirmación
    await expect(page.getByText(/Al aceptar el reporte/)).toBeVisible({ timeout: 3_000 });
    await page.getByRole('button', { name: 'Confirmar' }).click();

    // Col 2 vuelve al estado vacío (no hay reporte seleccionado)
    await expect(page.getByText('Inspección del Reporte')).not.toBeVisible({ timeout: 8_000 });
  });
});

test.describe('Agrupación de reportes cercanos', () => {
  test('agrupar dos reportes cercanos en un Caso de Obra', async ({ page }) => {
    // Crear 2 reportes vía API con coordenadas idénticas (0m de distancia → ambos aparecen como cercanos)
    const apiContext = await playwrightRequest.newContext({ baseURL: API_URL });

    const deviceId = `e2e-group-test-${Date.now()}`;

    const [r1, r2] = await Promise.all([
      apiContext.post('/reportes', {
        data: {
          device_id: deviceId,
          lat: -17.7833,
          lng: -63.1821,
          categoria_id: 1,
          imagen_base64: TINY_PNG.toString('base64'),
        },
      }).then((r) => r.json()),
      apiContext.post('/reportes', {
        data: {
          device_id: deviceId,
          lat: -17.7834,  // ~11 metros al sur
          lng: -63.1821,
          categoria_id: 1,
          imagen_base64: TINY_PNG.toString('base64'),
        },
      }).then((r) => r.json()),
    ]);

    expect(r1.id).toBeTruthy();
    expect(r2.id).toBeTruthy();

    await apiContext.dispose();

    // ── Login ─────────────────────────────────────────────────────────────────

    await loginBackoffice(page);

    // ── Revisar bandeja ───────────────────────────────────────────────────────

    await page.goto(`${BACKOFFICE_URL}/revisar`);
    await page.locator('[data-testid="btn-actualizar"]').click();

    // Esperar que aparezca el primer report-card
    await expect(page.locator('[data-testid^="report-card-"]').first()).toBeVisible({ timeout: 10_000 });

    // Clic en el primer reporte creado (por ID)
    const firstCard = page.locator(`[data-testid="report-card-${r1.id}"]`);
    await expect(firstCard).toBeVisible({ timeout: 5_000 });
    await firstCard.click();

    // Col 2 debe mostrar el detalle
    await expect(page.getByText('Inspección del Reporte')).toBeVisible({ timeout: 5_000 });

    // Col 3 debe mostrar el segundo reporte como cercano
    const nearbyCard = page.locator(`[data-testid="nearby-card-${r2.id}"]`);
    await expect(nearbyCard).toBeVisible({ timeout: 5_000 });

    // Marcar el segundo reporte para agrupar
    await nearbyCard.locator('input[type="checkbox"]').check();

    // El botón debe cambiar a "Crear Caso de Obra"
    await expect(page.locator('[data-testid="btn-crear-caso"]')).toBeVisible({ timeout: 2_000 });

    // Crear el caso
    await page.locator('[data-testid="btn-crear-caso"]').click();

    // Confirmar
    await expect(page.getByText('Se agruparán 2 reportes')).toBeVisible({ timeout: 3_000 });
    await page.getByRole('button', { name: 'Confirmar' }).click();

    // Ambos reportes deben desaparecer de la bandeja
    await expect(page.locator(`[data-testid="report-card-${r1.id}"]`)).not.toBeVisible({ timeout: 8_000 });
    await expect(page.locator(`[data-testid="report-card-${r2.id}"]`)).not.toBeVisible({ timeout: 3_000 });

    // Col 2 vuelve al estado vacío
    await expect(page.getByText('Inspección del Reporte')).not.toBeVisible({ timeout: 3_000 });
  });
});
