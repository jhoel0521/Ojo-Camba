# Sistema de Diseño: Anillos — Guía de Estilo

> Un mercado tropical bañado por el sol — una galería tallada en tarjetas blancas y terracota sobre un lienzo color crema, donde los bordes profundamente redondeados (inspirados en los anillos de la ciudad) y una tipografía geométrica y cálida hacen todo el trabajo expresivo.

**Tema:** Cálido / Tropical Moderno

El sistema *Anillos* opera sobre un lienzo color crema y tonos tierra oscuros con máxima redondez — las tarjetas de 36px y los contenedores en forma de píldora dominan cada superficie, creando una tensión suave y accesible contra los rellenos muy oscuros (`#1b1410`) usados para las acciones primarias. La escala neutral es densa y gradual (tonos arena hasta café profundo), pero solo 3-4 pasos aparecen en cualquier vista única, manteniendo un alto contraste sin complejidad. La única tipografía personalizada, **Piraí Sans**, abarca todo el sistema desde etiquetas de 10px hasta titulares de 64px. El color de acento está casi ausente en la capa de la interfaz de usuario: un naranja cálido radiante (`#ff8c00`) surge solo en etiquetas de estado, y el rosa vibrante (`#ff66b2`) inspirado en el Toborochi es un baño de color decorativo único — la moderación del sistema hace que estos momentos destaquen con fuerza.

---

## Tokens — Colores

| Nombre | Valor | Token CSS | Rol |
|------|-------|-------|------|
| Catedral | `#1b1410` | `--color-catedral` | Fondos de botones primarios, texto de encabezado en superficies claras — el ancla oscura del sistema, un café-casi-negro cálido inspirado en las sombras de la Catedral |
| Tierra | `#2c221c` | `--color-tierra` | Texto del cuerpo, texto de navegación, texto de insignias — un tono más claro que Catedral, usado para lectura cómoda |
| Ladrillo | `#5e483a` | `--color-ladrillo` | Bordes de botones, fondos de insignias oscuras, trazos de bordes — el tono de borde dominante, inspirado en la arquitectura tradicional cruceña |
| Caoba | `#8b7365` | `--color-caoba` | Fondos de tarjetas medias en secciones oscuras, rellenos sutiles de iconos |
| Arena | `#b5a498` | `--color-arena` | Texto silenciado, etiquetas de texto de ayuda o estadísticas, badge "Reportado" |
| Almendra | `#d2c8be` | `--color-almendra` | Variantes de encabezado atenuadas, texto de marcador de posición (placeholder), trazos decorativos |
| Arcilla | `#e3dbd3` | `--color-arcilla` | Divisores finos, fondos de enlaces inactivos, el borde visible más claro en tarjetas blancas |
| Yeso | `#efebe4` | `--color-yeso` | Fondos de tarjetas (variante media), bordes de insignias — el segundo paso de superficie sobre el lienzo |
| Lienzo | `#f5f2eb` | `--color-lienzo` | El lienzo de la página, fondos claros, superficie de hover — el tono de fondo dominante, un crema cálido y transpirable |
| Perla | `#fffdfa` | `--color-perla` | Superficies de tarjetas blancas, fondos de inputs — la superficie más brillante y limpia, con un levísimo tinte cálido |
| Sol Camba | `#ff8c00` | `--color-sol-camba` | Fondos de insignias de destaque — un naranja vibrante que señala innovación y energía, aparece solo en etiquetas pequeñas |
| Rosa Toborochi | `#ff66b2` | `--color-rosa-toborochi` | Acento decorativo — un rosa fucsia vibrante de uso único en fondos de tarjetas grandes para puntuar la cuadrícula |

---

## Tokens — Tipografía

### Piraí Sans — La única tipografía de todo el sistema

Cada insignia, botón, enlace y encabezado usa Piraí Sans. Su amplio rango de pesos significa que toda la jerarquía se impulsa por el peso en lugar de cambiar de familia. A 56–64px los pesos ligeros a medios se sienten asertivos pero amigables; a 10–14px los pesos medios a semibold mantienen las etiquetas legibles.

- **Token CSS:** `--font-pirai`
- **Sustitutos:** Montserrat, Urbanist, Plus Jakarta Sans
- **Pesos:** 300, 400, 500, 600, 700
- **Tamaños:** 10px, 12px, 13px, 14px, 15px, 16px, 18px, 20px, 32px, 40px, 56px, 64px
- **Interlineado:** 1.0–1.8 (más ajustado en tamaños de display ~1.0–1.12, más suelto en cuerpo para respirar ~1.5–1.7)
- **Espaciado de letras:** Normal en todos los tamaños

### Escala Tipográfica

| Rol | Tamaño | Interlineado | Token |
|------|------|-------------|-------|
| caption | 10px | 1.8 | `--text-caption` |
| body | 14px | 1.56 | `--text-body` |
| body-lg | 16px | 1.5 | `--text-body-lg` |
| subheading | 18px | 1.45 | `--text-subheading` |
| heading-sm | 20px | 1.35 | `--text-heading-sm` |
| heading | 32px | 1.28 | `--text-heading` |
| heading-lg | 40px | 1.25 | `--text-heading-lg` |
| display-sm | 56px | 1.12 | `--text-display-sm` |
| display | 64px | 1 | `--text-display` |

---

## Tokens — Espaciado y Formas

**Unidad base:** 4px
**Densidad:** Transpirable (reflejando los espacios abiertos y ventilados del clima tropical)

### Radios de Borde (Los "Anillos")

| Elemento | Valor | Razón |
|---------|-------|-------|
| hero | 48px | Curvas amplias y acogedoras |
| pill | 10000px | La forma de anillo continuo |
| cards | 36px o 28px | El rasgo más reconocible del sistema; curvas suaves |
| icons | 40px | Círculos casi perfectos |
| badges | 12px | Bordes amigables para datos pequeños |
| buttons | 36px | Botones primarios tipo píldora (Anillo interior) |

### Sombras (Cálidas)

| Nombre | Token | Uso |
|------|-------|-----|
| sutil | `--shadow-sutil` | Botones primarios — efecto táctil de arcilla pulida |
| md | `--shadow-md` | Elevación de tarjetas — `rgba(27, 20, 16, 0.06) 0px 8px 24px 0px` |

### Diseño (Layout)

- **Ancho máximo:** 1200px
- **Espacio entre secciones:** 96px (amplio y ventilado)
- **Padding de tarjetas:** 28-32px

---

## Superficies

| Nivel | Nombre | Valor | Propósito |
|-------|------|-------|---------|
| 1 | Lienzo | `#f5f2eb` | Fondo de página y relleno de sección predeterminado |
| 2 | Tarjeta Perla | `#fffdfa` | Superficie principal de tarjeta sobre el lienzo |
| 3 | Tarjeta Yeso | `#efebe4` | Superficie secundaria, sensación ligeramente elevada |
| 4 | Superficie Oscura | `#1b1410` | Secciones oscuras, botones primarios (Catedral) |

---

## Componentes

### Botón Primario "Anillo"

**Rol:** CTA principal — Comenzar, Ver proyectos.

- Fondo `#1b1410` (Catedral), texto en Perla (`#fffdfa`)
- Piraí Sans 14–16px peso 500
- Border-radius 36px
- Sombra multicapa cálida — cualidad táctil de arcilla pulida

```html
<button class="bg-catedral text-perla font-medium text-sm px-8 py-3.5 rounded-[36px] shadow-md">
  Enviar Reporte
</button>
```

### Botón Claro Contorneado

**Rol:** Acciones secundarias.

- Fondo `#fffdfa`, texto `#5e483a` (Ladrillo)
- Borde 1px sólido `#5e483a`
- Border-radius 36px

```html
<button class="bg-perla text-ladrillo border border-ladrillo font-medium text-sm px-8 py-3.5 rounded-[36px]">
  Cancelar
</button>
```

### Tarjeta de Superficie Clara (El "Patio")

**Rol:** Bloques de características, testimonios sobre lienzo crema.

- Fondo `#fffdfa` (Perla)
- Border-radius 36px
- Sin sombra de caja (plano)
- El radio extremo hace que los rectángulos se lean como burbujas o espacios abiertos

```html
<div class="bg-perla rounded-[36px] p-8">
  <h3 class="font-semibold text-xl text-tierra">Título</h3>
  <p class="text-sm text-caoba mt-3">Contenido de la tarjeta con información relevante.</p>
</div>
```

### Panel Oscuro "Surazo"

**Rol:** Sección de contraste — haciendo alusión al viento frío del sur.

- Fondo `#1b1410`
- Border-radius 36px
- Frases clave usan peso 600–700 mientras que las palabras de introducción usan 300–400

```html
<section class="bg-catedral text-perla rounded-[36px] p-12">
  <h2 class="font-semibold text-3xl">Estadísticas</h2>
  <p class="font-light text-lg text-arena">Reportes resueltos este mes</p>
  <span class="font-bold text-5xl mt-2 block">1,247</span>
</section>
```

### Insignia Toborochi / Sol Camba

**Rol:** Identificadores especiales (Ej. "Nuevo", "Destacado").

- Fondo `#ff8c00` o `#ff66b2`, texto `#fffdfa`
- Border-radius 12px, peso 600
- Uso exclusivo para señales de alto valor; nunca se reutiliza para estados genéricos

```html
<span class="bg-sol-camba text-perla text-[10px] font-semibold px-2.5 py-1 rounded-xl">
  Destacado
</span>
```

### Input / Formulario

```html
<input
  class="bg-perla border border-arcilla rounded-[36px] px-5 py-3.5 text-sm text-tierra placeholder:text-almendra w-full"
  placeholder="Escribe aquí..."
/>
```

### Badges de Estado (Reportes)

| Estado | Clase Tailwind |
|--------|---------------|
| Reportado | `bg-arena text-perla` |
| Aceptado | `bg-sol-camba text-perla` |
| En Trabajo | `bg-caoba text-perla` |
| Finalizado | `bg-ladrillo text-perla` |
| Rechazado | `bg-catedral text-arena` |

---

## Imágenes y Fotografía

El sistema depende de una iluminación cálida y exuberante. Los recortes llenan completamente el contenedor de 36px. Si hay presencia humana, debe mostrarse en luz natural vibrante (la "hora dorada"). Los proyectos de diseño gráfico y las pantallas de interfaz destacan colores vibrantes enmarcados dentro de la misma forma de loseta redondeada, creando un efecto de galería moderna tropical. Los íconos son mínimos y monocromáticos en tonos tierra.

---

## Filosofía de Movimiento (Motion)

El sistema utiliza bucles de desplazamiento continuo y fluido, inspirados en la constante brisa oriental. La única flexibilización expresiva (un ligero resorte) está reservada para las animaciones de entrada, dando una sensación de vitalidad y crecimiento, similar a la naturaleza exótica que irrumpe en la ciudad.

---

## Lo que se debe y no se debe hacer

### Hacer (Do)

- Usar el radio de borde de 36px para todas las tarjetas principales — homenaje a los anillos concéntricos de Santa Cruz
- Hacer que los espacios respiren — usar el lienzo Crema (`#f5f2eb`) abundantemente para dar sensación de amplitud y frescura
- Usar Rosa Toborochi (`#ff66b2`) exclusivamente como baño de color decorativo único — su poder reside en la escasez
- Usar Sol Camba (`#ff8c00`) solo en badges de estado pequeñas
- Diseñar mobile-first: 375-428px como viewport base

### No hacer (Don't)

- No usar grises fríos o azulados — todo el sistema neutro debe estar teñido de tonos tierra cálidos
- No reducir el radio de las tarjetas a menos de 28px — rompe el lenguaje de contenedores orgánicos suaves
- No aplicar sombras paralelas intensas o negras — usar tintes de Catedral
- No usar otra familia tipográfica que no sea Piraí Sans
- No ocultar contenido en mobile

---

## Inicio Rápido — Tailwind v4

```css
@import "tailwindcss";

@theme {
  /* Colores — Paleta Santa Cruz */
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

  /* Tipografía */
  --font-pirai: 'Montserrat', 'Urbanist', ui-sans-serif, system-ui, sans-serif;

  /* Radios de Borde (Los Anillos) */
  --radius-xl: 12px;
  --radius-2xl: 16px;
  --radius-3xl-2: 28px;
  --radius-3xl-3: 36px;
  --radius-hero: 48px;
  --radius-pill: 10000px;

  /* Sombras */
  --shadow-sutil: rgba(255, 255, 255, 0.6) 0px 0.5px 0px 0px inset,
    rgba(139, 115, 101, 0.3) 0px 9px 14px -5px inset,
    rgba(27, 20, 16, 0.15) 0px 12px 20px -8px;
  --shadow-md: rgba(27, 20, 16, 0.06) 0px 8px 24px 0px;
}
```

---

## Referencia rápida de clases

### Colores de fondo
`bg-catedral` `bg-tierra` `bg-ladrillo` `bg-caoba` `bg-arena` `bg-almendra` `bg-arcilla` `bg-yeso` `bg-lienzo` `bg-perla` `bg-sol-camba` `bg-rosa-toborochi`

### Colores de texto
`text-catedral` `text-tierra` `text-ladrillo` `text-caoba` `text-arena` `text-almendra` `text-perla` `text-sol-camba`

### Colores de borde
`border-catedral` `border-ladrillo` `border-arcilla`

### Tipografía
`font-pirai` `font-light` `font-normal` `font-medium` `font-semibold` `font-bold`

### Radios
`rounded-xl` `rounded-2xl` `rounded-3xl-2` `rounded-3xl-3` `rounded-hero` `rounded-pill`

### Sombras
`shadow-sutil` `shadow-md`
