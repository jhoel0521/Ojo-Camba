---
name: anillos-design-system
description: Sistema de diseño Anillos para Ojo Camba. Paleta tropical cruceña, tipografía Piraí Sans, radios de borde extremos (36px), componentes mobile-first. Usar SIEMPRE al crear cualquier UI en los frontends.
version: 1.0.0
---

# Sistema de Diseño Anillos — Ojo Camba

Sistema de diseño inspirado en Santa Cruz de la Sierra. Paleta cálida de tonos tierra, tipografía Piraí Sans, y radios de borde de 36px que evocan los anillos concéntricos de la ciudad.

## Cuándo usar esta skill

- **SIEMPRE** al crear o modificar cualquier componente UI en los 4 frontends
- Al definir colores, tipografía, espaciado o bordes
- Al crear formularios, tarjetas, botones, badges
- Al revisar PRs de frontend

## Reglas activas

Ver la carpeta `rules/` para reglas detalladas de:
- `colors.md` — Paleta de colores y tokens
- `typography.md` — Escala tipográfica Piraí Sans
- `components.md` — Componentes y sus estilos
- `mobile-first.md` — Enfoque mobile-first obligatorio

## Principios

1. **Radios extremos**: 36px para tarjetas, 48px hero, pill para botones
2. **Colores cálidos**: Solo tonos tierra, nunca grises fríos
3. **Espacios abiertos**: Mínimo 96px entre secciones, padding generoso
4. **Acentos escasos**: Sol Camba (#ff8c00) y Rosa Toborochi (#ff66b2) solo para badges/destaques
5. **Mobile-first**: Todo se diseña para 375-428px primero, luego escala up

## Tailwind Config

```css
@import "tailwindcss";

@theme {
  --color-catedral: #1b1410;
  --color-tierra: #2c221c;
  --color-ladrillo: #5e483a;
  --color-caoba: #8b7365;
  --color-arena: #b5a498;
  --color-almendra: #d2c8be;
  --color-arcilla: #e3dbd3;
  --color-yeso: #efebe4;
  --color-lienzo: #f5f2eb;
  --color-perla: #fffdfa;
  --color-sol-camba: #ff8c00;
  --color-rosa-toborochi: #ff66b2;
  --font-pirai: 'Montserrat', 'Urbanist', ui-sans-serif, system-ui, sans-serif;
  --radius-3xl-2: 28px;
  --radius-3xl-3: 36px;
  --radius-hero: 48px;
  --radius-pill: 10000px;
}
```
