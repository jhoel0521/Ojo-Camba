import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { fetchAPI } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { Award, FileText, TrendingUp, Loader2 } from 'lucide-react';

interface ProfileData {
  nombre: string;
  email: string;
  puntos: number;
  nivel_id: number | null;
  roles: string[];
  creado_en: string;
}

export default function PerfilPage() {
  const { user, isLoggedIn, logout } = useAuthStore();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [totalReportes, setTotalReportes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetchAPI<ProfileData>(`/auth/profile/${user.id}`),
      fetchAPI<{ total: number }>(`/reportes?usuario_id=${user.id}&limit=1`),
    ])
      .then(([p, r]) => {
        setProfile(p);
        setTotalReportes(r.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const handleLogout = async () => {
    if (user) {
      await fetchAPI('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ user_id: user.id }),
      }).catch(() => {});
    }
    logout();
    navigate('/');
  };

  if (!isLoggedIn) {
    return (
      <div className="p-4">
        <div className="bg-perla rounded-3xl-3 p-8 text-center">
          <p className="text-sm text-caoba mb-3">Inicia sesion para ver tu perfil.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-caoba animate-spin" />
      </div>
    );
  }

  const fechaRegistro = profile?.creado_en
    ? new Date(profile.creado_en).toLocaleDateString('es-BO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-semibold text-lg text-tierra">Perfil</h2>

      <div className="bg-perla rounded-3xl-3 p-6 space-y-4">
        <div>
          <p className="text-[10px] text-arena uppercase tracking-wide">Nombre</p>
          <p className="text-sm text-tierra font-medium">{profile?.nombre}</p>
        </div>
        <div>
          <p className="text-[10px] text-arena uppercase tracking-wide">Email</p>
          <p className="text-sm text-tierra font-medium">{profile?.email}</p>
        </div>
        {fechaRegistro && (
          <div>
            <p className="text-[10px] text-arena uppercase tracking-wide">Miembro desde</p>
            <p className="text-sm text-tierra font-medium">{fechaRegistro}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-perla rounded-3xl-2 p-4 text-center">
          <FileText className="w-5 h-5 text-caoba mx-auto mb-1" />
          <p className="text-xl font-bold text-tierra">{totalReportes}</p>
          <p className="text-[10px] text-arena uppercase tracking-wide mt-0.5">Reportes</p>
        </div>

        <div className="bg-perla rounded-3xl-2 p-4 text-center">
          <Award className="w-5 h-5 text-sol-camba mx-auto mb-1" />
          <p className="text-xl font-bold text-tierra">{profile?.puntos ?? 0}</p>
          <p className="text-[10px] text-arena uppercase tracking-wide mt-0.5">Puntos</p>
        </div>

        <div className="bg-perla rounded-3xl-2 p-4 text-center">
          <TrendingUp className="w-5 h-5 text-ladrillo mx-auto mb-1" />
          <p className="text-xl font-bold text-tierra">
            {profile?.nivel_id ? `Nv. ${profile.nivel_id}` : '—'}
          </p>
          <p className="text-[10px] text-arena uppercase tracking-wide mt-0.5">Nivel</p>
        </div>
      </div>

      <p className="text-[10px] text-arena text-center">
        Gamificacion completa en ISSUE-18 &mdash; niveles y stickers desbloqueables proximamente
      </p>

      <button
        onClick={handleLogout}
        className="w-full bg-catedral text-perla font-semibold text-sm py-3 rounded-pill active:scale-[0.98] transition-all"
      >
        Cerrar sesion
      </button>
    </div>
  );
}
