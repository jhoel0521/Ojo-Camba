# Ley de Fitts — BLOQUEANTE

## Enunciado

El tiempo necesario para alcanzar un objetivo con un movimiento rápido es función del **tamaño del objetivo** y la **distancia hasta él**. Objetivos pequeños o lejanos = más tiempo y más errores.

Formulada por Paul Fitts en 1954 estudiando motricidad humana.

## Reglas obligatorias para entregar

### 1. Tamaños mínimos de objetivos táctiles

| Contexto            | Tamaño mínimo | Recomendado |
| ------------------- | ------------- | ----------- |
| Móvil (iOS)         | 44×44 pt      | 48×48 pt    |
| Móvil (Android)     | 48×48 dp      | 56×56 dp    |
| Tablet              | 44×44 pt      | 48×48 pt    |
| Desktop (mouse)     | 24×24 px      | 32×32 px    |
| TV / control remoto | 64×64 px      | 80×80 px    |

Si un botón crítico (CTA primario, navegación, "comprar", "enviar", "cerrar sesión") incumple esto, **bloquea la entrega**.

### 2. Espaciado entre objetivos

- Mínimo **8px** de separación entre elementos clickeables en móvil.
- Mínimo **4px** en desktop.
- Si dos botones tienen funciones opuestas (Aceptar / Cancelar, Eliminar / Editar), **mínimo 16px** de separación.

### 3. Zonas de alcance en móvil

Divide la pantalla en 3 zonas verticales:

```
┌──────────────────┐
│   ÁREA LEJOS     │  ← Difícil con pulgar (uso una mano)
│   DEL ALCANCE    │     Solo para contenido pasivo / info
├──────────────────┤
│  DENTRO DEL ÁREA │  ← Alcance medio
│   DEL ALCANCE    │     CTAs secundarios, contenido scrolleable
├──────────────────┤
│ FÁCILMENTE       │  ← Pulgar relajado
│   ALCANZABLE     │     CTA principal, navegación, acciones críticas
└──────────────────┘
```

Regla: los **CTAs primarios** y la **navegación principal** deben estar en el tercio inferior. La parte superior es para títulos, información y elementos no críticos.

### 4. Esquinas y bordes

- Los **bordes de pantalla** son objetivos infinitamente grandes (el cursor/dedo no puede pasar de largo). Aprovéchalos para acciones globales en desktop (menú superior, dock).
- En **móvil**, evita poner controles críticos pegados a los bordes superiores: el área de notch/cámara y la zona del status bar interfieren.

## Cómo validar en código

Para React/Tailwind:

```tsx
// ❌ MAL — botón de 32px en móvil
<button className="h-8 px-2">Pagar</button>

// ✅ BIEN — botón de 48px mínimo
<button className="h-12 min-w-[44px] px-6">Pagar</button>

// ✅ MEJOR — botón crítico ancho completo en zona inferior
<div className="fixed bottom-0 inset-x-0 p-4">
  <button className="w-full h-14 rounded-xl">Pagar</button>
</div>
```

## Errores frecuentes que debes detectar y corregir

1. **Iconos de cerrar (X) de 16px en móvil** → mínimo 44×44 con padding invisible si quieres el ícono pequeño:
   ```tsx
   <button className="p-3"> {/* área táctil 44px */}
     <XIcon className="w-5 h-5" /> {/* ícono visual pequeño */}
   </button>
   ```
2. **Botones "Aceptar / Cancelar" pegados** → mínimo 16px de gap.
3. **CTA principal en la parte superior de la pantalla móvil** → moverlo al tercio inferior o usar barra fija inferior.
4. **Enlaces de texto seguidos en una línea** → aumentar tamaño de fuente o convertir en lista con padding.
5. **Botones de tabla muy pequeños** → en móvil, expandir el área táctil de toda la fila.

## Checklist Fitts

```
[ ] Todos los objetivos táctiles miden ≥44×44px en móvil / ≥24×24px en desktop
[ ] Espaciado ≥8px (móvil) o ≥4px (desktop) entre elementos clickeables
[ ] CTAs primarios en tercio inferior en móvil
[ ] Acciones destructivas separadas ≥16px de acciones primarias
[ ] Bordes y esquinas aprovechados para controles globales en desktop
[ ] Área táctil de iconos pequeños expandida con padding invisible
```