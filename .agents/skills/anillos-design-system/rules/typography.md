# Regla: Tipografía

## Familia
**Solo Piraí Sans** (Montserrat como fallback). No usar otras familias tipográficas en ningún componente.

```css
font-family: 'Montserrat', 'Urbanist', ui-sans-serif, system-ui, sans-serif;
```

## Pesos disponibles
`font-light` (300), `font-normal` (400), `font-medium` (500), `font-semibold` (600), `font-bold` (700)

## Escala tipográfica

| Rol | Clase | Tamaño | Interlineado | Peso |
|-----|-------|--------|-------------|------|
| Caption | `text-[10px]` | 10px | 1.8 | medium |
| Body | `text-sm` (14px) | 14px | 1.56 | normal |
| Body Large | `text-base` (16px) | 16px | 1.5 | normal |
| Subheading | `text-lg` (18px) | 18px | 1.45 | medium |
| Heading Small | `text-xl` (20px) | 20px | 1.35 | semibold |
| Heading | `text-3xl` (32px) | 32px | 1.28 | semibold |
| Heading Large | `text-5xl` (40px) | 40px | 1.25 | bold |
| Display Small | `text-6xl` (56px) | 56px | 1.12 | light |
| Display | `text-7xl` (64px) | 64px | 1 | light |

## Reglas
- **NO usar** `font-serif` o `font-mono` excepto para datos técnicos (latencia, códigos)
- **NO usar** `italic` excepto en citas testimoniales
- Usar `tracking-normal` en todos los tamaños
