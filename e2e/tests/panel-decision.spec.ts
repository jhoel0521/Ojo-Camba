import { test, expect, type Page } from '@playwright/test';

/**
 * ISSUE-32 — panel de decision: actual vs. prediccion.
 *
 * Cubre los criterios que solo se pueden comprobar en el navegador: que una
 * estimacion nunca se presente como observacion, que la autoridad municipal no
 * llegue a las acciones operativas, que los filtros y el detalle por zona
 * funcionen, y que en movil las secciones sean pestanas sin scroll horizontal.
 *
 * REQUISITO: gateway-principal en :3000, app-backoffice en :5174 y el seed de
 * auth aplicado (`pnpm db:seed:auth`). El panel funciona aunque nadie haya
 * entrenado el modelo: en ese caso solo se ve el lado observado, y eso tambien
 * se prueba aca.
 */

const BACKOFFICE_URL = process.env.BACKOFFICE_URL ?? 'http://localhost:5174';

const COORDINADOR = { email: 'coordinador@ojocamba.bo', password: 'coord123' };
const AUTORIDAD = { email: 'autoridad@ojocamba.bo', password: 'autoridad123' };
const BACKOFFICE = { email: 'moderador2@ojocamba.bo', password: 'mod123' };

async function ingresar(page: Page, { email, password }: { email: string; password: string }) {
  await page.goto(`${BACKOFFICE_URL}/login`);
  await page.getByPlaceholder('moderador@ojocamba.bo').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
}

async function abrirPanel(page: Page, credenciales: { email: string; password: string }) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await ingresar(page, credenciales);
  await page.goto(`${BACKOFFICE_URL}/prediccion`);
  await expect(page.getByRole('heading', { name: 'Panel de decision' })).toBeVisible({
    timeout: 15_000,
  });
}

test.describe('ISSUE-32 — distincion entre lo observado y lo estimado', () => {
  test('cada cifra dice de donde viene', async ({ page }) => {
    await abrirPanel(page, COORDINADOR);

    // El criterio 1 pide etiquetas explicitas, no solo un color distinto.
    await expect(page.getByText('Observado').first()).toBeVisible();
    await expect(page.getByText('Estimacion del modelo').first()).toBeVisible();
  });

  test('avisa cuando no hay modelo en vez de mostrar ceros como pronostico', async ({ page }) => {
    await abrirPanel(page, COORDINADOR);

    const sinModelo = page.getByText(/Se muestra solo lo observado/);
    const conModelo = page.getByText(/dataset/).first();
    // Una de las dos: o hay pronostico con su version, o se explica que no hay.
    await expect(sinModelo.or(conModelo).first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('ISSUE-32 — permisos del panel', () => {
  test('la autoridad municipal consulta pero no opera', async ({ page }) => {
    await abrirPanel(page, AUTORIDAD);

    await expect(page.getByRole('heading', { name: 'Resumen ejecutivo' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Actual vs. prediccion' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Historial y precision' })).toBeVisible();

    // La seccion accionable no existe para este perfil, ni su boton.
    await expect(page.getByRole('heading', { name: 'Capacidad y acciones' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Decidir' })).toHaveCount(0);
  });

  test('el coordinador si ve la seccion accionable', async ({ page }) => {
    await abrirPanel(page, COORDINADOR);

    await expect(page.getByRole('heading', { name: 'Capacidad y acciones' })).toBeVisible();
  });

  test('backoffice no entra al panel ni escribiendo la URL', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await ingresar(page, BACKOFFICE);

    await page.goto(`${BACKOFFICE_URL}/prediccion`);

    await expect(page.getByText('Sin permiso para esta seccion')).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('ISSUE-32 — mapa, filtros y detalle por zona', () => {
  test('las capas del mapa se pueden alternar', async ({ page }) => {
    await abrirPanel(page, COORDINADOR);

    for (const capa of ['Observado', 'Estimado', 'Diferencia']) {
      const boton = page.getByRole('button', { name: capa, exact: true });
      await boton.click();
      await expect(boton).toHaveAttribute('aria-pressed', 'true');
    }
  });

  test('el filtro de categoria se aplica sin recargar la pagina', async ({ page }) => {
    await abrirPanel(page, COORDINADOR);

    await page.getByLabel('Categoria').selectOption('1');
    await expect(page.getByLabel('Categoria')).toHaveValue('1');
    await expect(page.getByRole('heading', { name: 'Panel de decision' })).toBeVisible();
  });

  test('sin zona elegida invita a elegir una', async ({ page }) => {
    await abrirPanel(page, COORDINADOR);

    await expect(page.getByText(/Toc(a|á) una zona del mapa/)).toBeVisible();
  });
});

test.describe('ISSUE-32 — la decision queda justificada', () => {
  test('no se puede registrar una decision sin motivo suficiente', async ({ page }) => {
    await abrirPanel(page, COORDINADOR);

    const decidir = page.getByRole('button', { name: 'Decidir' }).first();
    // Sin alertas vigentes no hay nada que decidir: el criterio se prueba solo
    // cuando el modelo genero al menos una recomendacion critica.
    test.skip((await decidir.count()) === 0, 'No hay alertas criticas en este entorno.');

    await decidir.click();
    const registrar = page.getByRole('button', { name: 'Registrar decision' });
    await expect(registrar).toBeDisabled();

    await page.getByRole('textbox').fill('corto');
    await expect(registrar).toBeDisabled();

    await page
      .getByRole('textbox')
      .fill('Se refuerza con la cuadrilla 3, que termina su obra el martes.');
    await expect(registrar).toBeEnabled();

    // El panel deja constancia; no mueve cuadrillas.
    await expect(page.getByText(/no asigna ni reasigna cuadrillas/)).toBeVisible();
  });
});

test.describe('ISSUE-32 — el panel se opera desde un telefono', () => {
  for (const ancho of [375, 390, 428]) {
    test(`a ${ancho}px las secciones son pestanas y no hay scroll horizontal`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 780 });
      await ingresar(page, COORDINADOR);
      await page.goto(`${BACKOFFICE_URL}/prediccion`);
      await expect(page.getByRole('heading', { name: 'Panel de decision' })).toBeVisible({
        timeout: 15_000,
      });

      const pestanas = page.getByRole('navigation', { name: 'Secciones del panel' });
      await expect(pestanas).toBeVisible();

      // Cambiar de pestana no pierde el contexto: el encabezado sigue ahi.
      await page.getByRole('button', { name: 'Historial y precision' }).click();
      await expect(page.getByRole('heading', { name: 'Historial y precision' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Panel de decision' })).toBeVisible();

      const desbordaX = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(desbordaX).toBe(false);
    });
  }
});
