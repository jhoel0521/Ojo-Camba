import { test, expect, request as playwrightRequest } from '@playwright/test';

const TECNICO_URL = process.env.TECNICO_URL ?? 'http://localhost:5175';
const API_URL = process.env.API_URL ?? 'http://localhost:3000';

const TECNICO_EMAIL = 'admin@ojocamba.bo';
const TECNICO_PASSWORD = 'admin123';

// Santa Cruz de la Sierra (origen del caso)
const ORIGEN = { lat: -17.7833, lng: -63.1821 };
// Coordenada "real" capturada en terreno por el tecnico (corregida ~120 m)
const CORRECCION = { latitude: -17.7844, longitude: -63.1825, accuracy: 8 };

const TINY_PNG_DATA_URL =
  'data:image/png;base64,' +
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mP8' +
  'z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';

/**
 * Crea un Caso de Obra (grupo) via API para que el tecnico tenga algo
 * sobre lo que registrar avances. Devuelve { id, codigo_obra }.
 */
async function seedCasoDeObra(): Promise<{ id: number; codigo_obra: string }> {
  const api = await playwrightRequest.newContext({ baseURL: API_URL });

  const login = await api
    .post('/auth/login', { data: { email: TECNICO_EMAIL, password: TECNICO_PASSWORD } })
    .then((r) => r.json());
  const usuarioId = login.user.id;

  const deviceId = `e2e-tecnico-${Date.now()}`;
  const [r1, r2] = await Promise.all([
    api
      .post('/reportes', {
        data: {
          device_id: deviceId,
          lat: ORIGEN.lat,
          lng: ORIGEN.lng,
          categoria_id: 1,
          imagen_base64: TINY_PNG_DATA_URL,
        },
      })
      .then((r) => r.json()),
    api
      .post('/reportes', {
        data: {
          device_id: deviceId,
          lat: ORIGEN.lat - 0.0001,
          lng: ORIGEN.lng,
          categoria_id: 1,
          imagen_base64: TINY_PNG_DATA_URL,
        },
      })
      .then((r) => r.json()),
  ]);

  const grupo = await api
    .post('/admin/groups', {
      data: { report_ids: [r1.id, r2.id], creado_por_usuario_id: usuarioId },
    })
    .then((r) => r.json());

  await api.dispose();
  return { id: grupo.id, codigo_obra: grupo.codigo_obra };
}

test.describe('App Tecnicos: bitacora diaria y correccion GPS (ISSUE-16 / HU-05)', () => {
  test('el tecnico registra un avance con GPS sin cambiar el estado del caso', async ({
    page,
    context,
  }) => {
    const caso = await seedCasoDeObra();

    await context.grantPermissions(['geolocation']);
    await context.setGeolocation(CORRECCION);

    // ── Login ────────────────────────────────────────────────────────────────
    await page.goto(`${TECNICO_URL}/login`);
    await page.getByPlaceholder('tecnico@ojocamba.bo').fill(TECNICO_EMAIL);
    await page.getByPlaceholder('********').fill(TECNICO_PASSWORD);
    await page.getByRole('button', { name: 'Ingresar' }).click();

    // ── Lista de casos → abrir el caso sembrado ──────────────────────────────
    await expect(page).toHaveURL(`${TECNICO_URL}/`, { timeout: 10_000 });
    await page.getByText(caso.codigo_obra).click();

    await expect(page.getByTestId('caso-detalle')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('codigo-obra')).toHaveText(caso.codigo_obra);

    // Estado inicial del caso = "Aceptado" (lo deja createGroup)
    await expect(page.getByText('Aceptado').first()).toBeVisible();

    // ── Registrar avance diario ──────────────────────────────────────────────
    const comentario = `Avance de obra E2E ${Date.now()}`;
    await page.locator('#comentario').fill(comentario);
    await page.locator('#recursos_solicitados').fill('Cemento y 2 obreros');

    // ── Captura GPS (correccion en terreno) ──────────────────────────────────
    await page.getByTestId('btn-gps').click();
    await expect(page.getByTestId('gps-fix')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('gps-fix')).toContainText('-17.78');

    // ── Enviar ───────────────────────────────────────────────────────────────
    await page.getByTestId('btn-enviar').click();
    await expect(page.getByTestId('success-msg')).toBeVisible({ timeout: 10_000 });

    // ── Verificar que aparece en la bitacora ─────────────────────────────────
    const timeline = page.getByTestId('timeline');
    await expect(timeline).toBeVisible();
    await expect(timeline.getByText(comentario)).toBeVisible();
    await expect(timeline.getByText('Cemento y 2 obreros')).toBeVisible();

    // ── El estado del caso NO cambio (sigue "Aceptado") ──────────────────────
    await expect(page.getByText('Aceptado').first()).toBeVisible();

    // Confirmacion via API: la ultima actualizacion no transiciono el estado
    const api = await playwrightRequest.newContext({ baseURL: API_URL });
    const timelineData = await api.get(`/admin/groups/${caso.id}/timeline`).then((r) => r.json());
    const ultima = timelineData[0];
    expect(ultima.comentario).toBe(comentario);
    expect(ultima.estado_nuevo).toBeNull();
    expect(ultima.lat_actualizada).not.toBeNull();
    expect(ultima.lng_actualizada).not.toBeNull();
    await api.dispose();
  });
});
