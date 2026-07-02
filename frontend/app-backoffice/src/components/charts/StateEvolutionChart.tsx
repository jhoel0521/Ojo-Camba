import { useState } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from 'recharts';

// Los 4 estados alcanzables por un Caso de Obra. "Rechazado" nunca aplica a
// un GrupoReporte (solo a Reporte individuales antes de agruparse), asi que
// no corresponde en este pipeline. "Finalizado" SI se incluye — es un balde
// que solo crece (cientos/miles) mientras los otros 3 son una poblacion
// acotada (decenas), por eso el eje Y usa escala LOGARITMICA: permite ver la
// FORMA de cada tendencia (Finalizado creciendo, los demas subiendo/bajando)
// en el mismo grafico sin que la magnitud de uno aplaste al resto.
const ESTADOS_PIPELINE = ['Aceptado', 'ValidacionEnCampo', 'EnTrabajo', 'Finalizado'] as const;

const COLOR_ESTADO: Record<string, string> = {
  Aceptado: '#ff8c00',
  ValidacionEnCampo: '#8b7365',
  EnTrabajo: '#5e483a',
  Finalizado: '#16a34a',
};

const LABEL_ESTADO: Record<string, string> = {
  Aceptado: 'Aceptado',
  ValidacionEnCampo: 'Validación en campo',
  EnTrabajo: 'En trabajo',
  Finalizado: 'Finalizado',
};

function formatLabel(periodo: string, granularidad: 'mes' | 'semana' | 'dia' = 'dia'): string {
  if (!periodo) return '';
  switch (granularidad) {
    case 'mes': {
      const [year, month] = periodo.split('-');
      if (!month) return periodo;
      const date = new Date(Number(year), Number(month) - 1);
      return date.toLocaleDateString('es-BO', { month: 'short', year: '2-digit' });
    }
    case 'semana': {
      const match = periodo.match(/W(\d+)$/);
      return match ? `Sem ${match[1]}` : periodo;
    }
    case 'dia': {
      const parts = periodo.split('-').map(Number);
      if (parts.length === 3) {
        const [year, month, day] = parts;
        return new Date(year, month - 1, day).toLocaleDateString('es-BO', {
          day: 'numeric',
          month: 'short',
        });
      }
      return periodo;
    }
    default:
      return periodo;
  }
}

interface StateEvolutionChartProps {
  historico: { dia: string; estado: string; total: number }[];
  granularidad?: 'mes' | 'semana' | 'dia';
}

export default function StateEvolutionChart({
  historico,
  granularidad = 'dia',
}: StateEvolutionChartProps) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  if (historico.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-sm text-caoba">
        Sin datos aún
      </div>
    );
  }

  const diasOrdenados = Array.from(new Set(historico.map((h) => h.dia))).sort();
  const chartData = diasOrdenados.map((dia) => {
    const fila: Record<string, number | string> = { dia: formatLabel(dia, granularidad) };
    for (const estado of ESTADOS_PIPELINE) {
      fila[estado] = historico.find((h) => h.dia === dia && h.estado === estado)?.total ?? 0;
    }
    return fila;
  });

  const toggleSeries = (dataKey: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(dataKey)) next.delete(dataKey);
      else next.add(dataKey);
      return next;
    });
  };

  const tooltipStyle = {
    background: '#fffdfa',
    border: '1px solid #efebe4',
    borderRadius: 12,
    fontSize: 12,
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#efebe4" />
        <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#b5a498' }} />
        <YAxis tick={{ fontSize: 11, fill: '#b5a498' }} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          iconSize={10}
          iconType="circle"
          wrapperStyle={{ fontSize: 11, color: '#8b7365', cursor: 'pointer' }}
          onClick={(e) => {
            if (typeof e.dataKey === 'string') toggleSeries(e.dataKey);
          }}
          formatter={(value, entry) => {
            const key = typeof entry.dataKey === 'string' ? entry.dataKey : String(value);
            const label = LABEL_ESTADO[key] ?? key;
            const isHidden = hidden.has(key);
            return (
              <span
                style={{
                  color: isHidden ? '#d2c8be' : '#8b7365',
                  textDecoration: isHidden ? 'line-through' : 'none',
                }}
              >
                {label}
              </span>
            );
          }}
        />

        {/* Líneas de transición para cada estado */}
        {ESTADOS_PIPELINE.map((estado) => (
          <Line
            key={estado}
            type="monotone"
            dataKey={estado}
            stroke={COLOR_ESTADO[estado]}
            strokeWidth={hidden.has(estado) ? 0 : 2}
            strokeOpacity={hidden.has(estado) ? 0 : 1}
            dot={false}
            name={estado}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
