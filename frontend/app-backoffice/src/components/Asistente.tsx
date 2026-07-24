import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, X, Send, Loader2, Sparkles } from 'lucide-react';
import { chatAsistente, type TurnoChat } from '../lib/asistenteApi';
import { friendlyError } from '../lib/errors';

const SUGERENCIAS = [
  '¿Cuántos reportes pendientes hay?',
  'Explicá el triaje del reporte 1',
  'Mostrame los casos activos',
];

/**
 * Asistente conversacional del Back Office. Es un agente con herramientas del
 * lado servidor: acá solo se envía el texto y se muestra la conversación. Si el
 * backend responde con un redirect (herramienta "navegar"), se navega.
 */
export default function Asistente() {
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<TurnoChat[]>([]);
  const [entrada, setEntrada] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, enviando]);

  async function enviar(texto: string): Promise<void> {
    const mensaje = texto.trim();
    if (!mensaje || enviando) return;

    const historial = mensajes;
    setMensajes([...historial, { role: 'user', content: mensaje }]);
    setEntrada('');
    setError('');
    setEnviando(true);
    try {
      const res = await chatAsistente(mensaje, historial);
      setMensajes(res.history);
      if (res.redirect) navigate(res.redirect);
    } catch (e) {
      // Se conserva el mensaje del usuario; se muestra el error sin romper el chat.
      setError(friendlyError(e));
    } finally {
      setEnviando(false);
    }
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        data-testid="btn-abrir-asistente"
        aria-label="Abrir asistente"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-catedral text-lienzo font-semibold text-sm px-4 py-3 rounded-pill shadow-lg hover:bg-ladrillo transition-colors"
      >
        <Bot className="w-5 h-5" />
        Asistente
      </button>
    );
  }

  return (
    <div
      data-testid="panel-asistente"
      className="fixed bottom-6 right-6 z-40 w-[min(92vw,380px)] h-[min(80vh,560px)] flex flex-col bg-perla border border-arcilla rounded-3xl-3 shadow-2xl overflow-hidden"
    >
      <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-catedral text-lienzo">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <div>
            <p className="font-semibold text-sm leading-none">Asistente Ojo Camba</p>
            <p className="text-[10px] text-arena mt-0.5">Apoyo a la decisión · vos decidís</p>
          </div>
        </div>
        <button
          onClick={() => setAbierto(false)}
          aria-label="Cerrar asistente"
          className="p-1 rounded-full hover:bg-ladrillo/40 transition-colors"
        >
          <X className="w-4.5 h-4.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {mensajes.length === 0 && (
          <div className="text-center px-3 py-6">
            <Sparkles className="w-6 h-6 text-caoba mx-auto mb-2" />
            <p className="text-xs text-arena leading-relaxed mb-3">
              Preguntame por el estado de la plataforma o pedime que explique un triaje o una ruta.
            </p>
            <div className="space-y-1.5">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  className="w-full text-left text-[11px] text-tierra bg-lienzo border border-arcilla rounded-2xl px-3 py-2 hover:border-caoba transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensajes.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            data-testid={`msg-${m.role}`}
          >
            <div
              className={`max-w-[85%] text-[12px] leading-relaxed px-3 py-2 rounded-3xl-2 whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-catedral text-lienzo rounded-br-sm'
                  : 'bg-lienzo border border-arcilla text-tierra rounded-bl-sm'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {enviando && (
          <div className="flex justify-start" data-testid="asistente-cargando">
            <div className="bg-lienzo border border-arcilla text-arena text-[12px] px-3 py-2 rounded-3xl-2 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Pensando…
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 rounded-2xl px-3 py-2">
            <p className="text-[11px] text-red-700 leading-relaxed">{error}</p>
          </div>
        )}

        <div ref={finRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(entrada);
        }}
        className="shrink-0 border-t border-arcilla p-2.5 flex items-center gap-2"
      >
        <input
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          disabled={enviando}
          placeholder="Escribí tu consulta…"
          data-testid="input-asistente"
          className="flex-1 min-w-0 text-sm bg-lienzo border border-arcilla rounded-pill px-3.5 py-2 text-tierra focus:outline-none focus:border-caoba disabled:opacity-60 transition-colors"
        />
        <button
          type="submit"
          disabled={enviando || !entrada.trim()}
          aria-label="Enviar"
          className="shrink-0 w-9 h-9 flex items-center justify-center bg-catedral text-lienzo rounded-full hover:bg-ladrillo disabled:opacity-50 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
