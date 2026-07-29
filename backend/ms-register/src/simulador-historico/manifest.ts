import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { CATEGORIAS_VALIDAS, ImagenManifest, ManifestImagenes } from './domain';

const AUTORIZACIONES_VALIDAS = new Set(['autorizada', 'autorizada_por_equipo']);

export async function cargarManifest(
  ruta: string,
  permitirImagenesPendientes = false,
): Promise<ManifestImagenes> {
  const texto = await readFile(ruta, 'utf8');
  const manifest = JSON.parse(texto) as ManifestImagenes;
  validarManifest(manifest, dirname(ruta), permitirImagenesPendientes);
  return manifest;
}

export function validarManifest(
  manifest: ManifestImagenes,
  directorio: string,
  permitirImagenesPendientes = false,
): void {
  if (!Array.isArray(manifest.imagenes) || manifest.imagenes.length === 0) {
    throw new Error('El manifiesto no contiene imágenes.');
  }
  const ids = new Set<string>();
  for (const imagen of manifest.imagenes) {
    validarImagen(imagen, directorio, ids, permitirImagenesPendientes);
  }
}

function validarImagen(
  imagen: ImagenManifest,
  directorio: string,
  ids: Set<string>,
  permitirImagenesPendientes: boolean,
): void {
  if (!imagen.id || ids.has(imagen.id))
    throw new Error(`Id de imagen inválido o repetido: ${imagen.id}`);
  ids.add(imagen.id);
  if (!CATEGORIAS_VALIDAS.includes(imagen.categoria)) {
    throw new Error(`Categoría inválida en ${imagen.id}: ${imagen.categoria}`);
  }
  if (typeof imagen.temporada?.solo_lluviosa !== 'boolean') {
    throw new Error(`Falta temporada.solo_lluviosa en ${imagen.id}`);
  }
  if (!imagen.triaje?.motivo || !imagen.triaje.resultado) {
    throw new Error(`Falta triaje real en ${imagen.id}`);
  }
  if (!estadoAutorizacionValido(imagen.estado_autorizacion, permitirImagenesPendientes)) {
    throw new Error(`La imagen ${imagen.id} no está autorizada para demo.`);
  }
  if (!imagen.origen.trim()) throw new Error(`Falta origen o licencia en ${imagen.id}`);
  if (!existsSync(resolve(directorio, imagen.archivo))) {
    throw new Error(`No existe el archivo declarado por ${imagen.id}: ${imagen.archivo}`);
  }
}

export function estadoAutorizacionValido(estado: string, permitirPendiente = false): boolean {
  return AUTORIZACIONES_VALIDAS.has(estado) || (permitirPendiente && estado === 'pendiente');
}

export function imagenesDisponibles(
  manifest: ManifestImagenes,
  mes: number,
  categoria?: string,
): ImagenManifest[] {
  const lluvioso = manifest.contexto.meses_lluviosos.includes(mes);
  return manifest.imagenes.filter(
    (imagen) =>
      (!categoria || imagen.categoria === categoria) &&
      (!imagen.temporada.solo_lluviosa || lluvioso),
  );
}
