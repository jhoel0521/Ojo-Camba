# Ley de Jakob — Sugerencia

## Enunciado

Los usuarios pasan la mayor parte de su tiempo en **otros sitios**. Por lo tanto, esperan que tu sitio funcione de la misma manera que todos los demás que ya conocen.

Formulada por Jakob Nielsen (cofundador del Nielsen Norman Group con Donald A. Norman).

## Idea central

Los usuarios traen **modelos mentales** ya formados. Pelearte contra ellos para ser "original" cuesta tiempo de aprendizaje, frustración y abandono.

> Cuando inventas un patrón nuevo, le estás pidiendo al usuario que aprenda algo solo para usar tu producto. Si no hay un beneficio claro, no lo hagas.

## Cómo aplicarla

### 1. Usa iconos convencionales

| Concepto | Icono universal |
|---|---|
| Menú | ☰ (hamburguesa) |
| Buscar | 🔍 (lupa) |
| Configuración | ⚙ (engranaje) |
| Usuario / Perfil | 👤 (silueta) |
| Mensajes | ✉ (sobre) |
| Notificaciones | 🔔 (campana) |
| Carrito | 🛒 |
| Cerrar | ✕ |
| Atrás | ← |
| Compartir | (icono de share del SO) |
| Favoritos | ★ / ♥ |
| Eliminar | 🗑 |
| Editar | ✎ (lápiz) |

Si un icono es ambiguo, **acompáñalo siempre con etiqueta de texto**.

### 2. Respeta convenciones de plataforma

- **iOS**: navegación inferior con tabs, back en esquina superior izquierda, modales que suben desde abajo.
- **Android (Material)**: FAB para acción principal, navegación drawer/bottom, back físico/gestual.
- **Web desktop**: logo arriba-izquierda lleva al home, menú horizontal superior, footer con info legal y enlaces secundarios.

### 3. Patrones de interacción esperados

| Patrón | Convención |
|---|---|
| Login | Email + password + "olvidé contraseña" + opción social |
| Búsqueda | Barra con lupa, resultados debajo, filtros a la izquierda o arriba |
| Listas | Pull-to-refresh en móvil, paginación o scroll infinito en web |
| Errores en form | Mensaje rojo bajo el campo afectado |
| Confirmación destructiva | Modal con botón rojo + cancelar |
| Toast | Aparece arriba o abajo unos segundos, se va solo |

### 4. Terminología consistente

Usa los términos que la gente ya conoce:

- "Carrito" (no "Cesta de adquisiciones")
- "Iniciar sesión" / "Entrar" (no "Autenticar")
- "Salir" / "Cerrar sesión" (no "Desconectar sesión")
- "Cuenta" (no "Perfil de identidad")

### 5. Cuando introduzcas cambios grandes

Si rediseñas algo familiar:

- Mantén un **modo legacy temporal** durante migración.
- **Comunica el cambio**: tooltip de "qué cambió" la primera vez.
- Cambia **una cosa a la vez**, no todo de golpe.

## Cuándo SÍ vale la pena romper la convención

Solo si el patrón nuevo:

1. Resuelve un problema real que el patrón estándar no resuelve.
2. Es **autoevidente** (el usuario lo entiende sin instrucciones).
3. El beneficio justifica el costo de aprendizaje.

Ejemplo válido: Gmail introdujo "archivar" (no "borrar") cuando todos esperaban borrar. Funcionó porque resolvía un problema real (no perder emails) y el botón estaba claramente etiquetado.

## Ejemplo del PDF: app de radio Android

Las apps de radio imitan paneles físicos de minicomponentes (dial circular, frecuencia grande, presets). Esto **explota directamente el modelo mental** que el usuario ya tiene de una radio física, sin que tenga que aprender nada nuevo.

## Errores frecuentes

1. **Inventar iconos nuevos** para acciones que ya tienen icono universal.
2. **Mover el logo al centro o a la derecha** rompiendo la expectativa de "logo arriba-izquierda = home".
3. **Usar terminología corporativa interna** que el usuario no entiende.
4. **Botón de cerrar en posición inesperada** (esperado: esquina superior derecha en desktop, superior izquierda o derecha en móvil según plataforma).
5. **Cambio radical de UI sin transición** que rompe todas las expectativas a la vez.

## Checklist Jakob

```
[ ] Iconos siguen convenciones universales (o llevan etiqueta)
[ ] Convenciones de plataforma respetadas (iOS / Android / Web)
[ ] Terminología familiar para el usuario, no jerga interna
[ ] Patrones de interacción estándar (login, búsqueda, errores, etc.)
[ ] Si rompo una convención, hay beneficio claro y es autoevidente
[ ] Cambios grandes acompañados de comunicación / transición
```