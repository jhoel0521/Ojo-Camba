import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { getQueue, flush } from '../lib/offlineQueue';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function useOfflineWatcher() {
  const wasOffline = useRef(false);

  useEffect(() => {
    const handleOnline = async () => {
      if (wasOffline.current) {
        const sent = await flush(API_URL);
        if (sent && sent > 0) {
          toast.success(`${sent} reporte${sent !== 1 ? 's' : ''} enviado${sent !== 1 ? 's' : ''}`);
        }
        wasOffline.current = false;
        toast.dismiss('offline');
      }
    };

    const handleOffline = () => {
      wasOffline.current = true;
      const pending = getQueue().length;
      toast.warning(
        pending > 0
          ? `Sin conexion — ${pending} pendiente${pending !== 1 ? 's' : ''}`
          : 'Sin conexion',
        { id: 'offline', duration: Infinity },
      );
    };

    if (!navigator.onLine) {
      handleOffline();
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      toast.dismiss('offline');
    };
  }, []);
}
