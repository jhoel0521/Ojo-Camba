---
name: app-reporte
description: Reglas obligatorias para el frontend app-reporte (PWA ciudadana). 100% mobile-first, requiere cámara + GPS activados. No se puede enviar un reporte sin foto y ubicación.
version: 1.0.0
---

# App de Reporte Ciudadano — Reglas

La app principal de Ojo Camba. Permite a ciudadanos reportar problemas urbanos con foto y GPS.

## Cuándo usar esta skill

- **SIEMPRE** al trabajar en `frontend/app-reporte/`
- Al modificar el formulario de reporte
- Al tocar la integración con cámara o GPS
- Al modificar la configuración PWA

## Reglas activas

Ver `rules/`:
- `mobile-first.md` — Diseño exclusivo para celular
- `camera-gps.md` — Requisitos de cámara y ubicación
- `pwa-offline.md` — Funcionamiento offline y PWA

## Flujo del ciudadano

```
1. Abre la app (PWA instalada o browser)
2. La app solicita permiso de ubicación (obligatorio)
3. Mapa muestra heatmap de reportes cercanos (H3 res 8)
4. Botón "+" flotante abre el formulario
5. Cámara: tomar foto o seleccionar de galería
6. Seleccionar categoría (bache, luminaria, residuos...)
7. GPS: ya capturado automáticamente
8. Enviar → POST /reportes vía gateway-principal
9. Confirmación con animación
```
