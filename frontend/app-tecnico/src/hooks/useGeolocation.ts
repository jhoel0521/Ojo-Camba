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

  const capture = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({
        status: 'error',
        fix: null,
        accuracy: null,
        error: 'Este dispositivo no soporta geolocalizacion.',
      });
      return;
    }

    setState((s) => ({ ...s, status: 'loading', error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          status: 'success',
          fix: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          accuracy: pos.coords.accuracy ?? null,
          error: null,
        });
      },
      (err) => {
        setState({ status: 'error', fix: null, accuracy: null, error: messageFor(err.code) });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, []);

  const reset = useCallback(() => setState(INITIAL), []);

  return { ...state, capture, reset };
}
