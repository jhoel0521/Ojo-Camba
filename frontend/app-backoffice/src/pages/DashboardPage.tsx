import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, FolderOpen, Ban, CheckCircle } from 'lucide-react';
import {
  BarChart,
  Bar,
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
import { getDashboardKpis, type DashboardKpis } from '../lib/adminApi';
import { friendlyError } from '../lib/errors';
import { useAuthStore } from '../store/authStore';
import { useModeration } from '../hooks/useModeration';

// Paleta del design system Ojo Camba
const COLORS = ['#ff8c00', '#8b7365', '#5e483a', '#b5a498', '#2c221c', '#d2c8be'];

function formatMes(mes: string) {
  const [year, month] = mes.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('es-BO', { month: 'short', year: '2-digit' });
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
    },
    {
      label: 'Aceptados hoy',
      testid: 'stat-aceptados',
      value: kpis?.aceptados_hoy ?? 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Casos activos',
      testid: 'stat-casos',
      value: kpis?.casos_activos ?? 0,
      icon: FolderOpen,
      color: 'text-caoba',
      bg: 'bg-caoba/10',
      path: '/casos',
    },
    {
      label: 'Dispositivos baneados',
      testid: 'stat-baneados',
      value: kpis?.dispositivos_baneados ?? 0,
      icon: Ban,
      color: 'text-red-600',
      bg: 'bg-red-50',
      path: '/usuarios',
    },
  ];

  const barData = (kpis?.reportes_por_mes ?? []).map((r) => ({
    mes: formatMes(r.mes),
    total: r.total,
  }));

  const pieCategoria = kpis?.por_categoria ?? [];

  const pieCasos = (kpis?.casos_por_estado ?? []).map((c) => ({
    name: c.estado,
    value: c.total,
  }));

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

      {/* KPI 1 — Tarjetas de contadores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map(({ label, testid, value, icon: Icon, color, bg, path }) => (
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
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* KPI 2 — Reportes por mes (barras) */}
        <div className="bg-perla rounded-3xl-3 p-6">
          <p className="text-xs text-arena uppercase tracking-wide mb-4">
            {rangoActivo ? 'Reportes — rango filtrado' : 'Reportes — últimos 6 meses'}
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
          <p className="text-xs text-arena uppercase tracking-wide mb-4">Por categoría</p>
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

        {/* KPI 4 — Casos por estado (donut) */}
        <div className="bg-perla rounded-3xl-3 p-6">
          <p className="text-xs text-arena uppercase tracking-wide mb-4">Casos por estado</p>
          {pieCasos.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-caoba">
              Sin datos aún
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieCasos}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                >
                  {pieCasos.map((_, idx) => (
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
                />
                <Legend
                  iconSize={10}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, color: '#8b7365' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* KPI 5 — Tasa de resolución (radial) */}
        <div className="bg-perla rounded-3xl-3 p-6">
          <p className="text-xs text-arena uppercase tracking-wide mb-4">Tasa de resolución</p>
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
