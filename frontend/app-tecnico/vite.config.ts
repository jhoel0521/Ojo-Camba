import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // El motor de ruta de @ojo-camba/common es TypeScript puro sin dependencias.
  // Se apunta el subpath al fuente .ts (esbuild lo compila directo) para evitar
  // el problema de interop de named exports de rollup con el dist CommonJS de un
  // paquete de workspace linkeado. Los tipos igual salen del `exports` del paquete.
  resolve: {
    alias: {
      '@ojo-camba/common/motor/ruta': fileURLToPath(
        new URL('../../libs/common/src/motor/ruta.ts', import.meta.url),
      ),
    },
  },
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Ojo Camba - Tecnicos',
        short_name: 'OC Tecnico',
        description: 'App para tecnicos en campo: bitacora y avances de obras',
        theme_color: '#388e3c',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  server: { port: 5175 },
});
