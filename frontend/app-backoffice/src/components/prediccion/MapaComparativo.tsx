import { useMemo } from 'react';
import { MapContainer, Polygon, TileLayer, Tooltip } from 'react-leaflet';
import * as h3 from 'h3-js';
import type { ZonaComparada } from '../../lib/prediccionApi';
import 'leaflet/dist/leaflet.css';

/**
 * Mapa H3 de la comparativa actual vs. prediccion (ISSUE-32, criterio 2).
 *
 * La capa es explicita y excluyente: se ve lo observado, lo estimado o la
 * diferencia, nunca los tres pintados a la vez como si fueran lo mismo. Ademas
 * del color, lo estimado va con **borde punteado**: el criterio pide que las
 * fuentes no se confundan, y un solo canal (el color) deja fuera a quien no lo
 * distingue.
 */

export type CapaMapa = 'observado' | 'estimado' | 'diferencia';

/** Santa Cruz de la Sierra. */
const CENTRO: [number, number] = [-17.7833, -63.1821];

const ESCALA_OBSERVADO = ['#efebe4', '#d2c8be', '#8b7365', '#5e483a', '#2c221c'];
const ESCALA_ESTIMADO = ['#fff1dd', '#ffd8a3', '#ffb457', '#ff8c00', '#c96a00'];

function tono(valor: number, maximo: number, escala: string[]): string {
  if (maximo <= 0 || valor <= 0) return escala[0];
  const paso = Math.min(escala.length - 1, Math.ceil((valor / maximo) * (escala.length - 1)));
  return escala[paso];
}

/** Diferencia: rosa cuando el modelo espera mas de lo que hubo, verde al reves. */
function tonoDiferencia(diferencia: number): string {
  if (diferencia > 2) return '#ff66b2';
  if (diferencia > 0.5) return '#ffb3d5';
  if (diferencia < -2) return '#2f7a4f';
  if (diferencia < -0.5) return '#8fc4a6';
  return '#d2c8be';
}

interface Props {
  zonas: ZonaComparada[];
  capa: CapaMapa;
  zonaSeleccionada: string | null;
  onSeleccionar: (zona: string | null) => void;
  nombreCategoria: (id: number | null) => string;
}

export default function MapaComparativo({
  zonas,
  capa,
  zonaSeleccionada,
  onSeleccionar,
  nombreCategoria,
}: Props) {
  const maximos = useMemo(
    () => ({
      observado: Math.max(0, ...zonas.map((z) => z.casos_observados)),
      estimado: Math.max(0, ...zonas.map((z) => z.casos_estimados ?? 0)),
    }),
    [zonas],
  );

  const poligonos = useMemo(
    () =>
      zonas
        .map((zona) => {
          // Una celda invalida (dato viejo o corrupto) no debe tumbar el mapa.
          let limites: [number, number][] = [];
          try {
            limites = h3.cellToBoundary(zona.zona_h3) as [number, number][];
          } catch {
            return null;
          }
          return { zona, limites };
        })
        .filter((valor): valor is { zona: ZonaComparada; limites: [number, number][] } =>
          Boolean(valor && valor.limites.length > 0),
        ),
    [zonas],
  );

  if (poligonos.length === 0) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center rounded-3xl-2 border border-arcilla bg-perla p-6 text-center text-sm text-arena">
        No hay zonas con datos en este periodo.
      </div>
    );
  }

  return (
    <MapContainer
      center={CENTRO}
      zoom={11}
      className="h-full min-h-[280px] w-full rounded-3xl-2"
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {poligonos.map(({ zona, limites }) => {
        const estimado = zona.casos_estimados;
        const sinEstimacion = capa !== 'observado' && estimado === null;

        const color =
          capa === 'observado'
            ? tono(zona.casos_observados, maximos.observado, ESCALA_OBSERVADO)
            : capa === 'estimado'
              ? tono(estimado ?? 0, maximos.estimado, ESCALA_ESTIMADO)
              : tonoDiferencia(zona.diferencia ?? 0);

        const seleccionada = zonaSeleccionada === zona.zona_h3;

        return (
          <Polygon
            key={zona.zona_h3}
            positions={limites}
            eventHandlers={{
              click: () => onSeleccionar(seleccionada ? null : zona.zona_h3),
            }}
            pathOptions={{
              color: seleccionada ? '#1b1410' : '#5e483a',
              weight: seleccionada ? 3 : 1,
              // Lo estimado nunca se dibuja con linea llena.
              dashArray: capa === 'observado' ? undefined : '5 4',
              fillColor: sinEstimacion ? '#f5f2eb' : color,
              fillOpacity: sinEstimacion ? 0.25 : 0.65,
            }}
          >
            <Tooltip sticky>
              <div className="text-xs">
                <p className="font-semibold">{zona.zona_h3}</p>
                <p>
                  Observado: <strong>{zona.casos_observados}</strong> Casos
                </p>
                <p>
                  Estimado:{' '}
                  {estimado === null ? (
                    <em>sin modelo</em>
                  ) : (
                    <>
                      <strong>{estimado}</strong> Casos
                      {zona.confianza ? ` (confianza ${zona.confianza})` : ''}
                    </>
                  )}
                </p>
                {zona.categoria_estimada !== null && (
                  <p>Categoria dominante: {nombreCategoria(zona.categoria_estimada)}</p>
                )}
              </div>
            </Tooltip>
          </Polygon>
        );
      })}
    </MapContainer>
  );
}
