import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa_install_dismissed';

export function useInstallPrompt() {
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;

      if (localStorage.getItem(DISMISSED_KEY)) return;

      setTimeout(() => {
        toast('Agregar a pantalla de inicio', {
          description: 'Usa Ojo Camba como una app sin abrir el navegador',
          duration: 10000,
          action: {
            label: 'Instalar',
            onClick: () => deferred.current?.prompt(),
          },
          dismissible: true,
          onDismiss: () => localStorage.setItem(DISMISSED_KEY, '1'),
        });
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
}
