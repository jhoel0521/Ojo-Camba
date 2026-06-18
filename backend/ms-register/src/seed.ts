import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as h3 from 'h3-js';
import {
  Reporte,
  GrupoReporte,
  Categoria,
  Dispositivo,
  ActualizacionCaso,
  EstadoReporte,
} from '@ojo-camba/common';

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config();
} catch {
  /* optional */
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL no definido');
  process.exit(1);
}

const ds = new DataSource({
  type: 'postgres',
  url: DATABASE_URL,
  synchronize: false,
  logging: false,
  entities: [Reporte, GrupoReporte, Categoria, Dispositivo, ActualizacionCaso],
});

interface RSeed {
  lat: number;
  lng: number;
  cat: number;
  gravedad: string;
}

interface ASeed {
  comentario: string;
  estado_nuevo?: string;
  fecha_estimada_fin?: string;
  recursos_solicitados?: string;
  url_imagen?: string;
}

interface GSeed {
  cat: number;
  estado: string;
  fecha_estimada_fin?: string;
  reportes: RSeed[];
  actualizaciones?: ASeed[];
}

// Genera N coordenadas con pequeños offsets desde un punto base
function r(lat: number, lng: number, cat: number, gravedad: string, dLat = 0, dLng = 0): RSeed {
  return { lat: lat + dLat, lng: lng + dLng, cat, gravedad };
}

// ── Datos de seed: 25 grupos, ~105 reportes ───────────────────────────────────
const GRUPOS: GSeed[] = [
  // ──────────────── FINALIZADO (8 grupos) ──────────────────────────────────────
  {
    // 1. Centro Histórico – Baches
    cat: 1,
    estado: EstadoReporte.Finalizado,
    fecha_estimada_fin: '2026-05-20',
    reportes: [
      r(-17.7834, -63.1825, 1, 'Alta'),
      r(-17.7834, -63.1825, 1, 'Alta', 0.001, 0.001),
      r(-17.7834, -63.1825, 1, 'Media', -0.001, 0.002),
      r(-17.7834, -63.1825, 1, 'Emergencia', 0.002, -0.001),
    ],
    actualizaciones: [
      {
        comentario:
          'Inspector verificó 4 baches en Av. Monseñor Rivero. Se constata deterioro severo del pavimento.',
        estado_nuevo: EstadoReporte.ValidacionEnCampo,
      },
      {
        comentario: 'Cuadrilla N°3 asignada con 2 camiones de asfalto y 6 operarios.',
        estado_nuevo: EstadoReporte.EnTrabajo,
        fecha_estimada_fin: '2026-05-20',
        recursos_solicitados: '2 camiones de asfalto, 6 operarios, selladora de grietas',
        url_imagen: 'https://picsum.photos/seed/obra1b/400/300',
      },
      {
        comentario:
          'Trabajos de bacheo concluidos en su totalidad. Superficie habilitada al tráfico.',
        estado_nuevo: EstadoReporte.Finalizado,
        url_imagen: 'https://picsum.photos/seed/obra1c/400/300',
      },
    ],
  },
  {
    // 2. Equipetrol – Luminarias
    cat: 2,
    estado: EstadoReporte.Finalizado,
    fecha_estimada_fin: '2026-05-10',
    reportes: [
      r(-17.7628, -63.1965, 2, 'Media'),
      r(-17.7628, -63.1965, 2, 'Media', 0.001, -0.001),
      r(-17.7628, -63.1965, 2, 'Alta', -0.001, 0.002),
    ],
    actualizaciones: [
      {
        comentario:
          'Se verificó falla eléctrica en 3 postes de luminaria en Av. San Martín. Cables pelados visibles.',
        estado_nuevo: EstadoReporte.ValidacionEnCampo,
      },
      {
        comentario:
          'Técnicos eléctricos en sitio. Reposición de luminarias LED y revisión del cableado.',
        estado_nuevo: EstadoReporte.EnTrabajo,
        fecha_estimada_fin: '2026-05-10',
        recursos_solicitados: 'Unidad de trabajo eléctrico, 3 luminarias LED, 4 técnicos',
        url_imagen: 'https://picsum.photos/seed/obra2b/400/300',
      },
      {
        comentario:
          'Las 3 luminarias fueron repuestas y el sistema eléctrico revisado. Zona iluminada correctamente.',
        estado_nuevo: EstadoReporte.Finalizado,
        url_imagen: 'https://picsum.photos/seed/obra2c/400/300',
      },
    ],
  },
  {
    // 3. Satélite Norte – Tráfico
    cat: 5,
    estado: EstadoReporte.Finalizado,
    fecha_estimada_fin: '2026-06-01',
    reportes: [
      r(-17.7452, -63.1815, 5, 'Alta'),
      r(-17.7452, -63.1815, 5, 'Alta', 0.001, 0.001),
      r(-17.7452, -63.1815, 5, 'Media', -0.001, -0.001),
      r(-17.7452, -63.1815, 5, 'Media', 0.002, 0),
    ],
    actualizaciones: [
      {
        comentario:
          'Se constató ausencia de señalización vial en cruce de Radial 17. Riesgo elevado.',
        estado_nuevo: EstadoReporte.ValidacionEnCampo,
      },
      {
        comentario:
          'Equipo vial instalando señalización horizontal y vertical. Pintado de cebras peatonales.',
        estado_nuevo: EstadoReporte.EnTrabajo,
        fecha_estimada_fin: '2026-06-01',
        recursos_solicitados: 'Señaleros, pintura vial termoplástica, 2 técnicos viales',
      },
      {
        comentario: 'Señalización completada. Cruce vial habilitado con demarcación nueva.',
        estado_nuevo: EstadoReporte.Finalizado,
        url_imagen: 'https://picsum.photos/seed/obra3c/400/300',
      },
    ],
  },
  {
    // 4. Radial 26 – Luminarias
    cat: 2,
    estado: EstadoReporte.Finalizado,
    fecha_estimada_fin: '2026-05-25',
    reportes: [
      r(-17.7793, -63.1624, 2, 'Alta'),
      r(-17.7793, -63.1624, 2, 'Media', 0.001, 0.001),
      r(-17.7793, -63.1624, 2, 'Media', -0.001, 0.002),
      r(-17.7793, -63.1624, 2, 'Alta', 0.002, -0.001),
    ],
    actualizaciones: [
      {
        comentario:
          'Inspección realizada: 4 postes con luminaria defectuosa en Radial 26 y 2do anillo.',
        estado_nuevo: EstadoReporte.ValidacionEnCampo,
      },
      {
        comentario:
          'Reparación de cableado iniciada. Se reemplazarán balastros en todos los postes afectados.',
        estado_nuevo: EstadoReporte.EnTrabajo,
        fecha_estimada_fin: '2026-05-25',
        recursos_solicitados: '4 balastros, plataforma elevadora, 3 técnicos eléctricos',
      },
      {
        comentario:
          'Los 4 postes quedaron operativos. Se realizó prueba nocturna con resultado satisfactorio.',
        estado_nuevo: EstadoReporte.Finalizado,
        url_imagen: 'https://picsum.photos/seed/obra4c/400/300',
      },
    ],
  },
  {
    // 5. Palmasola – Residuos
    cat: 3,
    estado: EstadoReporte.Finalizado,
    fecha_estimada_fin: '2026-05-18',
    reportes: [
      r(-17.7254, -63.1464, 3, 'Media'),
      r(-17.7254, -63.1464, 3, 'Alta', 0.001, 0.001),
      r(-17.7254, -63.1464, 3, 'Media', -0.001, -0.001),
    ],
    actualizaciones: [
      {
        comentario:
          'Verificación: acumulación de residuos sólidos en vía pública. Punto negro identificado.',
        estado_nuevo: EstadoReporte.ValidacionEnCampo,
      },
      {
        comentario: 'Camión recolector y cuadrilla de limpieza en la zona.',
        estado_nuevo: EstadoReporte.EnTrabajo,
        fecha_estimada_fin: '2026-05-18',
        recursos_solicitados: 'Camión recolector de 8 ton, 4 operarios de limpieza',
      },
      {
        comentario: 'Zona limpiada. Se instaló señalética de prohibición de depósito de basura.',
        estado_nuevo: EstadoReporte.Finalizado,
        url_imagen: 'https://picsum.photos/seed/obra5c/400/300',
      },
    ],
  },
  {
    // 6. La Ramada – Tráfico
    cat: 5,
    estado: EstadoReporte.Finalizado,
    fecha_estimada_fin: '2026-06-05',
    reportes: [
      r(-17.7965, -63.1842, 5, 'Alta'),
      r(-17.7965, -63.1842, 5, 'Alta', 0.001, -0.001),
      r(-17.7965, -63.1842, 5, 'Media', -0.001, 0.002),
      r(-17.7965, -63.1842, 5, 'Media', 0.002, 0.001),
    ],
    actualizaciones: [
      {
        comentario:
          'Semáforo en intersección La Ramada / 3er anillo fuera de servicio. Riesgo de accidente.',
        estado_nuevo: EstadoReporte.ValidacionEnCampo,
      },
      {
        comentario:
          'Técnicos en reparación del controlador semafórico. Agentes de tránsito regulando el cruce.',
        estado_nuevo: EstadoReporte.EnTrabajo,
        fecha_estimada_fin: '2026-06-05',
        recursos_solicitados:
          'Controlador semafórico, 2 técnicos electricistas, 3 agentes de tránsito',
      },
      {
        comentario:
          'Semáforo restaurado y funcionando correctamente en los 4 accesos de la intersección.',
        estado_nuevo: EstadoReporte.Finalizado,
        url_imagen: 'https://picsum.photos/seed/obra6c/400/300',
      },
    ],
  },
  {
    // 7. Centro Sur – Baches
    cat: 1,
    estado: EstadoReporte.Finalizado,
    fecha_estimada_fin: '2026-05-30',
    reportes: [
      r(-17.787, -63.179, 1, 'Alta'),
      r(-17.787, -63.179, 1, 'Emergencia', 0.001, 0.001),
      r(-17.787, -63.179, 1, 'Alta', -0.001, 0.002),
      r(-17.787, -63.179, 1, 'Media', 0.002, -0.001),
      r(-17.787, -63.179, 1, 'Alta', -0.002, -0.001),
    ],
    actualizaciones: [
      {
        comentario:
          'Revisión técnica: deterioro masivo del pavimento en Calle Bolívar entre 1ro y 2do anillo.',
        estado_nuevo: EstadoReporte.ValidacionEnCampo,
      },
      {
        comentario:
          'Inicio de trabajos de fresado y repavimentación. Se cierra un carril al tráfico.',
        estado_nuevo: EstadoReporte.EnTrabajo,
        fecha_estimada_fin: '2026-05-30',
        recursos_solicitados: 'Fresadora, 3 camiones de asfalto, rodillo compactador, 8 operarios',
        url_imagen: 'https://picsum.photos/seed/obra7b/400/300',
      },
      {
        comentario:
          'Tramo repavimentado y señalizado. Carretera habilitada al tráfico en su totalidad.',
        estado_nuevo: EstadoReporte.Finalizado,
        url_imagen: 'https://picsum.photos/seed/obra7c/400/300',
      },
    ],
  },
  {
    // 8. Centro – Alcantarillado
    cat: 4,
    estado: EstadoReporte.Finalizado,
    fecha_estimada_fin: '2026-05-22',
    reportes: [
      r(-17.782, -63.185, 4, 'Alta'),
      r(-17.782, -63.185, 4, 'Alta', 0.001, 0),
      r(-17.782, -63.185, 4, 'Media', 0, 0.001),
    ],
    actualizaciones: [
      {
        comentario:
          'Tapadera de alcantarilla rota en Av. Cañoto. Riesgo para peatones y vehículos.',
        estado_nuevo: EstadoReporte.ValidacionEnCampo,
      },
      {
        comentario: 'Equipo de saneamiento instalando tapadera nueva. Zona señalizada con vallas.',
        estado_nuevo: EstadoReporte.EnTrabajo,
        fecha_estimada_fin: '2026-05-22',
        recursos_solicitados: 'Tapadera de hormigón, equipo de saneamiento, 3 operarios',
      },
      {
        comentario: 'Tapadera instalada y fijada correctamente. Área limpiada y habilitada.',
        estado_nuevo: EstadoReporte.Finalizado,
      },
    ],
  },

  // ──────────────── EN TRABAJO (5 grupos) ──────────────────────────────────────
  {
    // 9. Plan 3000 – Residuos
    cat: 3,
    estado: EstadoReporte.EnTrabajo,
    fecha_estimada_fin: '2026-07-15',
    reportes: [
      r(-17.8492, -63.1413, 3, 'Alta'),
      r(-17.8492, -63.1413, 3, 'Alta', 0.001, 0.001),
      r(-17.8492, -63.1413, 3, 'Media', -0.001, 0.002),
      r(-17.8492, -63.1413, 3, 'Media', 0.002, -0.001),
      r(-17.8492, -63.1413, 3, 'Alta', -0.002, 0.001),
      r(-17.8492, -63.1413, 3, 'Baja', 0.001, -0.002),
    ],
    actualizaciones: [
      {
        comentario:
          'Se identificaron 6 microbasurales activos en la Calle Mutualista. Situación crítica.',
        estado_nuevo: EstadoReporte.ValidacionEnCampo,
      },
      {
        comentario:
          'Campaña de limpieza iniciada con 2 camiones y 8 operarios. Trabajo estimado 3 días.',
        estado_nuevo: EstadoReporte.EnTrabajo,
        fecha_estimada_fin: '2026-07-15',
        recursos_solicitados: '2 camiones recolectores, 8 operarios, contenedores temporales',
        url_imagen: 'https://picsum.photos/seed/obra9b/400/300',
      },
    ],
  },
  {
    // 10. Radial 10 – Baches
    cat: 1,
    estado: EstadoReporte.EnTrabajo,
    fecha_estimada_fin: '2026-07-10',
    reportes: [
      r(-17.8145, -63.1867, 1, 'Alta'),
      r(-17.8145, -63.1867, 1, 'Alta', 0.001, 0),
      r(-17.8145, -63.1867, 1, 'Media', 0, 0.001),
      r(-17.8145, -63.1867, 1, 'Media', -0.001, -0.001),
    ],
    actualizaciones: [
      {
        comentario: 'Deterioro de pavimento verificado en Radial 10 entre 4to y 5to anillo.',
        estado_nuevo: EstadoReporte.ValidacionEnCampo,
      },
      {
        comentario: 'Equipo de bacheo en sitio. Se trabaja en secciones para no cortar el tráfico.',
        estado_nuevo: EstadoReporte.EnTrabajo,
        fecha_estimada_fin: '2026-07-10',
        recursos_solicitados: 'Camión de asfalto, compactadora manual, 5 operarios',
        url_imagen: 'https://picsum.photos/seed/obra10b/400/300',
      },
    ],
  },
  {
    // 11. Cambá Cua – Alcantarillado
    cat: 4,
    estado: EstadoReporte.EnTrabajo,
    fecha_estimada_fin: '2026-07-20',
    reportes: [
      r(-17.8084, -63.1932, 4, 'Emergencia'),
      r(-17.8084, -63.1932, 4, 'Alta', 0.001, 0.001),
      r(-17.8084, -63.1932, 4, 'Alta', -0.001, 0.001),
    ],
    actualizaciones: [
      {
        comentario:
          'Colapso parcial de colector pluvial. Agua estancada en vía pública. Emergencia sanitaria.',
        estado_nuevo: EstadoReporte.ValidacionEnCampo,
      },
      {
        comentario:
          'Equipo de emergencias trabajando en desobstrucción del colector. Bomba de achique instalada.',
        estado_nuevo: EstadoReporte.EnTrabajo,
        fecha_estimada_fin: '2026-07-20',
        recursos_solicitados: 'Bomba de achique, excavadora, equipo de saneamiento, 6 operarios',
        url_imagen: 'https://picsum.photos/seed/obra11b/400/300',
      },
    ],
  },
  {
    // 12. Urbari – Luminarias
    cat: 2,
    estado: EstadoReporte.EnTrabajo,
    fecha_estimada_fin: '2026-07-05',
    reportes: [
      r(-17.7582, -63.1741, 2, 'Media'),
      r(-17.7582, -63.1741, 2, 'Media', 0.001, -0.001),
      r(-17.7582, -63.1741, 2, 'Alta', -0.001, 0.002),
    ],
    actualizaciones: [
      {
        comentario:
          'Tres postes con luminaria quemada en Av. Cristóbal de Mendoza. Sector sin iluminación nocturna.',
        estado_nuevo: EstadoReporte.ValidacionEnCampo,
      },
      {
        comentario: 'Técnicos eléctricos realizando cambio de lámparas. Trabajo en progreso.',
        estado_nuevo: EstadoReporte.EnTrabajo,
        fecha_estimada_fin: '2026-07-05',
        recursos_solicitados: 'Plataforma elevadora, 3 lámparas de repuesto, 2 técnicos',
      },
    ],
  },
  {
    // 13. Av. Santos Dumont – Tráfico
    cat: 5,
    estado: EstadoReporte.EnTrabajo,
    fecha_estimada_fin: '2026-07-25',
    reportes: [
      r(-17.7724, -63.1725, 5, 'Alta'),
      r(-17.7724, -63.1725, 5, 'Alta', 0.001, 0.001),
      r(-17.7724, -63.1725, 5, 'Media', -0.001, -0.001),
      r(-17.7724, -63.1725, 5, 'Media', 0.002, 0),
    ],
    actualizaciones: [
      {
        comentario:
          'Cruce peatonal deteriorado y señalización vial borrada en Av. Santos Dumont y 3er anillo.',
        estado_nuevo: EstadoReporte.ValidacionEnCampo,
      },
      {
        comentario: 'Demarcación vial en proceso. Pintura termoplástica aplicada en 2 de 4 cruces.',
        estado_nuevo: EstadoReporte.EnTrabajo,
        fecha_estimada_fin: '2026-07-25',
        recursos_solicitados: 'Máquina de pintura vial, pintura termoplástica, 3 operarios',
        url_imagen: 'https://picsum.photos/seed/obra13b/400/300',
      },
    ],
  },

  // ──────────────── VALIDACION EN CAMPO (4 grupos) ─────────────────────────────
  {
    // 14. Plan 3000 – Baches
    cat: 1,
    estado: EstadoReporte.ValidacionEnCampo,
    reportes: [
      r(-17.8512, -63.139, 1, 'Alta'),
      r(-17.8512, -63.139, 1, 'Alta', 0.001, 0.001),
      r(-17.8512, -63.139, 1, 'Media', -0.001, 0.002),
      r(-17.8512, -63.139, 1, 'Emergencia', 0.002, -0.001),
    ],
    actualizaciones: [
      {
        comentario:
          'Inspector asignado. Visita programada para verificar severidad de los baches reportados.',
        estado_nuevo: EstadoReporte.ValidacionEnCampo,
      },
    ],
  },
  {
    // 15. Hamacas – Baches
    cat: 1,
    estado: EstadoReporte.ValidacionEnCampo,
    reportes: [
      r(-17.7935, -63.1492, 1, 'Media'),
      r(-17.7935, -63.1492, 1, 'Alta', 0.001, 0),
      r(-17.7935, -63.1492, 1, 'Media', 0, 0.001),
      r(-17.7935, -63.1492, 1, 'Alta', -0.001, -0.001),
    ],
    actualizaciones: [
      {
        comentario:
          'Se realizó inspección visual. Se levantará informe técnico del estado del pavimento.',
        estado_nuevo: EstadoReporte.ValidacionEnCampo,
      },
    ],
  },
  {
    // 16. Periférico Sur – Residuos
    cat: 3,
    estado: EstadoReporte.ValidacionEnCampo,
    reportes: [
      r(-17.8352, -63.1685, 3, 'Alta'),
      r(-17.8352, -63.1685, 3, 'Alta', 0.001, 0.001),
      r(-17.8352, -63.1685, 3, 'Media', -0.001, 0.002),
      r(-17.8352, -63.1685, 3, 'Media', 0.002, -0.001),
      r(-17.8352, -63.1685, 3, 'Baja', -0.002, 0),
    ],
    actualizaciones: [
      {
        comentario:
          'Equipo de campo relevando puntos de acumulación de residuos en Periférico y Doble Vía a La Guardia.',
        estado_nuevo: EstadoReporte.ValidacionEnCampo,
      },
    ],
  },
  {
    // 17. Las Palmas – Alcantarillado
    cat: 4,
    estado: EstadoReporte.ValidacionEnCampo,
    reportes: [
      r(-17.7694, -63.2041, 4, 'Alta'),
      r(-17.7694, -63.2041, 4, 'Media', 0.001, 0.001),
      r(-17.7694, -63.2041, 4, 'Alta', -0.001, -0.001),
    ],
    actualizaciones: [
      {
        comentario:
          'Tapadera de alcantarilla faltante reportada. Inspector en camino para verificar profundidad y riesgo.',
        estado_nuevo: EstadoReporte.ValidacionEnCampo,
      },
    ],
  },

  // ──────────────── ACEPTADO (8 grupos, sin actualizaciones) ───────────────────
  {
    // 18. Villa 1ro de Mayo – Baches (coords originales del usuario)
    cat: 1,
    estado: EstadoReporte.Aceptado,
    reportes: [
      r(-17.78119028280482, -63.1314753201512, 1, 'Alta'),
      r(-17.78119028280482, -63.1314753201512, 1, 'Emergencia', 0.001, 0.001),
      r(-17.78119028280482, -63.1314753201512, 1, 'Alta', -0.001, 0.002),
      r(-17.78119028280482, -63.1314753201512, 2, 'Media', 0.002, -0.001),
      r(-17.78119028280482, -63.1314753201512, 1, 'Alta', -0.002, -0.001),
      r(-17.78119028280482, -63.1314753201512, 1, 'Media', 0.001, -0.002),
      r(-17.78119028280482, -63.1314753201512, 5, 'Baja', -0.003, 0.001),
    ],
  },
  {
    // 19. Urbari – Baches/Varios (coords originales del usuario)
    cat: 3,
    estado: EstadoReporte.Aceptado,
    reportes: [
      r(-17.758194069241743, -63.17412908279559, 3, 'Media'),
      r(-17.758194069241743, -63.17412908279559, 4, 'Alta', 0.001, 0.001),
      r(-17.758194069241743, -63.17412908279559, 3, 'Baja', -0.001, 0.002),
      r(-17.758194069241743, -63.17412908279559, 3, 'Media', 0.002, -0.001),
    ],
  },
  {
    // 20. Norte – Baches
    cat: 1,
    estado: EstadoReporte.Aceptado,
    reportes: [
      r(-17.7381, -63.1652, 1, 'Alta'),
      r(-17.7381, -63.1652, 1, 'Media', 0.001, 0.001),
      r(-17.7381, -63.1652, 1, 'Alta', -0.001, -0.001),
    ],
  },
  {
    // 21. El Trompillo – Baches
    cat: 1,
    estado: EstadoReporte.Aceptado,
    reportes: [
      r(-17.8023, -63.1698, 1, 'Media'),
      r(-17.8023, -63.1698, 1, 'Alta', 0.001, 0.001),
      r(-17.8023, -63.1698, 1, 'Media', -0.001, 0.002),
    ],
  },
  {
    // 22. Los Lotes – Baches
    cat: 1,
    estado: EstadoReporte.Aceptado,
    reportes: [
      r(-17.8263, -63.1553, 1, 'Alta'),
      r(-17.8263, -63.1553, 1, 'Alta', 0.001, 0.001),
      r(-17.8263, -63.1553, 1, 'Emergencia', -0.001, 0.002),
      r(-17.8263, -63.1553, 1, 'Media', 0.002, -0.001),
      r(-17.8263, -63.1553, 1, 'Alta', -0.002, 0.001),
    ],
  },
  {
    // 23. Satélite Norte – Luminarias
    cat: 2,
    estado: EstadoReporte.Aceptado,
    reportes: [
      r(-17.7436, -63.1839, 2, 'Media'),
      r(-17.7436, -63.1839, 2, 'Alta', 0.001, 0),
      r(-17.7436, -63.1839, 2, 'Media', 0, 0.001),
    ],
  },
  {
    // 24. 4to Anillo Norte – Baches
    cat: 1,
    estado: EstadoReporte.Aceptado,
    reportes: [
      r(-17.7551, -63.1893, 1, 'Alta'),
      r(-17.7551, -63.1893, 1, 'Media', 0.001, 0.001),
      r(-17.7551, -63.1893, 1, 'Alta', -0.001, -0.001),
      r(-17.7551, -63.1893, 1, 'Emergencia', 0.002, 0),
    ],
  },
  {
    // 25. Equipetrol Sur – Residuos
    cat: 3,
    estado: EstadoReporte.Aceptado,
    reportes: [
      r(-17.768, -63.199, 3, 'Alta'),
      r(-17.768, -63.199, 3, 'Media', 0.001, 0.001),
      r(-17.768, -63.199, 3, 'Alta', -0.001, 0.002),
      r(-17.768, -63.199, 6, 'Baja', 0.002, -0.001),
      r(-17.768, -63.199, 3, 'Media', -0.002, 0.001),
    ],
  },
];

async function seed() {
  await ds.initialize();
  console.log('Conectado a PostgreSQL\n');

  console.log('Truncando tablas...');
  await ds.query(
    'TRUNCATE actualizaciones_caso, grupos_reportes, reportes, dispositivos RESTART IDENTITY CASCADE',
  );

  const categoriaRepo = ds.getRepository(Categoria);
  const reporteRepo = ds.getRepository(Reporte);
  const grupoRepo = ds.getRepository(GrupoReporte);
  const actualizacionRepo = ds.getRepository(ActualizacionCaso);

  const categorias = ['bache', 'luminaria', 'residuos', 'alcantarillado', 'trafico', 'otro'];
  for (const nombre of categorias) {
    await categoriaRepo.upsert({ nombre }, ['nombre']);
  }
  console.log('Categorías: OK\n');

  const year = new Date().getFullYear();
  let totalReportes = 0;

  for (let gi = 0; gi < GRUPOS.length; gi++) {
    const gDef = GRUPOS[gi];
    const codigoObra = `OBRA-${year}-${String(gi + 1).padStart(3, '0')}`;

    const reporteIds: number[] = [];
    for (let ri = 0; ri < gDef.reportes.length; ri++) {
      const p = gDef.reportes[ri];
      const reporte = await reporteRepo.save(
        reporteRepo.create({
          device_id: 'dev-seed',
          lat: p.lat,
          lng: p.lng,
          categoria_id: p.cat,
          gravedad: p.gravedad,
          h3_res_8: h3.latLngToCell(p.lat, p.lng, 8),
          h3_res_11: h3.latLngToCell(p.lat, p.lng, 11),
          h3_res_13: h3.latLngToCell(p.lat, p.lng, 13),
          url_imagen: `https://picsum.photos/seed/oc${gi + 1}r${ri + 1}/400/300`,
          estado: gDef.estado,
        }),
      );
      reporteIds.push(reporte.id);
      totalReportes++;
    }

    const grupo = await grupoRepo.save(
      grupoRepo.create({
        codigo_obra: codigoObra,
        estado_actual: EstadoReporte.Aceptado,
        creado_por_usuario_id: 1,
        categoria_id: gDef.cat,
        fecha_estimada_fin: gDef.fecha_estimada_fin ?? null,
      }),
    );

    await reporteRepo.update(reporteIds, { grupo_id: grupo.id });

    // Actualización inicial: siempre se registra la aceptación
    await actualizacionRepo.save(
      actualizacionRepo.create({
        grupo_id: grupo.id,
        usuario_id: 1,
        comentario: `Caso de obra registrado. ${gDef.reportes.length} reporte${gDef.reportes.length !== 1 ? 's' : ''} aceptado${gDef.reportes.length !== 1 ? 's' : ''} y agrupados.`,
        estado_nuevo: EstadoReporte.Aceptado,
        fecha_estimada_fin: null,
        recursos_solicitados: null,
        url_imagen: null,
        lat_actualizada: null,
        lng_actualizada: null,
        reporte_id: null,
      }),
    );

    if (gDef.actualizaciones?.length) {
      for (const a of gDef.actualizaciones) {
        await actualizacionRepo.save(
          actualizacionRepo.create({
            grupo_id: grupo.id,
            usuario_id: 1,
            comentario: a.comentario,
            estado_nuevo: a.estado_nuevo ?? null,
            fecha_estimada_fin: a.fecha_estimada_fin ?? null,
            recursos_solicitados: a.recursos_solicitados ?? null,
            url_imagen: a.url_imagen ?? null,
            lat_actualizada: null,
            lng_actualizada: null,
            reporte_id: null,
          }),
        );

        if (a.estado_nuevo) {
          await grupoRepo.update(grupo.id, { estado_actual: a.estado_nuevo });
          await reporteRepo.update(reporteIds, { estado: a.estado_nuevo });
        }
        if (a.fecha_estimada_fin) {
          await grupoRepo.update(grupo.id, { fecha_estimada_fin: a.fecha_estimada_fin });
        }
      }
    }

    const updates = gDef.actualizaciones?.length ?? 0;
    console.log(
      `[${gi + 1}/25] ${codigoObra}  ${gDef.reportes.length} reportes  ${gDef.estado}${updates ? `  ${updates} actualizaciones` : ''}`,
    );
  }

  await ds.destroy();
  console.log(`\nSeed completado: ${GRUPOS.length} grupos, ${totalReportes} reportes`);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
