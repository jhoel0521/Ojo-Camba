import { useState } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { fetchAPI } from '../lib/api';
import { getDeviceId } from '../lib/device';
import { friendlyError } from '../lib/errors';
import { useAuthStore } from '../store/authStore';

export default function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loginStore = useAuthStore((s) => s.login);

  if (!open) return null;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = tab === 'login' ? '/auth/login' : '/auth/register';
      const body = tab === 'login' ? { email, password } : { nombre, email, password };
      const data = await fetchAPI<{
        access_token: string;
        refresh_token: string;
        user: { id: number; nombre: string; email: string };
      }>(endpoint, { method: 'POST', body: JSON.stringify(body) });
      loginStore(data);
      await fetchAPI('/reportes/vincular', {
        method: 'POST',
        body: JSON.stringify({ user_id: data.user.id, device_id: getDeviceId() }),
      }).catch(() => {});
      onClose();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center bg-catedral/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-lienzo rounded-t-3xl-3 sm:rounded-3xl-3 p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex gap-4">
            <button
              onClick={() => {
                setTab('login');
                setError(null);
              }}
              className={`text-sm font-semibold pb-1 border-b-2 transition-all ${tab === 'login' ? 'text-catedral border-catedral' : 'text-arena border-transparent'}`}
            >
              Iniciar sesion
            </button>
            <button
              onClick={() => {
                setTab('register');
                setError(null);
              }}
              className={`text-sm font-semibold pb-1 border-b-2 transition-all ${tab === 'register' ? 'text-catedral border-catedral' : 'text-arena border-transparent'}`}
            >
              Crear cuenta
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 bg-perla rounded-2xl flex items-center justify-center"
          >
            <X className="w-4 h-4 text-caoba" />
          </button>
        </div>

        <div className="space-y-3">
          {tab === 'register' && (
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre"
              className="w-full bg-perla border border-arcilla rounded-3xl-2 px-4 py-2.5 text-sm text-tierra placeholder:text-almendra outline-none focus:border-caoba"
            />
          )}
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            className="w-full bg-perla border border-arcilla rounded-3xl-2 px-4 py-2.5 text-sm text-tierra placeholder:text-almendra outline-none focus:border-caoba"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contrasena"
            type="password"
            className="w-full bg-perla border border-arcilla rounded-3xl-2 px-4 py-2.5 text-sm text-tierra placeholder:text-almendra outline-none focus:border-caoba"
          />
        </div>

        {error && (
          <div className="bg-yeso rounded-2xl p-2.5 mt-3 text-center flex items-center justify-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-sol-camba shrink-0" />
            <p className="text-[11px] text-catedral font-medium">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!email || !password || loading}
          className="w-full mt-4 bg-catedral text-perla font-semibold text-sm py-3 rounded-pill disabled:opacity-30 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando...
            </>
          ) : tab === 'login' ? (
            'Iniciar sesion'
          ) : (
            'Crear cuenta'
          )}
        </button>
      </div>
    </div>
  );
}
