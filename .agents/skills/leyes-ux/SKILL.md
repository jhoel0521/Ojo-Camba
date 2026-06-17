---
name: leyes-ux
description: Aplica las 6 leyes fundamentales de UX (Jakob, Hick, Fitts, Miller, Apogeo-Final, Estética-Usabilidad) al diseñar o construir cualquier interfaz de usuario. Activa esta skill SIEMPRE que el usuario pida crear, modificar o revisar UI/UX en cualquier plataforma — web, móvil, escritorio, Tauri, React, formularios, menús, navegación, layouts, botones, pantallas, dashboards, landing pages, componentes, modales, wizards, onboarding, microinteracciones, flujos de checkout, configuración o cualquier elemento visual interactivo. También actívala cuando se discutan decisiones de usabilidad, accesibilidad táctil, jerarquía visual, agrupación de información, simplificación de opciones, experiencia de usuario o cuando se evalúe un diseño existente. Bloquea entregables que incumplan Fitts y Hick (críticos), sugiere mejoras en las demás leyes.
---

# Leyes UX

Skill que garantiza que cualquier interfaz cumpla los 6 principios de UX validados científicamente. Aplica antes de entregar cualquier UI.

## Las 6 leyes (resumen ejecutivo)

| Ley | Núcleo | Nivel |
|---|---|---|
| **Jakob** | Los usuarios esperan que tu UI funcione como las que ya conocen | Sugerencia |
| **Hick** | Más opciones = más tiempo para decidir. Reduce y agrupa | **BLOQUEANTE** |
| **Fitts** | Tiempo de alcance depende de tamaño y distancia del objetivo | **BLOQUEANTE** |
| **Miller** | La memoria a corto plazo maneja 5–9 elementos. Aplica chunking | Sugerencia |
| **Apogeo y Final** | Los usuarios recuerdan el momento más intenso y el final | Sugerencia |
| **Estética-Usabilidad** | Lo visualmente atractivo se percibe como más usable | Sugerencia |

## Flujo obligatorio

Sigue este orden al construir o revisar UI:

### 1. Antes de codear: planificar con las leyes bloqueantes

Antes de escribir JSX/HTML/CSS, responde:

- **(Hick)** ¿Cuántas opciones primarias tendrá esta pantalla? Si son >7 visibles a la vez, **detente y reagrupa** antes de seguir. Lee `references/hick.md` para criterios de agrupación.
- **(Fitts)** ¿Cuáles son los objetivos táctiles? Lista cada uno con su tamaño objetivo y zona de pantalla. Si hay cualquier botón crítico fuera de zona alcanzable o <44×44px en móvil, **bloquea la entrega**. Lee `references/fitts.md`.

### 2. Durante la construcción: aplicar las sugerencias

Mientras construyes, ten presentes las 4 leyes restantes. No bloquean, pero deben quedar registradas como decisiones conscientes:

- **(Jakob)** ¿Estoy usando patrones que el usuario ya conoce? (hamburguesa = menú, lupa = buscar, X = cerrar). Si invento un patrón nuevo, justificarlo. Ver `references/jakob.md`.
- **(Miller)** ¿Estoy presentando >7 elementos sin agrupar? Si sí, aplicar chunking. Ver `references/miller.md`.
- **(Apogeo y Final)** ¿Cuál es el momento clímax del flujo? ¿Cómo termina? Ambos deben ser memorables. Ver `references/apogeo-final.md`.
- **(Estética-Usabilidad)** ¿La jerarquía visual es clara? ¿Tipografía, espaciado y color están consistentes? Ver `references/estetica-usabilidad.md`.

### 3. Antes de entregar: checklist final

Ejecuta este checklist y reporta el resultado al usuario. **No entregues sin pasar los puntos BLOQUEANTES**:

```
BLOQUEANTES (no entregar si falla)
[ ] Fitts — Todos los objetivos táctiles ≥44×44px en móvil / ≥24×24px en desktop
[ ] Fitts — Botones críticos (CTAs, navegación principal) en zona alcanzable
[ ] Fitts — Espaciado mínimo de 8px entre elementos clickeables
[ ] Hick — Máximo 7 opciones primarias visibles por pantalla
[ ] Hick — Tareas complejas divididas en pasos (formularios >7 campos = multi-step)
[ ] Hick — CTA principal visualmente destacado sobre opciones secundarias

SUGERENCIAS (reportar si fallan, no bloquean)
[ ] Jakob — Iconos y patrones siguen convenciones estándar de la plataforma
[ ] Miller — Listas/menús >7 items están agrupados en chunks reconocibles
[ ] Miller — Datos largos (teléfonos, tarjetas) formateados en grupos
[ ] Apogeo-Final — El momento clímax del flujo está diseñado intencionalmente
[ ] Apogeo-Final — La pantalla final deja impresión positiva (confirmación clara, próximo paso obvio)
[ ] Estética — Jerarquía visual con máximo 3 niveles tipográficos
[ ] Estética — Sistema de espaciado consistente (múltiplos de 4 u 8)
[ ] Estética — Paleta de color limitada y coherente
```

Al entregar, presenta al usuario:
- ✅ los puntos cumplidos
- ❌ los bloqueantes incumplidos (con corrección obligatoria)
- ⚠️ las sugerencias no cumplidas (con recomendación opcional)

## Cuándo consultar cada referencia

Los archivos de `references/` están separados por ley para no inflar el contexto. Cárgalos solo cuando los necesites:

| Situación | Referencia a cargar |
|---|---|
| Diseñar botones, áreas táctiles, posición de elementos en móvil | `references/fitts.md` |
| Definir menús, opciones, formularios extensos, jerarquía de CTAs | `references/hick.md` |
| Decidir iconos, terminología, layout general, navegación | `references/jakob.md` |
| Estructurar listas largas, formatear datos, agrupar información | `references/miller.md` |
| Diseñar flujos completos (checkout, onboarding, errores, éxito) | `references/apogeo-final.md` |
| Definir sistema visual, tipografía, color, espaciado | `references/estetica-usabilidad.md` |

## Integración con otras skills

Esta skill **complementa** otras del proyecto:

- Con `frontend-clean-architecture`: aplica las leyes UX en la capa de componentes React/TypeScript y en hooks de presentación.
- Con `laravel-backend`: aplica Hick y Miller al diseñar respuestas de API (paginación, agrupación de campos en DTOs que alimentarán UI).

Si alguna ley UX entra en conflicto con una restricción técnica de esas skills, prioriza primero las BLOQUEANTES de UX (Fitts/Hick) y luego negocia con el usuario.

## Reglas rápidas que nunca debes romper

1. **Nunca pongas un botón crítico de <44×44px en móvil**, sin importar lo que pida el diseño.
2. **Nunca muestres >7 opciones primarias** sin agruparlas o reducirlas.
3. **Nunca uses iconos inventados** cuando exista una convención (engranaje = ajustes, sobre = mensajes, etc.).
4. **Nunca termines un flujo importante sin una pantalla/mensaje de cierre claro** (Apogeo-Final).
5. **Nunca uses más de 3 tamaños tipográficos** en una misma pantalla sin justificación.

## Ejemplo de aplicación

**Petición**: "Hazme una pantalla de checkout en React"

Mi respuesta debe:

1. Antes de codear, declarar:
   > Aplicando leyes UX:
   > - Hick: dividiré el checkout en 3 pasos (envío, pago, confirmación) en lugar de un formulario único.
   > - Fitts: botón "Pagar" será de 56px alto, ancho completo, en la parte inferior de la pantalla.
   > - Miller: campos del formulario agrupados en bloques de 3-4 (dirección, contacto, pago).
   > - Apogeo-Final: pantalla de confirmación con animación, número de pedido y CTA claro de seguimiento.

2. Después, generar el código.

3. Al final, presentar el checklist marcado.