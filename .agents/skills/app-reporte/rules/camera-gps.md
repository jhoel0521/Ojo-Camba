# Regla: Cámara y GPS Obligatorios

## Principio
**No se puede crear un reporte sin foto y ubicación GPS.** Ambos son obligatorios.

## Cámara

### Requisitos
- Usar `MediaDevices.getUserMedia()` para acceso directo a la cámara
- O `<input type="file" accept="image/*" capture="environment">` como fallback
- La cámara trasera (`environment`) debe ser la predeterminada
- La foto se convierte a base64 antes de enviar

### Flujo
```typescript
// 1. Solicitar permiso de cámara
const stream = await navigator.mediaDevices.getUserMedia({ 
  video: { facingMode: 'environment' } 
});

// 2. Capturar frame a canvas → base64
const base64 = canvas.toDataURL('image/jpeg', 0.8);

// 3. Enviar al gateway
await fetch('/reportes', {
  method: 'POST',
  body: JSON.stringify({ imagen_base64: base64, ... })
});
```

### Validaciones
- **Tamaño máximo**: 5MB (comprimir con canvas si excede)
- **Formato**: JPEG o PNG
- **Obligatorio**: Si no hay foto, el botón de enviar está deshabilitado

## GPS

### Requisitos
- Usar `navigator.geolocation.getCurrentPosition()` o `watchPosition()`
- **Alta precisión**: `enableHighAccuracy: true`
- **Timeout**: 10 segundos máximo
- La ubicación se captura automáticamente al abrir el formulario

### Flujo
```typescript
navigator.geolocation.getCurrentPosition(
  (position) => {
    const { latitude, longitude } = position.coords;
    // Mostrar en mapa y adjuntar al payload
  },
  (error) => {
    // Mostrar mensaje: "Necesitamos tu ubicación para crear el reporte"
  },
  { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
);
```

### Estados de permiso
| Estado | UI |
|--------|----|
| `granted` | GPS capturado, formulario habilitado |
| `prompt` | Mostrar diálogo nativo del navegador |
| `denied` | **Bloquear formulario.** Mostrar mensaje: "Activa la ubicación en configuración para reportar" |

## Reglas estrictas

1. **Foto obligatoria**: `<button disabled={!imagen}>Enviar</button>`
2. **GPS obligatorio**: `<button disabled={!lat || !lng}>Enviar</button>`
3. **Permiso denegado**: Mostrar instrucciones para activar en Settings del dispositivo
4. **Sin conexión**: Guardar en localStorage y enviar cuando vuelva la conexión (PWA offline)
5. **Previsualización**: Mostrar la foto capturada antes de enviar
6. **Spinner**: Mientras se sube la imagen a MinIO (puede tardar con conexión lenta)
