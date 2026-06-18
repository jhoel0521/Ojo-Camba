import { useEffect, useState } from 'react';
import { fetchAPI } from '../lib/api';
import { getDeviceId } from '../lib/device';
import { useAuthStore } from '../store/authStore';
import ReporteCard from '../components/ReporteCard';

interface ReporteItem {
  id: number;
  categoria_id: number;
  estado: string;
  url_imagen: string;
  creado_en: string;
}

export default function MisReportesPage() {
  const [reportes, setReportes] = useState<ReporteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isLoggedIn } = useAuthStore();

  useEffect(() => {
    let params: URLSearchParams;
    if (isLoggedIn && user) {
      params = new URLSearchParams({ usuario_id: String(user.id) });
    } else {
      params = new URLSearchParams({ device_id: getDeviceId() });
    }
    fetchAPI<{ data: ReporteItem[] }>(`/reportes?${params}`)
      .then((r) => setReportes(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoggedIn, user]);

  return (
    <div className="p-4 space-y-3">
      <h2 className="font-semibold text-lg text-tierra">Mis Reportes</h2>
      {loading && <p className="text-sm text-arena">Cargando...</p>}
      {!loading && reportes.length === 0 && (
        <div className="bg-perla rounded-3xl-3 p-8 text-center">
          <p className="text-sm text-caoba">No tienes reportes aun.</p>
        </div>
      )}
      {reportes.map((r) => (
        <ReporteCard key={r.id} {...r} />
      ))}
    </div>
  );
}
