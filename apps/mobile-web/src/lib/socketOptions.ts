import type { ManagerOptions, SocketOptions } from 'socket.io-client';

export function getSocketOptions(backendUrl: string): Partial<ManagerOptions & SocketOptions> {
  const secure = backendUrl.startsWith('https://');
  return {
    transports: ['websocket', 'polling'],
    secure,
    reconnection: true,
    reconnectionDelay: 1000,
  };
}
