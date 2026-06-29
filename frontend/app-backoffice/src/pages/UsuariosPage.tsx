import { useEffect, useState, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ban, Search, ShieldOff } from 'lucide-react';
import {
  listUsers,
  listDevices,
  banDevice,
  unbanDevice,
  type Usuario,
  type Dispositivo,
} from '../lib/adminApi';
import { friendlyError } from '../lib/errors';
import Pagination from '../components/Pagination';

const banSchema = z.object({
  device_id: z.string().min(1, 'El Device ID es obligatorio'),
  motivo: z.string().min(1, 'El motivo es obligatorio'),
});

type BanForm = z.infer<typeof banSchema>;

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [userLoading, setUserLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [devices, setDevices] = useState<Dispositivo[]>([]);
  const [devPage, setDevPage] = useState(1);
  const [devTotal, setDevTotal] = useState(0);
  const [devLoading, setDevLoading] = useState(true);

  const [error, setError] = useState('');
  const [banSuccess, setBanSuccess] = useState('');
  const [banning, setBanning] = useState(false);
  const [unbanning, setUnbanning] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: banErrors },
  } = useForm<BanForm>({
    resolver: zodResolver(banSchema),
  });

  const fetchUsers = useCallback(async () => {
    setUserLoading(true);
    try {
      const res = await listUsers(userPage, 20, debouncedSearch || undefined);
      setUsuarios(res.data);
      setUserTotal(res.total);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setUserLoading(false);
    }
  }, [userPage, debouncedSearch]);

  const fetchDevices = useCallback(async () => {
    setDevLoading(true);
    try {
      const res = await listDevices(devPage, 20, true);
      setDevices(res.data);
      setDevTotal(res.total);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setDevLoading(false);
    }
  }, [devPage]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleSearchChange = (value: string) => {
    setUserSearch(value);
    setUserPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 350);
  };

  const onBan = async (data: BanForm) => {
    setBanning(true);
    setError('');
    setBanSuccess('');
    try {
      await banDevice(data.device_id, data.motivo);
      reset();
      setBanSuccess(`Dispositivo ${data.device_id} baneado exitosamente.`);
      fetchDevices();
      setTimeout(() => setBanSuccess(''), 4000);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBanning(false);
    }
  };

  const handleUnban = async (device_id: string) => {
    setUnbanning(device_id);
    setError('');
    try {
      await unbanDevice(device_id);
      setBanSuccess(`Dispositivo ${device_id.slice(0, 12)}... desbaneado.`);
      fetchDevices();
      setTimeout(() => setBanSuccess(''), 4000);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setUnbanning(null);
    }
  };

  return (
    <div>
      <h2 className="font-semibold text-xl text-tierra mb-6">Gestion de Usuarios</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-4 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold text-sm text-tierra mb-3">Usuarios registrados</h3>

          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-arena" />
            <input
              value={userSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className="bg-lienzo border border-arcilla rounded-3xl-3 pl-10 pr-4 py-2.5 text-sm text-tierra placeholder:text-almendra w-full focus:outline-none focus:border-caoba transition-colors"
            />
          </div>

          {userLoading && usuarios.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-perla rounded-3xl-2 p-3 animate-pulse">
                  <div className="h-4 bg-yeso rounded w-32 mb-2" />
                  <div className="h-3 bg-yeso rounded w-48" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {usuarios.length === 0 && (
                <p className="text-xs text-arena py-4 text-center">
                  {userSearch ? `Sin resultados para "${userSearch}".` : 'No hay usuarios.'}
                </p>
              )}
              <div className="space-y-2">
                {usuarios.map((u) => (
                  <div key={u.id} className="bg-perla rounded-3xl-2 p-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-tierra truncate">{u.nombre}</p>
                        <p className="text-xs text-arena truncate">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {u.roles?.map((r) => (
                          <span
                            key={r}
                            className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-pill bg-arena/20 text-ladrillo"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] text-arena mt-1">
                      ID #{u.id} &middot; Registro:{' '}
                      {new Date(u.creado_en).toLocaleDateString('es-BO')}
                    </p>
                  </div>
                ))}
              </div>
              <Pagination page={userPage} total={userTotal} limit={20} onPageChange={setUserPage} />
            </>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-sm text-tierra mb-3">Banear dispositivo</h3>

          {banSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-3">
              <p className="text-sm text-green-700">{banSuccess}</p>
            </div>
          )}

          <form
            onSubmit={handleSubmit(onBan)}
            className="bg-perla rounded-3xl-3 p-4 space-y-3 mb-4"
          >
            <div>
              <label className="block text-[10px] font-semibold text-ladrillo uppercase tracking-wide mb-1">
                Device ID
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-arena" />
                <input
                  {...register('device_id')}
                  placeholder="UUID del dispositivo"
                  className="bg-lienzo border border-arcilla rounded-3xl-3 pl-10 pr-4 py-3 text-sm text-tierra placeholder:text-almendra w-full focus:outline-none focus:border-caoba transition-colors"
                />
              </div>
              {banErrors.device_id && (
                <p className="text-xs text-red-600 mt-1">{banErrors.device_id.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-ladrillo uppercase tracking-wide mb-1">
                Motivo
              </label>
              <input
                {...register('motivo')}
                placeholder="Ej: spam, fotos inapropiadas"
                className="bg-lienzo border border-arcilla rounded-3xl-3 px-4 py-3 text-sm text-tierra placeholder:text-almendra w-full focus:outline-none focus:border-caoba transition-colors"
              />
              {banErrors.motivo && (
                <p className="text-xs text-red-600 mt-1">{banErrors.motivo.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={banning}
              className="flex items-center gap-2 bg-red-600 text-perla font-medium text-sm px-5 py-3 rounded-3xl-3 hover:bg-red-700 disabled:opacity-60 transition-all"
            >
              <Ban className="w-4 h-4" />
              {banning ? 'Baneando...' : 'Banear dispositivo'}
            </button>
          </form>

          <h4 className="font-semibold text-xs text-tierra mb-2">Dispositivos baneados</h4>
          {devLoading && devices.length === 0 ? (
            <div className="bg-perla rounded-3xl-2 p-4 animate-pulse">
              <div className="h-4 bg-yeso rounded w-28 mb-2" />
              <div className="h-3 bg-yeso rounded w-40" />
            </div>
          ) : devices.length === 0 ? (
            <p className="text-xs text-arena">No hay dispositivos baneados.</p>
          ) : (
            <>
              <div className="space-y-2">
                {devices.map((d) => (
                  <div
                    key={d.device_id}
                    className="bg-red-50 border border-red-200 rounded-3xl-2 p-3 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-tierra truncate">{d.device_id}</p>
                      {d.motivo_ban && (
                        <p className="text-[10px] text-red-700 mt-0.5">Motivo: {d.motivo_ban}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleUnban(d.device_id)}
                      disabled={unbanning === d.device_id}
                      title="Quitar ban"
                      className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-caoba hover:text-tierra disabled:opacity-50 transition-colors px-2 py-1 rounded-pill bg-perla border border-arcilla"
                    >
                      <ShieldOff className="w-3 h-3" />
                      {unbanning === d.device_id ? '...' : 'Desbanear'}
                    </button>
                  </div>
                ))}
              </div>
              <Pagination page={devPage} total={devTotal} limit={20} onPageChange={setDevPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
