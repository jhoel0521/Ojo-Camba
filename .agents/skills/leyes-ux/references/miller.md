# Ley de Miller — Sugerencia

## Enunciado

La memoria a corto plazo humana maneja **entre 5 y 9 elementos** (7 ± 2) al mismo tiempo. Pasado ese límite, el usuario se siente abrumado y empieza a olvidar.

Formulada por George A. Miller en 1956 en *"The Magical Number Seven, Plus or Minus Two"*.

## Diferencia con Hick

- **Hick** trata de **opciones de decisión** (más opciones = más tiempo).
- **Miller** trata de **elementos a recordar/procesar simultáneamente** (más items = más carga cognitiva).

Suelen aplicarse juntas pero atacan problemas distintos.

## Cómo aplicarla: Chunking

**Chunking** = agrupar información en bloques pequeños y significativos.

### Ejemplo clásico: números

```
❌ 5551234567        (10 dígitos sueltos, difícil de retener)
✅ 555-123-4567       (3 chunks, fácil de retener)

❌ 4532789012345678  (16 dígitos de tarjeta)
✅ 4532 7890 1234 5678  (4 chunks de 4)
```

### Aplicaciones prácticas

#### 1. Menús y navegación

Limita ítems primarios a 5-7. Si tienes más, agrupa:

```
❌ Productos / Servicios / Soluciones / Industrias / Casos / Recursos / Blog / 
   Eventos / Carreras / Inversores / Prensa / Contacto

✅ Productos | Soluciones | Recursos | Empresa | Contacto
   (donde "Recursos" contiene Blog/Eventos/Casos, "Empresa" contiene Carreras/Inversores/Prensa)
```

#### 2. Formularios

Agrupa campos relacionados en secciones visualmente separadas:

```
INFORMACIÓN PERSONAL
- Nombre
- Apellido
- Fecha de nacimiento

DIRECCIÓN
- Calle
- Ciudad
- País

CONTACTO
- Email
- Teléfono
```

En lugar de 8 campos en lista plana, son 3 chunks de 3 campos. Cerebro descansa.

#### 3. Listas largas

Cuando muestres listas largas (productos, items de inventario), usa:

- **Categorías** con encabezados visuales claros.
- **Separadores** cada 5-7 items.
- **Búsqueda y filtros** para que el usuario no tenga que retener todo en memoria.

#### 4. Datos numéricos / códigos

| Tipo | Mal | Bien |
|---|---|---|
| Teléfono | 5551234567 | 555-123-4567 |
| Tarjeta | 4532789012345678 | 4532 7890 1234 5678 |
| IBAN | ES7621001234567890123456 | ES76 2100 1234 5678 9012 3456 |
| Código de verificación | 482917 | 482-917 o 4 8 2 9 1 7 |

#### 5. Jerarquía visual

Usa pesos visuales para reducir lo que el usuario necesita "retener":

- Lo importante: tamaño grande, color sólido.
- Lo secundario: tamaño menor, color tenue.
- Lo terciario: aún más pequeño, gris claro.

El usuario procesa primero lo grande, **descarta** lo demás de la memoria activa y solo lo recupera si lo necesita.

## Cómo aplicarlo en código

```tsx
// ❌ MAL — 12 campos en lista plana
<form>
  <input name="firstName" />
  <input name="lastName" />
  <input name="birthDate" />
  <input name="email" />
  <input name="phone" />
  <input name="street" />
  <input name="city" />
  {/* ... 5 más ... */}
</form>

// ✅ BIEN — agrupado en chunks semánticos
<form>
  <fieldset>
    <legend>Datos personales</legend>
    <input name="firstName" />
    <input name="lastName" />
    <input name="birthDate" />
  </fieldset>

  <fieldset>
    <legend>Contacto</legend>
    <input name="email" />
    <input name="phone" />
  </fieldset>

  <fieldset>
    <legend>Dirección</legend>
    <input name="street" />
    <input name="city" />
    <input name="zip" />
  </fieldset>
</form>
```

## Carga cognitiva en general

Cuando una pantalla tiene muchas decisiones simultáneas:

1. **Divide en pasos** (relacionado con Hick).
2. **Recuerda al usuario lo que ya hizo** (no le pidas retener: "Paso 2 de 5 — Datos personales").
3. **Muestra solo lo que necesita ahora**, oculta el resto.

## Errores frecuentes

1. **Mostrar números largos sin formato** (códigos, IDs, teléfonos).
2. **Listas de >10 items sin separadores ni búsqueda**.
3. **Formularios planos sin secciones** cuando hay >7 campos.
4. **Mostrar al usuario todo el state de la app a la vez** en lugar de solo lo relevante a su tarea actual.
5. **Mensajes de error que enumeran 5+ problemas a la vez** → resolver de uno en uno.

## Checklist Miller

```
[ ] Menús / listas >7 items están agrupados en chunks reconocibles
[ ] Formularios largos divididos en secciones temáticas (fieldset/groups)
[ ] Datos numéricos largos formateados con separadores
[ ] Jerarquía visual reduce lo que el usuario debe retener activamente
[ ] Pasos numerados en flujos multi-step ("Paso 2 de 5")
[ ] No se le pide al usuario recordar info de pantallas anteriores
```