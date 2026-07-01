import { io, type Socket } from 'socket.io-client';

// socket.io comparte el mismo host/puerto que la API HTTP (gateway-principal).
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

/** Singleton del socket.io-client conectado al gateway-principal. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
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
