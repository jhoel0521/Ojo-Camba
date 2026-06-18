import { useState, useEffect } from 'react';

export type GeoState =
  | { status: 'loading' }
  | { status: 'granted'; lat: number; lng: number }
  | { status: 'denied' }
  | { status: 'unavailable' }
  | { status: 'timeout' };

export function useGeolocation() {
  const [geo, setGeo] = useState<GeoState>({ status: 'loading' });

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeo({ status: 'unavailable' });
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => setGeo({ status: 'granted', lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGeo({ status: 'denied' });
        else if (err.code === err.TIMEOUT) setGeo({ status: 'timeout' });
        else setGeo({ status: 'unavailable' });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );

    return () => navigator.geolocation.clearWatch(id);
  }, []);

  return geo;
}
