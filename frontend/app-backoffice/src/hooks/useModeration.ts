import { useEffect, useRef, useCallback } from 'react';
import { getSocket } from '../lib/socket';
import { useModerationStore } from '../store/moderationStore';

interface UseModerationOpts {
  user: { id: number; nombre: string } | null;
  /** Reporte nuevo creado por un ciudadano. */
  onNewReport?: () => void;
  /** Reporte aceptado/rechazado/agrupado (sale de las bandejas). */
  onResolved?: (reportId: number) => void;
  /** Cambiaron los contadores del dashboard. */
  onStats?: () => void;
}

const HEARTBEAT_MS = 20_000;

/**
 * Conecta el socket de moderación: mantiene el store de claims sincronizado
 * y expone claim()/release() para el sistema de candado (ISSUE-23).
 */
export function useModeration(opts: UseModerationOpts) {
  const { setConnected, setClaim, removeClaim, setSnapshot } = useModerationStore();

  // Guardamos los callbacks en refs para que el efecto del socket sea estable.
  const cbRef = useRef(opts);
  cbRef.current = opts;

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const claimedRef = useRef<number | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onSnapshot = (claims: Array<{ reportId: number; moderadorId: number; nombre: string }>) =>
      setSnapshot(claims);
    const onClaimed = (d: { reportId: number; moderadorId: number; nombre: string }) =>
      setClaim(d.reportId, { moderadorId: d.moderadorId, nombre: d.nombre });
    const onReleased = (d: { reportId: number }) => removeClaim(d.reportId);
    const onNew = () => cbRef.current.onNewReport?.();
    const onResolved = (d: { reportId: number }) => cbRef.current.onResolved?.(d.reportId);
    const onStats = () => cbRef.current.onStats?.();

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('claims:snapshot', onSnapshot);
    socket.on('report:claimed', onClaimed);
    socket.on('report:released', onReleased);
    socket.on('report:new', onNew);
    socket.on('report:resolved', onResolved);
    socket.on('stats:update', onStats);

    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('claims:snapshot', onSnapshot);
      socket.off('report:claimed', onClaimed);
      socket.off('report:released', onReleased);
      socket.off('report:new', onNew);
      socket.off('report:resolved', onResolved);
      socket.off('stats:update', onStats);
    };
  }, [setConnected, setClaim, removeClaim, setSnapshot]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const claim = useCallback(
    (reportId: number) => {
      const user = cbRef.current.user;
      if (!user) return;
      const socket = getSocket();
      socket.emit('report:claim', { reportId, moderadorId: user.id, nombre: user.nombre });
      claimedRef.current = reportId;
      stopHeartbeat();
      heartbeatRef.current = setInterval(
        () => socket.emit('report:heartbeat', { reportId }),
        HEARTBEAT_MS,
      );
    },
    [stopHeartbeat],
  );

  const release = useCallback(
    (reportId: number) => {
      const socket = getSocket();
      socket.emit('report:release', { reportId });
      if (claimedRef.current === reportId) {
        claimedRef.current = null;
        stopHeartbeat();
      }
    },
    [stopHeartbeat],
  );

  // Liberar al desmontar (cerrar pestaña/cambiar de página).
  useEffect(
    () => () => {
      if (claimedRef.current !== null) {
        getSocket().emit('report:release', { reportId: claimedRef.current });
      }
      stopHeartbeat();
    },
    [stopHeartbeat],
  );

  return { claim, release };
}
