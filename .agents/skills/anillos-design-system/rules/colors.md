# Regla: Paleta de Colores

## Principio
Solo usar tonos tierra cálidos. **NUNCA grises fríos o azulados.**

## Tokens de color

| Token CSS | Hex | Uso |
|-----------|-----|-----|
| `--color-catedral` | `#1b1410` | Fondos de botones primarios, texto en superficies claras |
| `--color-tierra` | `#2c221c` | Texto del cuerpo, navegación |
| `--color-ladrillo` | `#5e483a` | Bordes de botones, fondos de insignias oscuras |
| `--color-caoba` | `#8b7365` | Fondos de tarjetas medias en secciones oscuras |
| `--color-arena` | `#b5a498` | Texto silenciado, etiquetas de ayuda |
| `--color-almendra` | `#d2c8be` | Placeholder text, trazos decorativos |
| `--color-arcilla` | `#e3dbd3` | Divisores finos, bordes en tarjetas blancas |
| `--color-yeso` | `#efebe4` | Fondos de tarjetas (variante media) |
| `--color-lienzo` | `#f5f2eb` | Fondo de página principal |
| `--color-perla` | `#fffdfa` | Superficies de tarjetas blancas, inputs |
| `--color-sol-camba` | `#ff8c00` | **Solo** badges de estado destacado |
| `--color-rosa-toborochi` | `#ff66b2` | **Solo** acento decorativo de tarjetas |

## Superficies (jerarquía)

| Nivel | Clase Tailwind | Uso |
|-------|---------------|-----|
| 1 | `bg-lienzo` | Fondo de página |
| 2 | `bg-perla` | Tarjeta principal |
| 3 | `bg-yeso` | Tarjeta secundaria |
| 4 | `bg-catedral text-perla` | Sección oscura |

## Clases Tailwind
- `bg-catedral`, `text-catedral`, `border-catedral`
- `bg-tierra`, `text-tierra`
- `bg-ladrillo`, `text-ladrillo`, `border-ladrillo`
- `bg-caoba`, `text-caoba`
- `bg-arena`, `text-arena`
- `bg-almendra`, `text-almendra`
- `bg-arcilla`, `text-arcilla`, `border-arcilla`
- `bg-yeso`
- `bg-lienzo`
- `bg-perla`
- `bg-sol-camba`, `text-sol-camba`
- `bg-rosa-toborochi`
