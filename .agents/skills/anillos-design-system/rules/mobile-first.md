# Regla: Mobile-First

## Principio
**Todo componente se diseña para mobile (375-428px) primero.** El escritorio es un afterthought.

## Breakpoints
| Nombre | Ancho | Uso |
|--------|-------|-----|
| Mobile | 375-428px | Diseño base, TODO empieza aquí |
| Tablet | 768px+ | `md:` — ajustes menores |
| Desktop | 1024px+ | `lg:` — máximo 1200px |

## Reglas obligatorias

### Viewport
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```

### Layout
- Ancho máximo de contenido: `max-w-sm md:max-w-xl lg:max-w-5xl mx-auto`
- Padding lateral: `px-4 md:px-6 lg:px-8`
- Espacio entre secciones: `py-12 md:py-24`
- **NO usar `w-[Xpx]` fijos** — usar `w-full`, `max-w-*`, o relativos

### Touch targets
- Botones: mínimo 44x44px (WCAG)
- Inputs: altura mínima 48px
- Espacio entre elementos interactivos: mínimo 8px

### Tipografía en mobile
- Headings: reducidos respecto a desktop (-20% aprox)
- Body: 14px base (no menor)
- Labels/captions: mínimo 10px

### Grid
- 1 columna en mobile por defecto
- 2 columnas en `md:`
- Máximo 3 columnas en `lg:`

## NO hacer
- ❌ Ocultar contenido en mobile ("versión desktop solamente")
- ❌ Usar `hover:` como única forma de revelar acciones (no existe en touch)
- ❌ Scroll horizontal
- ❌ Texto menor a 10px
