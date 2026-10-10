import { io } from 'socket.io-client';

let socketInstance = null;

export function getSocket() {
  if (!socketInstance) {
    socketInstance = io('/', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      withCredentials: true,
    });
  }
  return socketInstance;
}
