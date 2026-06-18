# Regla: Componentes

## Botón Primario "Anillo"
```html
<button class="bg-catedral text-perla font-medium text-sm px-8 py-3.5 rounded-[36px] shadow-md">
  Comenzar
</button>
```
- Fondo `bg-catedral`, texto `text-perla`
- Piraí Sans 14px peso 500
- Border-radius 36px (pill-like)
- Sombra cálida multicapa

## Botón Secundario Claro
```html
<button class="bg-perla text-ladrillo border border-ladrillo font-medium text-sm px-8 py-3.5 rounded-[36px]">
  Cancelar
</button>
```

## Tarjeta "Patio"
```html
<div class="bg-perla rounded-[36px] p-8">
  <!-- contenido -->
</div>
```
- Fondo Perla, sin sombra (flat)
- 36px border-radius
- Padding 28-32px

## Panel Oscuro "Surazo"
```html
<section class="bg-catedral text-perla rounded-[36px] p-12">
  <h2 class="font-semibold text-3xl">Título</h2>
  <p class="font-light text-lg">Descripción</p>
</section>
```

## Insignia "Sol Camba" / "Toborochi"
```html
<span class="bg-sol-camba text-perla text-[10px] font-semibold px-2.5 py-1 rounded-xl">
  Destacado
</span>
```
- **Solo usar en badges de estado o destaques**
- **NUNCA para estados genéricos** (usar Ladrillo o Arena para esos)
- Rosa Toborochi: uso exclusivo como fondo decorativo de tarjetas grandes

## Input / Formularios
```html
<input class="bg-perla border border-arcilla rounded-[36px] px-5 py-3.5 text-sm text-tierra placeholder:text-almendra w-full" />
```
- Fondo Perla con borde Arcilla
- 36px border-radius
- Placeholder en Almendra

## Badges de estado (reportes)
| Estado | Color |
|--------|-------|
| Reportado | `bg-arena text-perla` |
| Aceptado | `bg-sol-camba text-perla` |
| En Trabajo | `bg-caoba text-perla` |
| Finalizado | `bg-ladrillo text-perla` |
| Rechazado | `bg-catedral text-arena` |

## Sombras
- **NO usar** `shadow-lg` o `shadow-xl` con negro puro
- Solo usar `shadow-md` con tintes de Catedral
- La profundidad se expresa con capas de color (Lienzo → Perla → Yeso)
