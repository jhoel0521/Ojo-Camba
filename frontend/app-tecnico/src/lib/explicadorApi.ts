import { fetchAPI } from './api';

export interface ExplicacionIA {
  explicacion: string;
  /** Números citados por la IA que no están en el resultado técnico (revisión humana). */
  numerosSospechosos: string[];
}

/**
 * Pide al Agente Explicador del backend que traduzca un resultado técnico a
 * lenguaje natural. La llamada al LLM ocurre en el servidor: el frontend nunca
 * habla con Groq ni conoce la API key.
 */
export async function explicar(
  tipo: 'triaje' | 'ruta',
  resultado: unknown,
): Promise<ExplicacionIA> {
  return fetchAPI<ExplicacionIA>('/explicador/explicar', {
    method: 'POST',
    body: JSON.stringify({ tipo, resultado }),
  });
}
