import { useAuthStore } from '../store/authStore';
import { fetchAPI } from '../lib/api';
import { useNavigate } from 'react-router-dom';

export default function PerfilPage() {
  const { user, isLoggedIn, logout } = useAuthStore();
  const navigate = useNavigate();

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

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-semibold text-lg text-tierra">Perfil</h2>
      <div className="bg-perla rounded-3xl-3 p-6 space-y-3">
        <div>
          <p className="text-[10px] text-arena uppercase tracking-wide">Nombre</p>
          <p className="text-sm text-tierra font-medium">{user?.nombre}</p>
        </div>
        <div>
          <p className="text-[10px] text-arena uppercase tracking-wide">Email</p>
          <p className="text-sm text-tierra font-medium">{user?.email}</p>
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="w-full bg-catedral text-perla font-semibold text-sm py-3 rounded-pill active:scale-[0.98] transition-all"
      >
        Cerrar sesion
      </button>
    </div>
  );
}
