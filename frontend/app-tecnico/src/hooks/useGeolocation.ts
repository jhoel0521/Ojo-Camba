import { useState, useCallback } from 'react';
import type { GpsFix } from '../lib/actualizacion';

export type GeoStatus = 'idle' | 'loading' | 'success' | 'error';

interface GeoState {
  status: GeoStatus;
  fix: GpsFix | null;
  accuracy: number | null;
  error: string | null;
}

const INITIAL: GeoState = { status: 'idle', fix: null, accuracy: null, error: null };

function messageFor(code: number): string {
  switch (code) {
    case 1:
      return 'Permiso de ubicacion denegado. Activalo para corregir el GPS.';
    case 2:
      return 'No se pudo determinar la ubicacion. Intenta de nuevo.';
    case 3:
      return 'La solicitud de ubicacion tardo demasiado. Intenta de nuevo.';
    default:
      return 'No se pudo obtener la ubicacion.';
  }
}

/**
 * Captura la latitud/longitud actual del dispositivo para la correccion
 * GPS en terreno (criterio de aceptacion #2).
 */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>(INITIAL);

  const capture = useCallback((): Promise<GpsFix> => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      const error = 'Este dispositivo no soporta geolocalizacion.';
      setState({
        status: 'error',
        fix: null,
        accuracy: null,
        error,
      });
      return Promise.reject(new Error(error));
    }

    setState((s) => ({ ...s, status: 'loading', error: null }));
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const fix = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setState({ status: 'success', fix, accuracy: pos.coords.accuracy ?? null, error: null });
          resolve(fix);
        },
        (err) => {
          const error = messageFor(err.code);
          setState({ status: 'error', fix: null, accuracy: null, error });
          reject(new Error(error));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    });
  }, []);

  const reset = useCallback(() => setState(INITIAL), []);

  return { ...state, capture, reset };
}
