# Ley del Apogeo y el Final (Peak-End Rule) — Sugerencia

## Enunciado

Los usuarios juzgan una experiencia principalmente por **dos momentos**:

1. El **apogeo** (peak): el momento más intenso, sea positivo o negativo.
2. El **final**: cómo termina.

El resto de la experiencia tiende a olvidarse o promediarse. Una experiencia con altos y bajos pero buen final se recuerda mejor que una experiencia mediocre y uniforme.

## Por qué importa en UI

- **Memorias duraderas**: el usuario evalúa tu producto completo basándose en pocos momentos.
- **Emociones**: estos momentos generan vínculo emocional con la marca.
- **Decisión de volver/recomendar**: el final influye directamente en retención.

## Cómo identificar el apogeo y el final

Para cualquier flujo, pregúntate:

1. **Apogeo positivo posible**: ¿cuál es el momento de máxima satisfacción? (recibir el resultado deseado, lograr la meta, ver algo creado por ellos).
2. **Apogeo negativo posible**: ¿cuál es el momento de máxima fricción? (formulario tedioso, espera, error). Si no puedes eliminarlo, **suavízalo**.
3. **Final**: ¿cuál es la última pantalla / mensaje / interacción antes de cerrar la app o irse?

## Cómo diseñarlos bien

### El apogeo

Haz que el momento clímax sea **sobre-recompensante** (más bueno de lo que el usuario espera):

- **Animación celebratoria** al completar una acción importante (confeti al pagar, checkmark animado al guardar).
- **Microinteracción gratificante** (sonido sutil, vibración táctil, transición fluida).
- **Resultado sorprendente** (mostrar progreso superior al esperado, dato curioso, frase personalizada).
- **Reconocimiento explícito** ("¡Logrado! Eres parte del 5% que termina este flujo").

Ejemplos del mercado:
- **Duolingo**: confeti + frase motivadora + racha de días al terminar una lección.
- **Spotify Wrapped**: visualización anual con storytelling personalizado (apogeo del año).
- **Stripe**: animación de check verde al recibir un pago.

### El final

El final **NUNCA** debe ser:

- ❌ Una pantalla en blanco.
- ❌ "Operación completada" sin contexto.
- ❌ Volver bruscamente al inicio sin confirmación.
- ❌ Un error que no explica qué hacer.

El final **DEBE** incluir:

1. **Confirmación clara**: "Tu pedido #12345 fue enviado".
2. **Próximo paso obvio**: "Ver detalles" / "Volver al inicio" / "Compartir".
3. **Tono positivo**: gracias, breve celebración, sensación de cierre.
4. **Información útil**: tiempo de entrega, link de seguimiento, qué esperar.

### Suavizar el apogeo negativo

Si un flujo tiene un punto inevitable de fricción (pago, espera, formulario largo):

- **Mostrar progreso visible** (barra avanzando).
- **Distraer/entretener** durante esperas (animación, dato curioso, mensaje variable).
- **Confirmar avance** ("Casi terminamos, último paso").
- **Reducir tiempo percibido** con feedback inmediato.

## Cómo aplicarlo en código

```tsx
// ❌ MAL — flujo de compra termina abruptamente
function CheckoutSuccess() {
  return <div>Compra exitosa.</div>;
}

// ✅ BIEN — apogeo y final cuidados
function CheckoutSuccess({ order }) {
  return (
    <div className="text-center p-8">
      <CheckmarkAnimation />  {/* apogeo visual */}
      <h1 className="text-3xl mt-6">¡Listo, {order.customerName}!</h1>
      <p className="mt-2 text-lg">
        Tu pedido <strong>#{order.id}</strong> está en camino.
      </p>
      <p className="text-sm text-gray-500 mt-1">
        Llegará el {order.estimatedDate}. Te enviamos los detalles a tu correo.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <Button variant="primary">Seguir mi pedido</Button>
        <Button variant="ghost">Volver al inicio</Button>
      </div>
    </div>
  );
}
```

## Aplicación por tipo de flujo

| Flujo | Apogeo a diseñar | Final a diseñar |
|---|---|---|
| Onboarding | Primera acción exitosa del usuario | Pantalla de "estás listo" con CTA al core |
| Compra / Checkout | Confirmación visual del pago aceptado | Resumen + tracking + agradecimiento |
| Crear contenido (post, doc) | Momento de publicar | Vista del contenido publicado + share |
| Completar tarea | Marcar como hecha | Celebración + próxima tarea sugerida |
| Login / Registro | Acceso concedido | Bienvenida personalizada + tour breve |
| Error / Fallo | (apogeo negativo) | Mensaje claro + cómo recuperarse |

## Errores frecuentes

1. **Pantalla de "éxito" genérica** que no celebra ni informa.
2. **Volver al usuario directamente al home** sin confirmación intermedia.
3. **Olvidar el final del flujo de error**: el usuario queda atascado sin saber qué hacer.
4. **Apogeo aplanado**: la acción más importante se siente igual que cualquier otra.
5. **Demasiado apogeo demasiadas veces**: si todo celebra, nada celebra (úsalo solo en momentos clave reales).

## Checklist Apogeo y Final

```
[ ] Identifiqué el momento de máxima satisfacción del flujo y lo diseñé intencionalmente
[ ] El final del flujo tiene: confirmación + próximo paso + tono positivo
[ ] Esperas y fricciones inevitables están suavizadas con feedback visual
[ ] Pantallas de error tienen "qué hacer ahora" claro
[ ] Microinteracciones gratificantes en acciones clave (no en todo)
[ ] No hay pantallas de éxito genéricas ni cortes abruptos del flujo
```