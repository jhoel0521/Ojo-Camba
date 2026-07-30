# Banco de imágenes del simulador histórico

Cada imagen se envía en base64 por el mismo flujo de registro que utiliza la
ciudadanía; no se usan URLs externas ni imágenes de relleno. El archivo
`manifest-images.json` es la fuente de verdad: la carpeta física no define la
categoría ni el triaje final.

## Temporada lluviosa

En Santa Cruz el simulador considera lluviosos los meses noviembre a marzo.
Cada imagen declara `temporada.solo_lluviosa`:

- `true`: solo puede seleccionarse en esos meses, porque la evidencia o el
  problema mostrado depende de la lluvia.
- `false`: puede seleccionarse en cualquier mes.

El simulador debe respetar esa restricción antes de elegir aleatoriamente una
imagen. Las imágenes de alcantarilla inundada, bache con agua o basura que tapa
un drenaje no deben aparecer durante la época seca.

## Uso y privacidad

Se aceptan `.jpg`, `.jpeg` y `.png`. Antes de habilitar una imagen para la
demostración, el equipo debe completar su fuente o permiso en el manifiesto y
confirmar que no contiene rostros identificables, menores, placas legibles ni
otros datos personales. Una imagen puede estar en cualquier carpeta; el
manifiesto registra su ruta, categoría, triaje y destino operativo reales.
