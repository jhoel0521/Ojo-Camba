export const CATEGORIAS_VALIDAS = [
  'bache',
  'luminaria',
  'residuos',
  'alcantarillado',
  'trafico',
  'otro',
] as const;

export type Categoria = (typeof CATEGORIAS_VALIDAS)[number];
export type ResultadoTriaje = 'aceptar' | 'rechazar' | 'derivar';

export interface ImagenManifest {
  id: string;
  archivo: string;
  categoria: Categoria;
  triaje: {
    gravedad: 'Baja' | 'Media' | 'Alta' | 'Emergencia';
    resultado: ResultadoTriaje;
    destino: string | null;
    motivo: string;
  };
  temporada: { solo_lluviosa: boolean };
  origen: string;
  estado_autorizacion: string;
}

export interface ManifestImagenes {
  version: number;
  contexto: { ciudad: string; meses_lluviosos: number[]; regla: string };
  imagenes: ImagenManifest[];
}

export interface ParametrosSimulador {
  inicio: Date;
  hoy: Date;
  semilla: string;
  ritmoMs: number;
  maxReportesDia: number;
}

export interface DemandaDia {
  cantidad: number;
  lluvioso: boolean;
}
