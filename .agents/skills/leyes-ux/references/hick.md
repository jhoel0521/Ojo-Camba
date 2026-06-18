# Ley de Hick — BLOQUEANTE

## Enunciado

El tiempo que lleva tomar una decisión **aumenta con el número y la complejidad de las opciones**. Cuando bombardeas al usuario con elecciones, tiene que interpretar, comparar y decidir — trabajo cognitivo que no quiere hacer.

Formulada por William Edmund Hick y Ray Hyman en 1952.

## Reglas obligatorias para entregar

### 1. Máximo 7 opciones primarias visibles por pantalla

Si una pantalla tiene más de 7 opciones primarias (botones de acción, ítems de menú principal, tarjetas clicables relevantes) al mismo nivel jerárquico, **detente y reagrupa**.

Estrategias de agrupación válidas:

- **Categorizar**: agrupa items relacionados bajo una categoría (ej: "Configuración" en vez de 12 toggles sueltos).
- **Priorizar y ocultar**: muestra las 3-5 más usadas, oculta el resto detrás de "Más opciones" o un menú desplegable.
- **Paginar / pestañas**: divide en pestañas o pasos cuando hay grupos lógicos.

### 2. Tareas complejas → divídelas en pasos

Cualquier formulario con **más de 7 campos visibles** debe convertirse en:

- **Multi-step** (wizard): pasos numerados con barra de progreso (ej: 1. Datos → 2. Dirección → 3. Pago).
- **Acordeón / secciones colapsables**: con grupos lógicos claros.
- **Disclosure progresivo**: pide solo lo esencial primero, lo demás después.

Ejemplo válido del PDF: el formulario de registro dividido en "Login Details" / "User Profile" / "Finish".

### 3. CTA principal visualmente destacado

Cuando hay varias acciones disponibles, **una y solo una** debe ser visualmente dominante:

- Color sólido vs ghost/outline para secundarias.
- Tamaño mayor.
- Posición prominente.

Si todos los botones se ven igual de importantes, el usuario duda y pierde tiempo.

### 4. Onboarding progresivo

Para nuevos usuarios, **no muestres toda la complejidad de una vez**. Revela funcionalidad gradualmente:

- Primera sesión: solo el flujo core.
- Después: tooltips contextuales conforme aparecen casos avanzados.

## Cuidado con la sobre-simplificación

Hick **no significa "esconde todo"**. Si abstraes demasiado:

- El usuario no encuentra lo que necesita y abandona.
- Generas más clicks de los necesarios (cada nivel oculto añade un click).

Equilibrio: opciones frecuentes accesibles en 1 click, opciones raras en 2-3 clicks máximo.

## Cómo validar en código

```tsx
// ❌ MAL — 12 opciones de acción en una sola barra
<Toolbar>
  <Button>Editar</Button>
  <Button>Eliminar</Button>
  <Button>Duplicar</Button>
  <Button>Exportar</Button>
  <Button>Compartir</Button>
  <Button>Imprimir</Button>
  <Button>Archivar</Button>
  <Button>Etiquetar</Button>
  {/* ... */}
</Toolbar>

// ✅ BIEN — 3 acciones primarias + menú con el resto
<Toolbar>
  <Button variant="primary">Editar</Button>
  <Button variant="ghost">Compartir</Button>
  <DropdownMenu>
    <DropdownTrigger>Más</DropdownTrigger>
    <DropdownItem>Duplicar</DropdownItem>
    <DropdownItem>Exportar</DropdownItem>
    <DropdownItem>Imprimir</DropdownItem>
    <DropdownItem>Archivar</DropdownItem>
    <DropdownItem className="text-red-500">Eliminar</DropdownItem>
  </DropdownMenu>
</Toolbar>
```

## Errores frecuentes que debes detectar y corregir

1. **Formulario de registro con 15 campos en una sola página** → wizard de 3 pasos.
2. **Navegación principal con 9 ítems** → reagrupa en 5-6 categorías, lleva los demás a submenús o footer.
3. **Página de configuración como muro de toggles** → secciones con títulos (Cuenta / Privacidad / Notificaciones).
4. **Dashboard con 12 widgets de mismo tamaño** → jerarquía: 2-3 widgets grandes destacados, el resto en grilla secundaria.
5. **Modal con 4 botones igual de prominentes** → 1 primario, 1 secundario, los demás como texto.

## Checklist Hick

```
[ ] ≤7 opciones primarias visibles por pantalla
[ ] Formularios >7 campos divididos en pasos o secciones
[ ] CTA principal visualmente dominante sobre secundarios
[ ] Opciones avanzadas/raras ocultas detrás de "Más" / menús contextuales
[ ] Navegación principal con ≤7 items de primer nivel
[ ] Onboarding revela complejidad progresivamente
[ ] No hay sobre-simplificación: las opciones frecuentes están en ≤1 click
```