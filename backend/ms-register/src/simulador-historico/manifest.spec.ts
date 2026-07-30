import { ImagenManifest, ManifestImagenes } from './domain';
import { estadoAutorizacionValido, imagenesDisponibles } from './manifest';

const imagen = (id: string, soloLluviosa: boolean): ImagenManifest => ({
  id,
  archivo: `${id}.jpg`,
  categoria: 'bache',
  triaje: { gravedad: 'Media', resultado: 'aceptar', destino: 'cuadrilla_bacheo', motivo: 'Bache' },
  temporada: { solo_lluviosa: soloLluviosa },
  origen: 'Banco autorizado',
  estado_autorizacion: 'autorizada',
});

const manifest: ManifestImagenes = {
  version: 1,
  contexto: { ciudad: 'Santa Cruz', meses_lluviosos: [11, 12, 1, 2, 3], regla: 'regla' },
  imagenes: [imagen('todo-el-anio', false), imagen('solo-lluvia', true)],
};

describe('selección del manifiesto', () => {
  it('excluye imágenes solo-lluvia en época seca', () => {
    expect(imagenesDisponibles(manifest, 7).map((item) => item.id)).toEqual(['todo-el-anio']);
  });

  it('incluye imágenes solo-lluvia durante la temporada definida', () => {
    expect(imagenesDisponibles(manifest, 12).map((item) => item.id)).toEqual([
      'todo-el-anio',
      'solo-lluvia',
    ]);
  });

  it('solo admite autorización pendiente con la flag de laboratorio explícita', () => {
    expect(estadoAutorizacionValido('pendiente')).toBe(false);
    expect(estadoAutorizacionValido('pendiente', true)).toBe(true);
  });
});
