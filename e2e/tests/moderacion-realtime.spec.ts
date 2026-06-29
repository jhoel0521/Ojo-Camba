import { test, expect, request as playwrightRequest, type Page, type Browser } from '@playwright/test';

const BACKOFFICE_URL = process.env.BACKOFFICE_URL ?? 'http://localhost:5174';
const API_URL = process.env.API_URL ?? 'http://localhost:3000';

const MOD_A = { email: 'admin@ojocamba.bo', password: 'admin123' };
const MOD_B = { email: 'moderador2@ojocamba.bo', password: 'mod123' };

const TINY_PNG_DATA_URL =
  'data:image/png;base64,' +
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mP8' +
  'z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';

async function crearReporte(): Promise<number> {
  const api = await playwrightRequest.newContext({ baseURL: API_URL });
  const r = await api
    .post('/reportes', {
      data: {
        device_id: `e2e-rt-${Date.now()}-${Math.random()}`,
        lat: -17.7833 + Math.random() * 0.01,
        lng: -63.1821 + Math.random() * 0.01,
        categoria_id: 1,
        imagen_base64: TINY_PNG_DATA_URL,
      },
    })
    .then((res) => res.json());
  await api.dispose();
  return r.id;
}

async function login(page: Page, cred: { email: string; password: string }) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${BACKOFFICE_URL}/login`);
  await page.getByPlaceholder('moderador@ojocamba.bo').fill(cred.email);
  await page.getByPlaceholder('••••••••').fill(cred.password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(`${BACKOFFICE_URL}/`, { timeout: 10_000 });
}

async function abrirRevisar(browser: Browser, cred: { email: string; password: string }) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await login(page, cred);
  await page.goto(`${BACKOFFICE_URL}/revisar`);
  // Esperar conexión de tiempo real.
  await expect(page.getByTestId('rt-status')).toHaveAttribute('data-connected', 'true', {
    timeout: 10_000,
  });
  return { ctx, page };
}

test.describe('Moderación en tiempo real + claim (ISSUE-23)', () => {
  test('reporte nuevo aparece en el backoffice sin recargar', async ({ browser }) => {
    const { ctx, page } = await abrirRevisar(browser, MOD_A);

    // Crear un reporte DESPUÉS de tener la bandeja abierta (sin recargar).
    const reportId = await crearReporte();

    // Debe aparecer solo por el evento report:new (sin pulsar actualizar).
    await expect(page.getByTestId(`report-row-${reportId}`)).toBeVisible({ timeout: 10_000 });

    await ctx.close();
  });

  test('mod A toma un reporte → mod B ve el candado; al aceptar desaparece en ambos', async ({
    browser,
  }) => {
    const reportId = await crearReporte();

    const a = await abrirRevisar(browser, MOD_A);
    const b = await abrirRevisar(browser, MOD_B);

    // Ambos ven el reporte en la bandeja.
    await a.page.getByTestId('btn-actualizar').click();
    await b.page.getByTestId('btn-actualizar').click();
    await expect(a.page.getByTestId(`report-row-${reportId}`)).toBeVisible({ timeout: 10_000 });
    await expect(b.page.getByTestId(`report-row-${reportId}`)).toBeVisible({ timeout: 10_000 });

    // Mod A abre el reporte → lo "toma" (claim).
    await a.page.getByTestId(`report-row-${reportId}`).click();
    await expect(a.page.getByText('Inspección del Reporte')).toBeVisible({ timeout: 5_000 });

    // Mod B debe ver el candado en ese reporte.
    await expect(b.page.getByTestId(`lock-${reportId}`)).toBeVisible({ timeout: 10_000 });
    await expect(b.page.getByTestId(`lock-${reportId}`)).toContainText('está revisando');

    // Mod A acepta el reporte.
    await a.page.getByTestId('btn-aceptar').click();
    await a.page.getByRole('button', { name: 'Confirmar' }).click();

    // Desaparece de AMBAS bandejas (report:resolved).
    await expect(a.page.getByTestId(`report-row-${reportId}`)).toHaveCount(0, { timeout: 10_000 });
    await expect(b.page.getByTestId(`report-row-${reportId}`)).toHaveCount(0, { timeout: 10_000 });

    await a.ctx.close();
    await b.ctx.close();
  });
});
