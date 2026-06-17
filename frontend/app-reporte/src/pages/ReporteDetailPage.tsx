import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function ReporteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="px-4 py-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-caoba mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>
      <div className="bg-perla rounded-3xl-3 p-6">
        <h2 className="font-semibold text-lg text-tierra">Reporte #{id}</h2>
        <p className="text-sm text-caoba mt-2">Detalle y timeline en desarrollo.</p>
      </div>
    </div>
  );
}
