# Regla: PWA y Offline

## Instalación como PWA
- La app debe ser instalable en Android e iOS
- Mostrar prompt "Agregar a pantalla de inicio" usando `beforeinstallprompt`
- Íconos: 192x192 y 512x512 (generar con el color de tema `#1a73e8`)

## Offline First
- La app debe funcionar sin conexión
- Los reportes se encolan en `localStorage` si no hay conexión
- Al recuperar conexión, se envían automáticamente

### Estrategia de caché (Workbox)
```typescript
// vite.config.ts PWA config adicional
workbox: {
  runtimeCaching: [
    {
      urlPattern: /^https?:\/\/.*\/reportes\/heatmap/,
      handler: 'NetworkFirst',
      options: { cacheName: 'heatmap-cache', expiration: { maxEntries: 5, maxAgeSeconds: 300 } }
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
      handler: 'CacheFirst',
      options: { cacheName: 'image-cache', expiration: { maxEntries: 50, maxAgeSeconds: 86400 } }
    }
  ]
}
```

## Service Worker
- `registerType: 'autoUpdate'` — actualizar automáticamente
- Mostrar toast "Nueva versión disponible" cuando se actualice
- Recargar la app después de instalar el nuevo SW

## Íconos requeridos
```
public/icons/
├── icon-72.png
├── icon-96.png
├── icon-128.png
├── icon-144.png
├── icon-152.png
├── icon-180.png    (Apple touch icon)
├── icon-192.png    (Android)
├── icon-384.png
├── icon-512.png    (Android + splash)
```

## Manifest adicional
```json
{
  "lang": "es-BO",
  "dir": "ltr",
  "orientation": "portrait-primary",
  "categories": ["utilities", "lifestyle"],
  "screenshots": [],
  "prefer_related_applications": false
}
```
