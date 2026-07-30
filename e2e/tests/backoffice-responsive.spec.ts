import { test, expect, request as playwrightRequest, type Page } from '@playwright/test';

/**
 * ISSUE-30 — el Backoffice tiene que poder operarse desde un telefono.
 *
 * El criterio es concreto: 375, 390 y 428 px sin desplazamiento horizontal
 * involuntario, conservando la navegacion. Antes era imposible: la barra
 * lateral media 256 px fijos y la bandeja sumaba dos columnas de 300 px.
 */

const BACKOFFICE_URL = process.env.BACKOFFICE_URL ?? 'http://localhost:5174';
const API_URL = process.env.API_URL ?? 'http://localhost:3000';

const TINY_PNG_DATA_URL =
  'data:image/png;base64,' +
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mP8' +
  'z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';

/** La bandeja puede estar vacia (el historico procesa todo): se crea el dato. */
async function crearReportePendiente(): Promise<number> {
  const api = await playwrightRequest.newContext({ baseURL: API_URL });
  const reporte = await api
    .post('/reportes', {
      data: {
        device_id: `e2e-responsive-${Date.now()}`,
        lat: -17.7833,
        lng: -63.1821,
        categoria_id: 1,
        gravedad: 'Media',
        imagen_base64: TINY_PNG_DATA_URL,
      },
    })
    .then((r) => r.json());
  await api.dispose();
  return reporte.id;
}

/** Anchos de los telefonos que la issue exige soportar. */
const ANCHOS = [375, 390, 428];

const CREDENCIALES = { email: 'moderador2@ojocamba.bo', password: 'mod123' };

async function ingresar(page: Page) {
  await page.goto(`${BACKOFFICE_URL}/login`);
  await page.getByPlaceholder('moderador@ojocamba.bo').fill(CREDENCIALES.email);
  await page.getByPlaceholder('••••••••').fill(CREDENCIALES.password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
}

/** Mide el desborde real del documento, que es lo que produce scroll lateral. */
async function desbordaHorizontal(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    // 1px de tolerancia por redondeos de layout.
    return doc.scrollWidth > doc.clientWidth + 1;
  });
}

test.describe('ISSUE-30 — Backoffice responsive', () => {
  for (const ancho of ANCHOS) {
    test(`la bandeja no desborda a ${ancho}px`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 844 });
      await ingresar(page);

      await expect(page.getByRole('heading', { name: 'Bandeja', level: 2 })).toBeVisible({ timeout: 10_000 });
      expect(await desbordaHorizontal(page)).toBe(false);
    });

    test(`el panel de navegacion se abre y cierra a ${ancho}px`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 844 });
      await ingresar(page);

      // El panel se esconde con translate, no con display: sigue en el DOM y
      // Playwright lo considera "visible". Lo que importa es donde esta.
      const panel = page.locator('aside');
      const bordeDerecho = async () => {
        const caja = await panel.boundingBox();
        return caja ? caja.x + caja.width : 0;
      };

      // Arranca fuera de pantalla por la izquierda.
      await expect.poll(bordeDerecho).toBeLessThanOrEqual(0);

      const abrir = page.getByRole('button', { name: 'Abrir menu' });
      await expect(abrir).toBeVisible();
      await abrir.click();

      await expect.poll(bordeDerecho).toBeGreaterThan(0);
      await expect(page.getByRole('link', { name: 'Bandeja' })).toBeVisible();
      // Abierto tampoco debe empujar el contenido y generar scroll lateral.
      expect(await desbordaHorizontal(page)).toBe(false);

      // El boton del propio panel, no el fondo oscuro: en 375px el panel tapa
      // el centro del overlay y el click quedaria interceptado.
      await panel.getByRole('button', { name: 'Cerrar menu' }).click();
      await expect.poll(bordeDerecho).toBeLessThanOrEqual(0);
    });
  }

  test('en movil el detalle ocupa la pantalla y se vuelve a la bandeja', async ({ page }) => {
    const reporteId = await crearReportePendiente();

    await page.setViewportSize({ width: 390, height: 844 });
    await ingresar(page);

    const tarjeta = page.locator(`[data-testid="report-card-${reporteId}"]`);
    await expect(tarjeta).toBeVisible({ timeout: 15_000 });
    await tarjeta.click();

    // El detalle reemplaza a la bandeja en lugar de convivir con ella.
    await expect(page.getByText('Inspección del Reporte')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Bandeja', level: 2 })).toBeHidden();
    expect(await desbordaHorizontal(page)).toBe(false);

    await page.getByRole('button', { name: 'Volver a la bandeja' }).click();
    await expect(page.getByRole('heading', { name: 'Bandeja', level: 2 })).toBeVisible();
  });

  test('en escritorio se conservan las tres columnas', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await ingresar(page);

    await expect(page.getByRole('heading', { name: 'Bandeja', level: 2 })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Contexto espacial' })).toBeVisible();
    // Sin boton de menu: la barra lateral esta fija.
    await expect(page.getByRole('button', { name: 'Abrir menu' })).toBeHidden();
    expect(await desbordaHorizontal(page)).toBe(false);
  });
});
