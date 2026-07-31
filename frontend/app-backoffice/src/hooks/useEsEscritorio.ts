import { useEffect, useState } from 'react';

/** `lg` de Tailwind: el corte donde el panel pasa de pestanas a lado a lado. */
const CONSULTA = '(min-width: 1024px)';

/**
 * Distingue escritorio de movil en JavaScript, no con `hidden lg:block`.
 *
 * Con clases de CSS los dos arboles quedan en el DOM y solo uno se ve: el panel
 * de decision se montaria dos veces y con el dos instancias de Leaflet. Ademas
 * las pruebas que buscan un encabezado lo encontrarian duplicado.
 */
export function useEsEscritorio(): boolean {
  const [esEscritorio, setEsEscritorio] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(CONSULTA).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(CONSULTA);
    const alCambiar = (evento: MediaQueryListEvent) => setEsEscritorio(evento.matches);
    setEsEscritorio(media.matches);
    media.addEventListener('change', alCambiar);
    return () => media.removeEventListener('change', alCambiar);
  }, []);

  return esEscritorio;
}
