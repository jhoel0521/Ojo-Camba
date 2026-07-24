import { fetchAPI } from './api';

export interface TurnoChat {
  role: 'user' | 'assistant';
  content: string;
}

export interface RespuestaChat {
  reply: string;
  redirect?: string;
  history: TurnoChat[];
}

/**
 * Habla con el asistente del Back Office. Toda la lógica del LLM y de las
 * herramientas vive en el backend: el frontend solo manda el mensaje y el
 * historial, y nunca conoce la GROQ_API_KEY.
 */
export async function chatAsistente(message: string, history: TurnoChat[]): Promise<RespuestaChat> {
  return fetchAPI<RespuestaChat>('/asistente/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  });
}
