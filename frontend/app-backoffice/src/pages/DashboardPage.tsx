import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, FolderOpen, Ban, CheckCircle } from 'lucide-react';
import { getDashboard, type DashboardStats } from '../lib/adminApi';
import { friendlyError } from '../lib/errors';
import { useAuthStore } from '../store/authStore';
import { useModeration } from '../hooks/useModeration';

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    getDashboard()
      .then(setStats)
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Tiempo real: refrescar contadores cuando cambian (stats:update).
  useModeration({
    user: user ? { id: user.id, nombre: user.nombre } : null,
    onStats: load,
  });

  if (loading) {
    return (
      <div>
        <h2 className="font-semibold text-xl text-tierra mb-6">Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-perla rounded-3xl-3 p-6 animate-pulse">
              <div className="h-3 bg-yeso rounded w-20 mb-3" />
              <div className="h-8 bg-yeso rounded w-12" />
            </div>
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
      value: stats?.pendientes ?? 0,
      icon: ClipboardList,
      color: 'text-sol-camba',
      bg: 'bg-sol-camba/10',
      path: '/revisar',
    },
    {
      label: 'Aceptados hoy',
      testid: 'stat-aceptados',
      value: stats?.aceptados_hoy ?? 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Casos activos',
      testid: 'stat-casos',
      value: stats?.casos_activos ?? 0,
      icon: FolderOpen,
      color: 'text-caoba',
      bg: 'bg-caoba/10',
      path: '/casos',
    },
    {
      label: 'Dispositivos baneados',
      testid: 'stat-baneados',
      value: stats?.dispositivos_baneados ?? 0,
      icon: Ban,
      color: 'text-red-600',
      bg: 'bg-red-50',
      path: '/usuarios',
    },
  ];

  return (
    <div>
      <h2 className="font-semibold text-xl text-tierra mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
    </div>
  );
}
