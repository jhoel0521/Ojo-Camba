import { io, type Socket } from 'socket.io-client';

// socket.io corre en su propio puerto (3010), no en el HTTP del gateway (3000).
const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3010';

let socket: Socket | null = null;

/** Singleton del socket.io-client conectado al servidor de eventos (:3010). */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
