import { useEffect } from 'react';

export interface DeviceInfo {
  hasCamera: boolean;
  hasGPS: boolean;
  canReport: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  deviceId: string;
}

export function useDevice(callback: (info: DeviceInfo) => void) {
  useEffect(() => {
    let deviceId = localStorage.getItem('ojo_camba_device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('ojo_camba_device_id', deviceId);
    }

    const checkMedia = async () => {
      let hasCamera = false;
      try {
        if (navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach((t) => t.stop());
          hasCamera = true;
        }
      } catch {
        hasCamera = false;
      }

      const hasGPS = 'geolocation' in navigator;
      const w = window.innerWidth;
      const info: DeviceInfo = {
        hasCamera,
        hasGPS,
        canReport: hasCamera && hasGPS,
        isMobile: w < 768,
        isDesktop: w >= 1024,
        deviceId,
      };
      callback(info);
    };

    checkMedia();
  }, [callback]);
}
