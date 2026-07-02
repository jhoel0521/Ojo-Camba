import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ClipboardList,
  FolderOpen,
  Ban,
  CheckCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { getDashboardKpis, type DashboardKpis, type DashboardInsight } from '../lib/adminApi';
import { KPI_DESCRIPTIONS } from '../lib/kpiDescriptions';
import { friendlyError } from '../lib/errors';
import { useAuthStore } from '../store/authStore';
import { useModeration } from '../hooks/useModeration';

// Paleta del design system Ojo Camba
const COLORS = ['#ff8c00', '#8b7365', '#5e483a', '#b5a498', '#2c221c', '#d2c8be'];

// Estilos por nivel de insight — reusa la convención de color ya establecida
// en el resto de la app (StatusBadge.tsx para "positivo", banners de error
// para "alerta"), no inventa una paleta nueva.
const NIVEL_STYLES: Record<
  DashboardInsight['nivel'],
  { bg: string; border: string; text: string; icon: typeof AlertTriangle }
> = {
  alerta: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: AlertTriangle },
  atencion: {
    bg: 'bg-sol-camba/10',
    border: 'border-sol-camba/30',
    text: 'text-ladrillo',
    icon: Info,
  },
  positivo: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    icon: CheckCircle2,
  },
};

function formatMes(mes: string) {
  const [year, month] = mes.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('es-BO', { month: 'short', year: '2-digit' });
}

function formatDiaCorto(dia: string) {
  const [year, month, day] = dia.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-BO', {
    day: 'numeric',
    month: 'short',
  });
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    getDashboardKpis(desde || undefined, hasta || undefined)
      .then(setKpis)
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false));
  }, [desde, hasta]);

  useEffect(() => {
    load();
  }, [load]);

  const limpiarFiltro = () => {
    setDesde('');
    setHasta('');
  };

  useModeration({
    user: user ? { id: user.id, nombre: user.nombre } : null,
    onStats: load,
  });

  if (loading) {
    return (
      <div>
        <h2 className="font-semibold text-xl text-tierra mb-6">Dashboard</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-perla rounded-3xl-3 p-6 animate-pulse">
              <div className="h-3 bg-yeso rounded w-20 mb-3" />
              <div className="h-8 bg-yeso rounded w-12" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-perla rounded-3xl-3 p-6 animate-pulse h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="font-semibold text-xl text-tierra mb-6">Dashboard</h2>
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  const cards = [
    {
      label: 'Pendientes',
      testid: 'stat-pendientes',
      value: kpis?.pendientes ?? 0,
      icon: ClipboardList,
      color: 'text-sol-camba',
      bg: 'bg-sol-camba/10',
      path: '/revisar',
      kpiId: 'pendientes',
    },
    {
      label: 'Aceptados hoy',
      testid: 'stat-aceptados',
      value: kpis?.aceptados_hoy ?? 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
      path: undefined,
      kpiId: 'aceptados_hoy',
    },
    {
      label: 'Casos activos',
      testid: 'stat-casos',
      value: kpis?.casos_activos ?? 0,
      icon: FolderOpen,
      color: 'text-caoba',
      bg: 'bg-caoba/10',
      path: '/casos',
      kpiId: 'casos_activos',
    },
    {
      label: 'Dispositivos baneados',
      testid: 'stat-baneados',
      value: kpis?.dispositivos_baneados ?? 0,
      icon: Ban,
      color: 'text-red-600',
      bg: 'bg-red-50',
      path: '/usuarios',
      kpiId: 'dispositivos_baneados',
    },
  ];

  const barData = (kpis?.reportes_por_mes ?? []).map((r) => ({
    mes: formatMes(r.mes),
    total: r.total,
  }));

  const pieCategoria = kpis?.por_categoria ?? [];

  const ESTADOS_PIPELINE = ['Aceptado', 'ValidacionEnCampo', 'EnTrabajo', 'Finalizado'];
  const COLOR_ESTADO: Record<string, string> = {
    Aceptado: '#ff8c00',
    ValidacionEnCampo: '#8b7365',
    EnTrabajo: '#5e483a',
    Finalizado: '#16a34a',
  };
  const historico = kpis?.casos_por_estado_historico ?? [];
  const diasOrdenados = Array.from(new Set(historico.map((h) => h.dia))).sort();
  const lineCasosPorEstado = diasOrdenados.map((dia) => {
    const fila: Record<string, number | string> = { dia: formatDiaCorto(dia) };
    for (const estado of ESTADOS_PIPELINE) {
      fila[estado] = historico.find((h) => h.dia === dia && h.estado === estado)?.total ?? 0;
    }
    return fila;
  });

  const tasaResolucion = kpis?.tasa_resolucion ?? 0;
  const rangoActivo = !!(desde || hasta);
  return (
    <div>
      <h2 className="font-semibold text-xl text-tierra mb-6">Dashboard</h2>

      {/* Filtro dinámico de fecha — afecta las 3 agregaciones históricas y la tasa de resolución */}
      <div className="bg-perla rounded-3xl-3 p-4 mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="desde" className="block text-xs text-arena uppercase tracking-wide mb-1">
            Desde
          </label>
          <input
            id="desde"
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="bg-lienzo border border-arcilla rounded-2xl px-3 py-2 text-sm text-tierra"
          />
        </div>
        <div>
          <label htmlFor="hasta" className="block text-xs text-arena uppercase tracking-wide mb-1">
            Hasta
          </label>
          <input
            id="hasta"
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="bg-lienzo border border-arcilla rounded-2xl px-3 py-2 text-sm text-tierra"
          />
        </div>
        {rangoActivo && (
          <button
            onClick={limpiarFiltro}
            className="text-xs font-medium text-selva hover:brightness-90 px-3 py-2"
          >
            Limpiar filtro
          </button>
        )}
      </div>

      {/* Panel de recomendaciones — Knowledge-driven DSS: reglas evaluadas server-side
          sobre los KPIs ya calculados. Va primero, antes de los datos crudos, para que
          lo primero que vea el moderador sea la conclusión accionable (ley Apogeo-Final). */}
      {kpis && kpis.insights.length > 0 && (
        <div className="space-y-2 mb-6">
          {kpis.insights.map((insight, i) => {
            const style = NIVEL_STYLES[insight.nivel];
            const Icon = style.icon;
            const card = (
              <div
                className={`flex items-start gap-3 rounded-3xl-2 border px-4 py-3 min-h-[44px] ${style.bg} ${style.border}`}
              >
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${style.text}`} />
                <p className={`text-sm ${style.text}`}>{insight.mensaje}</p>
              </div>
            );
            return insight.link ? (
              <Link
                key={i}
                to={insight.link}
                className="block hover:brightness-95 transition-[filter]"
              >
                {card}
              </Link>
            ) : (
              <div key={i}>{card}</div>
            );
          })}
        </div>
      )}

      {/* KPI 1 — Tarjetas de contadores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map(({ label, testid, value, icon: Icon, color, bg, path, kpiId }) => (
          <button
            key={label}
            onClick={() => path && navigate(path)}
            disabled={!path}
            className={`bg-perla rounded-3xl-3 p-6 text-left hover:shadow-md active:scale-[0.98] transition-all ${path ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className={`w-10 h-10 rounded-2xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-xs text-arena uppercase tracking-wide mb-1">{label}</p>
            <p className="text-2xl font-bold text-tierra" data-testid={testid}>
              {value}
            </p>
            <p className="text-xs text-arena italic mt-2">
              {KPI_DESCRIPTIONS[kpiId].interpretacion}
            </p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* KPI 2 — Reportes por mes (barras) */}
        <div className="bg-perla rounded-3xl-3 p-6">
          <p className="text-xs text-arena uppercase tracking-wide mb-1">
            {rangoActivo ? 'Reportes — rango filtrado' : 'Reportes — últimos 6 meses'}
          </p>
          <p className="text-xs text-arena italic mb-4">
            {KPI_DESCRIPTIONS.reportes_por_mes.interpretacion}
          </p>
          {barData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-caoba">
              Sin datos aún
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#efebe4" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#b5a498' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#b5a498' }} />
                <Tooltip
                  contentStyle={{
                    background: '#fffdfa',
                    border: '1px solid #efebe4',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="total" fill="#ff8c00" radius={[4, 4, 0, 0]} name="Reportes" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* KPI 3 — Distribución por categoría (pie) */}
        <div className="bg-perla rounded-3xl-3 p-6">
          <p className="text-xs text-arena uppercase tracking-wide mb-1">Por categoría</p>
          <p className="text-xs text-arena italic mb-4">
            {KPI_DESCRIPTIONS.por_categoria.interpretacion}
          </p>
          {pieCategoria.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-caoba">
              Sin datos aún
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieCategoria}
                  dataKey="total"
                  nameKey="nombre"
                  cx="50%"
                  cy="50%"
                  outerRadius={72}
                  label={({ name, percent }) =>
                    (percent ?? 0) > 0.08 ? `${name} ${((percent ?? 0) * 100).toFixed(0)}%` : ''
                  }
                  labelLine={false}
                >
                  {pieCategoria.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#fffdfa',
                    border: '1px solid #efebe4',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(value, name) => [value, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* KPI 4 — Casos por estado, evolucion dia a dia (linea) */}
        <div className="bg-perla rounded-3xl-3 p-6">
          <p className="text-xs text-arena uppercase tracking-wide mb-1">Casos por estado</p>
          <p className="text-xs text-arena italic mb-4">
            {KPI_DESCRIPTIONS.casos_por_estado.interpretacion}
          </p>
          {lineCasosPorEstado.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-caoba">
              Sin datos aún
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={lineCasosPorEstado}
                margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#efebe4" />
                <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#b5a498' }} />
                <YAxis
                  yAxisId="activos"
                  tick={{ fontSize: 11, fill: '#b5a498' }}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="finalizado"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#16a34a' }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#fffdfa',
                    border: '1px solid #efebe4',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Legend
                  iconSize={10}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 10, color: '#8b7365' }}
                />
                {ESTADOS_PIPELINE.map((estado) => (
                  <Line
                    key={estado}
                    yAxisId={estado === 'Finalizado' ? 'finalizado' : 'activos'}
                    type="monotone"
                    dataKey={estado}
                    stroke={COLOR_ESTADO[estado]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* KPI 5 — Tasa de resolución (radial) */}
        <div className="bg-perla rounded-3xl-3 p-6">
          <p className="text-xs text-arena uppercase tracking-wide mb-1">Tasa de resolución</p>
          <p className="text-xs text-arena italic mb-4">
            {KPI_DESCRIPTIONS.tasa_resolucion.interpretacion}
          </p>
          <div className="flex items-center justify-center gap-8">
            <ResponsiveContainer width={180} height={180}>
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                startAngle={90}
                endAngle={-270}
                data={[
                  { value: tasaResolucion, fill: '#ff8c00' },
                  { value: 100, fill: '#efebe4' },
                ]}
              >
                <RadialBar dataKey="value" cornerRadius={8} background={false} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="text-center">
              <p className="text-4xl font-bold text-tierra">{tasaResolucion}%</p>
              <p className="text-xs text-arena mt-1">Casos finalizados</p>
            </div>
          </div>
          <p className="text-xs text-arena text-center mt-2">
            {kpis?.casos_por_estado.find((e) => e.estado === 'Finalizado')?.total ?? 0} de{' '}
            {kpis?.casos_por_estado.reduce((a, e) => a + e.total, 0) ?? 0} casos totales
          </p>
        </div>
      </div>
    </div>
  );
}
