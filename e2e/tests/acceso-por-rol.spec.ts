import { test, expect, type Page } from '@playwright/test';

/**
 * ISSUE-30 — entrada y navegacion por rol en el backoffice.
 *
 * Cubre los dos criterios de aceptacion que no dependen del ciclo de Casos de
 * #74: cada perfil aterriza en su area, quien tiene varios roles elige, y una
 * URL sin permiso no se abre aunque se escriba a mano.
 *
 * REQUISITO: gateway-principal en :3000 con el seed de auth aplicado
 * (`pnpm db:seed:auth` crea los seis usuarios que se usan aca).
 */

const BACKOFFICE_URL = process.env.BACKOFFICE_URL ?? 'http://localhost:5174';

interface Perfil {
  rol: string;
  email: string;
  password: string;
  /** Donde debe aterrizar al iniciar sesion. */
  areaInicial: string;
  /** Entradas del menu lateral que le corresponden. */
  menu: string[];
  /** Ruta que su rol NO puede abrir. */
  rutaProhibida: string;
}

const PERFILES: Perfil[] = [
  {
    rol: 'backoffice',
    email: 'moderador2@ojocamba.bo',
    password: 'mod123',
    areaInicial: '/revisar',
    menu: ['Bandeja'],
    rutaProhibida: '/accesos',
  },
  {
    rol: 'coordinador_operativo',
    email: 'coordinador@ojocamba.bo',
    password: 'coord123',
    areaInicial: '/casos',
    menu: ['Panel estrategico', 'Casos'],
    rutaProhibida: '/revisar',
  },
  {
    rol: 'encargado_it',
    email: 'it@ojocamba.bo',
    password: 'it123',
    areaInicial: '/accesos',
    menu: ['Panel estrategico', 'Accesos y cuadrillas', 'IA y respaldos'],
    rutaProhibida: '/revisar',
  },
  {
    rol: 'autoridad_municipal',
    email: 'autoridad@ojocamba.bo',
    password: 'autoridad123',
    areaInicial: '/',
    menu: ['Panel estrategico'],
    rutaProhibida: '/accesos',
  },
];

/** Cuenta con varios roles: debe elegir area en vez de aterrizar en una. */
const MULTIROL = { email: 'admin@ojocamba.bo', password: 'admin123' };

async function ingresar(page: Page, email: string, password: string) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${BACKOFFICE_URL}/login`);
  await page.getByPlaceholder('moderador@ojocamba.bo').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
}

const rutaActual = (page: Page) => new URL(page.url()).pathname;

test.describe('ISSUE-30 — acceso por rol', () => {
  for (const perfil of PERFILES) {
    test(`${perfil.rol} aterriza en su area y solo ve su menu`, async ({ page }) => {
      await ingresar(page, perfil.email, perfil.password);

      expect(rutaActual(page)).toBe(perfil.areaInicial);

      await expect(page.locator('aside a').first()).toBeVisible({ timeout: 10_000 });
      const menu = await page.locator('aside a').allInnerTexts();
      expect(menu.map((t) => t.trim())).toEqual(perfil.menu);
    });

    test(`${perfil.rol} no entra por URL directa a ${perfil.rutaProhibida}`, async ({ page }) => {
      await ingresar(page, perfil.email, perfil.password);

      await page.goto(`${BACKOFFICE_URL}${perfil.rutaProhibida}`);

      // No alcanza con que no se vea el contenido: tiene que decir por que.
      await expect(page.getByText('Sin permiso para esta seccion')).toBeVisible({
        timeout: 10_000,
      });
    });
  }

  test('una cuenta con varios roles elige area y la eleccion se recuerda', async ({ page }) => {
    await ingresar(page, MULTIROL.email, MULTIROL.password);

    // Con mas de un area no se elige por el usuario: se le pregunta.
    expect(rutaActual(page)).toBe('/areas');
    await expect(page.getByText('Elegi tu area de trabajo')).toBeVisible();

    await page.getByRole('button', { name: /Bandeja prioritaria/ }).click();
    await expect(page).toHaveURL(`${BACKOFFICE_URL}/revisar`, { timeout: 10_000 });

    // Al volver a entrar arranca en la ultima area elegida, sin preguntar.
    await page.goto(`${BACKOFFICE_URL}/login`);
    await ingresar(page, MULTIROL.email, MULTIROL.password);
    expect(rutaActual(page)).toBe('/revisar');

    // Y puede cambiarla desde el menu.
    await page.getByRole('link', { name: 'Cambiar de area' }).click();
    await expect(page).toHaveURL(`${BACKOFFICE_URL}/areas`, { timeout: 10_000 });
  });

  test('la sesion sin area asignada no entra al backoffice', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BACKOFFICE_URL}/login`);
    await page.getByPlaceholder('moderador@ojocamba.bo').fill('tecnico@ojocamba.bo');
    await page.getByPlaceholder('••••••••').fill('tec123');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    // El tecnico de campo trabaja en app-tecnico: aca no tiene area.
    await expect(page.getByText(/no tiene un area asignada/i)).toBeVisible({ timeout: 10_000 });
    expect(rutaActual(page)).toBe('/login');
  });
});
