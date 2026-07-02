import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface TrendChartProps {
  data: { periodo: string; total: number }[];
  granularidad: 'mes' | 'semana' | 'dia';
}

function formatLabel(periodo: string, granularidad: TrendChartProps['granularidad']): string {
  switch (granularidad) {
    case 'mes': {
      const [year, month] = periodo.split('-');
      const date = new Date(Number(year), Number(month) - 1);
      return date.toLocaleDateString('es-BO', { month: 'short', year: '2-digit' });
    }
    case 'semana': {
      const match = periodo.match(/W(\d+)$/);
      return match ? `Sem ${match[1]}` : periodo;
    }
    case 'dia': {
      const date = new Date(periodo + 'T00:00:00');
      return date.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' });
    }
    default:
      return periodo;
  }
}

function TrendChart({ data, granularidad }: TrendChartProps) {
  /* Empty state */
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-sm text-caoba">Sin datos aún</p>
      </div>
    );
  }

  /* Single-value state */
  if (data.length === 1) {
    const entry = data[0];
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-1">
        <span className="text-4xl font-bold text-tierra">{entry.total}</span>
        <span className="text-sm text-arena">{formatLabel(entry.periodo, granularidad)}</span>
      </div>
    );
  }

  /* Chart state */
  const chartData = data.map((d) => ({
    ...d,
    label: formatLabel(d.periodo, granularidad),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#efebe4" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#b5a498' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#b5a498' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: '#fffdfa',
            border: '1px solid #efebe4',
            borderRadius: 12,
            fontSize: 12,
          }}
          cursor={{ fill: 'rgba(255,140,0,0.08)' }}
        />
        <Bar dataKey="total" fill="#ff8c00" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default TrendChart;
