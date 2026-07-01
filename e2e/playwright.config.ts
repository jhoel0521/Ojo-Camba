import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '..');

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: 0,
  reporter: 'list',
  use: {
    headless: false,
    viewport: { width: 390, height: 844 },
    // app-reporte exige un user-agent movil real (react-device-detect isMobile) —
    // sin esto, el viewport angosto no basta y la app muestra "Solo disponible en movil".
    userAgent: devices['iPhone 13'].userAgent,
    locale: 'es-BO',
    timezoneId: 'America/La_Paz',
  },
  projects: [
    { name: 'chromium', use: { channel: 'chromium' } },
  ],

  // Inicia ambos frontends automáticamente antes de los tests.
  // REQUISITO: el backend (gateway-principal en :3000) debe estar corriendo.
  webServer: [
    {
      command: 'npm run dev',
      cwd: resolve(ROOT, 'frontend/app-reporte'),
      port: 5173,
      reuseExistingServer: true, // si ya está corriendo, no lo reinicia
      timeout: 30_000,
    },
    {
      command: 'npm run dev',
      cwd: resolve(ROOT, 'frontend/app-backoffice'),
      port: 5174,
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'npm run dev',
      cwd: resolve(ROOT, 'frontend/app-tecnico'),
      port: 5175,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
