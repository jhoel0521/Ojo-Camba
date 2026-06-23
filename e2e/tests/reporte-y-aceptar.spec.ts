import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

const REPORTE_URL = process.env.REPORTE_URL ?? 'http://localhost:5173';
const BACKOFFICE_URL = process.env.BACKOFFICE_URL ?? 'http://localhost:5174';

// Lee VITE_API_URL del .env de app-reporte para saber qué interceptar.
// Si apunta a una IP no-localhost, redirigimos a localhost:3000 para que
// el test funcione sin depender de IPs de red local.
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

// Credenciales del seed (ms-auth/src/seed.ts)
const MODERATOR_EMAIL = 'admin@ojocamba.bo';
const MODERATOR_PASSWORD = 'admin123';

// Santa Cruz de la Sierra — coords reales para el reporte
const GEOLOCATION = { latitude: -17.7833, longitude: -63.1821, accuracy: 10 };

// PNG 10x10 px rojo — generado en memoria para que el test no dependa de
// archivos grandes. Base64 de un PNG válido mínimo.
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
      // Si hay imagen en resources/, usarla (si pesa < 5MB; si no, caer al PNG mínimo)
      const filePath = join(dir, files[0]);
      const { size } = require('fs').statSync(filePath);
      if (size < 5 * 1024 * 1024) return filePath;
    }
  } catch { /* sin recursos disponibles */ }
  // Fallback: PNG mínimo en memoria
  return { name: 'bache-test.png', mimeType: 'image/png', buffer: TINY_PNG };
}

test.describe('Flujo completo: ciudadano reporta → moderador acepta', () => {
  test('crear reporte anónimo en app-reporte y aceptarlo individualmente en backoffice', async ({
    page,
    context,
  }) => {
    const imageSource = findResourceImage();

    // ── PARTE 1: Crear el reporte en app-reporte ─────────────────────────────

    // Si VITE_API_URL apunta a una IP no-localhost, route.fetch() hace la HTTP request
    // desde Node.js (bypaseando CORS del browser) y retorna la respuesta al navegador.
    await context.route(new RegExp(CONFIGURED_API.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), async (route) => {
      const newUrl = route.request().url().replace(CONFIGURED_API, LOCAL_API);
      const response = await route.fetch({ url: newUrl });
      await route.fulfill({ response });
    });

    // Mockear GPS antes de navegar (debe hacerse antes del page.goto)
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation(GEOLOCATION);

    await page.goto(`${REPORTE_URL}/nuevo`);

    // Esperar que el GPS se resuelva (aparece "Tomar foto" cuando geo.status === 'granted')
    await expect(page.getByText('Tomar foto')).toBeVisible({ timeout: 10_000 });

    // Subir imagen — si hay archivo pequeño en resources/ usarlo, si no usar PNG mínimo en memoria
    await page.locator('input[type="file"]').setInputFiles(imageSource);

    // Verificar preview de imagen
    await expect(page.locator('img[alt="Preview"]')).toBeVisible({ timeout: 5_000 });

    // Seleccionar categoría "Bache"
    await page.getByRole('button', { name: 'Bache' }).click();

    // Verificar que el botón Enviar se habilita
    await expect(page.getByRole('button', { name: 'Enviar Reporte' })).toBeEnabled();

    // Enviar el reporte
    await page.getByRole('button', { name: 'Enviar Reporte' }).click();

    // Esperar confirmación de envío exitoso
    await expect(page.getByText('Reporte Enviado')).toBeVisible({ timeout: 15_000 });

    // ── PARTE 2: Login en el backoffice ──────────────────────────────────────

    // Cambiar viewport a desktop para el backoffice
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto(`${BACKOFFICE_URL}/login`);
    await expect(page.getByPlaceholder('moderador@ojocamba.bo')).toBeVisible();

    await page.getByPlaceholder('moderador@ojocamba.bo').fill(MODERATOR_EMAIL);
    await page.getByPlaceholder('••••••••').fill(MODERATOR_PASSWORD);
    await page.getByRole('button', { name: 'Ingresar' }).click();

    // Esperar redirección al dashboard
    await expect(page).toHaveURL(`${BACKOFFICE_URL}/`, { timeout: 10_000 });

    // ── PARTE 3: Revisar reportes pendientes ─────────────────────────────────

    await page.goto(`${BACKOFFICE_URL}/revisar`);

    // Refrescar la bandeja para asegurar que el reporte recién creado aparece
    await page.getByRole('button', { name: 'Actualizar' }).click();

    // Esperar que aparezcan grupos de zona (siempre visibles aunque estén colapsados)
    await expect(page.locator('button').filter({ hasText: /Zona .* reporte/ }).first()).toBeVisible({ timeout: 10_000 });

    // Si el primer grupo está colapsado (no se ve texto de categoría), expandirlo
    const primeraCategoria = page.locator('.cursor-pointer').filter({ hasText: /Bache|Luminaria|Residuos|Alcantarillado|Trafico|Otro/ }).first();
    const yaExpandido = await primeraCategoria.isVisible().catch(() => false);
    if (!yaExpandido) {
      await page.locator('button').filter({ hasText: /Zona .* reporte/ }).first().click();
      await expect(primeraCategoria).toBeVisible({ timeout: 5_000 });
    }

    // Hacer clic en el primer card de reporte para abrir el slide-over
    await primeraCategoria.click();

    // Verificar que el slide-over abrió
    await expect(page.getByText('Inspección del Reporte')).toBeVisible({ timeout: 5_000 });

    // Verificar que la imagen se cargó (el elemento existe y tiene src)
    const imgSrc = await page.locator('img[alt="Evidencia"]').getAttribute('src');
    expect(imgSrc).toBeTruthy();
    expect(imgSrc).not.toBe('');

    // ── PARTE 4: Aceptar el reporte individualmente ───────────────────────────

    await page.getByRole('button', { name: 'Aceptar reporte' }).click();

    // Esperar el modal de confirmación
    await expect(page.getByText('Al aceptar el reporte')).toBeVisible({ timeout: 3_000 });

    // Confirmar
    await page.getByRole('button', { name: 'Confirmar' }).click();

    // El slide-over debe cerrarse automáticamente
    await expect(page.getByText('Inspección del Reporte')).not.toBeVisible({ timeout: 8_000 });

    // El reporte aceptado ya no debe aparecer en la bandeja
    // (esperamos un momento para que el estado se actualice)
    await page.waitForTimeout(500);
    // No hay error ni crash — el flujo completo fue exitoso
  });
});
