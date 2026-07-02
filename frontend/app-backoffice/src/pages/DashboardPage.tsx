import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ClipboardList,
  FolderOpen,
  FileText,
  Ban,
  CheckCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { getDashboardKpis, type DashboardKpis, type DashboardInsight } from '../lib/adminApi';
import { KPI_DESCRIPTIONS } from '../lib/kpiDescriptions';
import { friendlyError } from '../lib/errors';
import { useAuthStore } from '../store/authStore';
import { useModeration } from '../hooks/useModeration';
import { useTagFilter } from '../hooks/useTagFilter';
import { CATEGORIA_NAMES } from '../lib/categories';
import DashboardFilters from '../components/DashboardFilters';
import TrendChart from '../components/charts/TrendChart';
import StateEvolutionChart from '../components/charts/StateEvolutionChart';

// Paleta del design system Ojo Camba
const COLORS = ['#ff8c00', '#8b7365', '#5e483a', '#b5a498', '#2c221c', '#d2c8be'];

// Catálogos para los tag filters
const ESTADO_CATALOG = [
  'Reportado',
  'Aceptado',
  'Rechazado',
  'ValidacionEnCampo',
  'EnTrabajo',
  'Finalizado',
] as const;

const CATEGORIA_CATALOG = Object.values(CATEGORIA_NAMES) as readonly string[];

// Estilos por nivel de insight
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

type Granularidad = 'mes' | 'semana' | 'dia';

function getDefaultDates(g: Granularidad = 'mes') {
  const today = new Date();
  const hastaStr = today.toISOString().slice(0, 10);
  const desdeDate = new Date(today);
  if (g === 'mes') {
    desdeDate.setMonth(desdeDate.getMonth() - 5);
    desdeDate.setDate(1);
  } else if (g === 'semana') {
    desdeDate.setDate(desdeDate.getDate() - 12 * 7);
  } else {
    desdeDate.setDate(desdeDate.getDate() - 29);
  }
  const desdeStr = desdeDate.toISOString().slice(0, 10);
  return { desde: desdeStr, hasta: hastaStr };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);

  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Leer valores iniciales de URL searchParams o calcular defaults
  const urlGranularidad = (searchParams.get('granularidad') as Granularidad) || 'mes';
  const defaultDates = useMemo(() => getDefaultDates(urlGranularidad), [urlGranularidad]);

  const desde = searchParams.get('desde') ?? defaultDates.desde;
  const hasta = searchParams.get('hasta') ?? defaultDates.hasta;
  const granularidad = urlGranularidad;

  // Tag filters
  const estadoFilter = useTagFilter(ESTADO_CATALOG);
  const categoriaFilter = useTagFilter(CATEGORIA_CATALOG);

  // Inicializar sets de tags a partir de URL en primer render
  useEffect(() => {
    const estIn = searchParams.get('estado_in')?.split(',').filter(Boolean) ?? [];
    const estOut = searchParams.get('estado_out')?.split(',').filter(Boolean) ?? [];
    const catIn = searchParams.get('categoria_in')?.split(',').filter(Boolean) ?? [];
    const catOut = searchParams.get('categoria_out')?.split(',').filter(Boolean) ?? [];

    estIn.forEach((label) => estadoFilter.toggleInclude(label as (typeof ESTADO_CATALOG)[number]));
    estOut.forEach((label) => estadoFilter.toggleExclude(label as (typeof ESTADO_CATALOG)[number]));
    catIn.forEach((label) =>
      categoriaFilter.toggleInclude(label as (typeof CATEGORIA_CATALOG)[number]),
    );
    catOut.forEach((label) =>
      categoriaFilter.toggleExclude(label as (typeof CATEGORIA_CATALOG)[number]),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const estadoIn = useMemo(
    () => Array.from(estadoFilter.include).join(','),
    [estadoFilter.include],
  );
  const estadoOut = useMemo(
    () => Array.from(estadoFilter.exclude).join(','),
    [estadoFilter.exclude],
  );
  const categoriaIn = useMemo(
    () => Array.from(categoriaFilter.include).join(','),
    [categoriaFilter.include],
  );
  const categoriaOut = useMemo(
    () => Array.from(categoriaFilter.exclude).join(','),
    [categoriaFilter.exclude],
  );

  // Sincronizar estado completo con URL searchParams para compartir/bookmarking
  const updateUrlParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(updates).forEach(([k, v]) => {
            if (v) next.set(k, v);
            else next.delete(k);
          });
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Sincronizar tag filters con URL al cambiar los sets
  useEffect(() => {
    updateUrlParams({
      estado_in: estadoIn || undefined,
      estado_out: estadoOut || undefined,
      categoria_in: categoriaIn || undefined,
      categoria_out: categoriaOut || undefined,
    });
  }, [estadoIn, estadoOut, categoriaIn, categoriaOut, updateUrlParams]);

  const load = useCallback(() => {
    setLoading(true);
    getDashboardKpis(
      desde || undefined,
      hasta || undefined,
      granularidad,
      estadoIn || undefined,
      estadoOut || undefined,
      categoriaIn || undefined,
      categoriaOut || undefined,
    )
      .then(setKpis)
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false));
  }, [desde, hasta, granularidad, estadoIn, estadoOut, categoriaIn, categoriaOut]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDateRangeChange = useCallback(
    (d: string, h: string) => {
      updateUrlParams({ desde: d || undefined, hasta: h || undefined });
    },
    [updateUrlParams],
  );

  const handleClearDateRange = useCallback(() => {
    const defs = getDefaultDates(granularidad);
    updateUrlParams({ desde: defs.desde, hasta: defs.hasta });
  }, [granularidad, updateUrlParams]);

  const handleGranularidadChange = useCallback(
    (g: Granularidad) => {
      const defs = getDefaultDates(g);
      updateUrlParams({ granularidad: g, desde: defs.desde, hasta: defs.hasta });
    },
    [updateUrlParams],
  );

  useModeration({
    user: user ? { id: user.id, nombre: user.nombre } : null,
    onStats: load,
  });

  const pieCategoria = kpis?.por_categoria ?? [];
  const casosPorEstado = kpis?.casos_por_estado ?? [];
  const tasaResolucion = kpis?.tasa_resolucion ?? 0;

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
      label: 'Reportes activos',
      testid: 'stat-reportes-activos',
      value: kpis?.reportes_activos ?? 0,
      icon: FileText,
      color: 'text-ladrillo',
      bg: 'bg-ladrillo/10',
      path: undefined,
      kpiId: 'reportes_activos',
    },
    {
      label: 'Obras activas',
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

  const rangoActivo = !!(desde || hasta);

  return (
    <div>
      <h2 className="font-semibold text-xl text-tierra mb-6">Dashboard</h2>

      {/* Panel de filtros — fechas con debounce auto-apply (350ms), URL sync, tags */}
      <DashboardFilters
        desde={desde}
        hasta={hasta}
        granularidad={granularidad}
        estadoCatalog={ESTADO_CATALOG}
        categoriaCatalog={CATEGORIA_CATALOG}
        estadoInclude={estadoFilter.include as Set<string>}
        estadoExclude={estadoFilter.exclude as Set<string>}
        categoriaInclude={categoriaFilter.include as Set<string>}
        categoriaExclude={categoriaFilter.exclude as Set<string>}
        onDateRangeChange={handleDateRangeChange}
        onClearDateRange={handleClearDateRange}
        onGranularidadChange={handleGranularidadChange}
        onToggleEstadoInclude={estadoFilter.toggleInclude as (l: string) => void}
        onToggleEstadoExclude={estadoFilter.toggleExclude as (l: string) => void}
        onToggleCategoriaInclude={categoriaFilter.toggleInclude as (l: string) => void}
        onToggleCategoriaExclude={categoriaFilter.toggleExclude as (l: string) => void}
      />

      {/* Panel de recomendaciones — Knowledge-driven DSS. El mensaje es texto
          plano seleccionable/copiable — la navegación vive en un "Ver" chico
          y explícito, no en toda la tarjeta (evita que seleccionar el texto
          dispare una navegación accidental). */}
      {kpis && kpis.insights.length > 0 && (
        <div className="space-y-2 mb-6">
          {kpis.insights.map((insight, i) => {
            const style = NIVEL_STYLES[insight.nivel];
            const Icon = style.icon;
            return (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-3xl-2 border px-4 py-3 ${style.bg} ${style.border}`}
              >
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${style.text}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${style.text}`}>{insight.mensaje}</p>
                  {insight.link && (
                    <Link
                      to={insight.link}
                      className={`inline-flex items-center gap-1 mt-1 min-h-[44px] py-2 -my-2 text-xs font-semibold ${style.text} hover:brightness-90`}
                    >
                      Ver <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* KPI 1 — Tarjetas de contadores. Texto plano seleccionable/copiable —
          la navegación vive en un "Ver" chico al final, no en toda la
          tarjeta (antes un <button> envolvía todo y capturaba el click al
          intentar seleccionar/copiar el número). */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {cards.map(({ label, testid, value, icon: Icon, color, bg, path, kpiId }) => (
          <div key={label} className="bg-perla rounded-3xl-3 p-6">
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
            {path && (
              <button
                onClick={() => navigate(path)}
                className="mt-2 -ml-2 inline-flex items-center gap-1 min-h-[44px] px-2 text-xs font-semibold text-caoba hover:text-ladrillo"
              >
                Ver <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* KPI 4 — Casos por estado, evolución día a día (FULL WIDTH, arriba) */}
      <div className="bg-perla rounded-3xl-3 p-6 mb-4">
        <p className="text-xs text-arena uppercase tracking-wide mb-1">Casos por estado</p>
        <p className="text-xs text-arena italic mb-4">
          {KPI_DESCRIPTIONS.casos_por_estado.interpretacion}
        </p>
        <StateEvolutionChart
          historico={kpis?.casos_por_estado_historico ?? []}
          granularidad={granularidad}
        />
      </div>

      {/* Gráficas secundarias — grid 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* KPI 2 — Tendencia de reportes */}
        <div className="bg-perla rounded-3xl-3 p-6">
          <p className="text-xs text-arena uppercase tracking-wide mb-1">
            {rangoActivo ? 'Reportes — rango filtrado' : 'Reportes — tendencia'}
          </p>
          <p className="text-xs text-arena italic mb-4">
            {KPI_DESCRIPTIONS.reportes_por_periodo.interpretacion}
          </p>
          <TrendChart data={kpis?.reportes_por_periodo ?? []} granularidad={granularidad} />
        </div>

        {/* KPI 2b — Obras finalizadas por período (flujo, comparable en escala a reportes_por_periodo) */}
        <div className="bg-perla rounded-3xl-3 p-6">
          <p className="text-xs text-arena uppercase tracking-wide mb-1">
            Obras finalizadas — {rangoActivo ? 'rango filtrado' : 'tendencia'}
          </p>
          <p className="text-xs text-arena italic mb-4">
            {KPI_DESCRIPTIONS.finalizados_por_periodo.interpretacion}
          </p>
          <TrendChart data={kpis?.finalizados_por_periodo ?? []} granularidad={granularidad} />
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
            {casosPorEstado.find((e) => e.estado === 'Finalizado')?.total ?? 0} de{' '}
            {casosPorEstado.reduce((a, e) => a + e.total, 0)} casos totales
          </p>
        </div>
      </div>
    </div>
  );
}
