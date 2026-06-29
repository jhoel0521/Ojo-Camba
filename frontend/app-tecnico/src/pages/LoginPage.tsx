import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { HardHat, Mail, Lock, LogIn, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { fetchAPI } from '../lib/api';

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(1, 'La contrasena es obligatoria'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setError('');
    setLoading(true);
    try {
      const loginRes = await fetchAPI<{
        access_token: string;
        refresh_token: string;
        user: { id: number; nombre: string; email: string };
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      const validateRes = await fetchAPI<{
        valid: boolean;
        user_id: number;
        roles: string[];
      }>('/auth/validate', {
        method: 'POST',
        body: JSON.stringify({ token: loginRes.access_token }),
      });

      if (!validateRes.valid) {
        setError('Token invalido. Intenta de nuevo.');
        return;
      }

      login({
        access_token: loginRes.access_token,
        refresh_token: loginRes.refresh_token,
        user: {
          id: loginRes.user.id,
          nombre: loginRes.user.nombre,
          email: loginRes.user.email,
          roles: validateRes.roles ?? [],
        },
      });

      navigate('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesion';
      if (msg.includes('401') || msg.includes('Credenciales')) {
        setError('Email o contrasena incorrectos.');
      } else if (msg.includes('Failed to fetch')) {
        setError('Sin conexion. Verifica tu internet.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-lienzo font-pirai p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-selva rounded-hero mb-4">
            <HardHat className="w-8 h-8 text-lienzo" />
          </div>
          <h1 className="text-2xl font-semibold text-tierra">Ojo Camba</h1>
          <p className="text-sm text-arena mt-1">App de Tecnicos — Bitacora de obras</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-perla rounded-3xl-3 p-6 space-y-4">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3"
            >
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-ladrillo uppercase tracking-wide mb-1.5"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-arena" />
              <input
                id="email"
                {...register('email')}
                type="email"
                placeholder="tecnico@ojocamba.bo"
                autoComplete="email"
                className="bg-lienzo border border-arcilla rounded-3xl-3 pl-10 pr-5 py-3.5 text-sm text-tierra placeholder:text-almendra w-full focus:outline-none focus:border-selva transition-colors"
              />
            </div>
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-ladrillo uppercase tracking-wide mb-1.5"
            >
              Contrasena
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-arena" />
              <input
                id="password"
                {...register('password')}
                type="password"
                placeholder="********"
                autoComplete="current-password"
                className="bg-lienzo border border-arcilla rounded-3xl-3 pl-10 pr-5 py-3.5 text-sm text-tierra placeholder:text-almendra w-full focus:outline-none focus:border-selva transition-colors"
              />
            </div>
            {errors.password && (
              <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-selva text-perla font-medium text-sm px-8 py-3.5 rounded-3xl-3 shadow-md hover:brightness-110 disabled:opacity-60 transition-all"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-perla/30 border-t-perla rounded-full animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
