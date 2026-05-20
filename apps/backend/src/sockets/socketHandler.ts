import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

interface SessionJoinPayload {
  deviceId: string;
  token?: string;
  role: 'desktop' | 'mobile';
}

interface LaserMovePayload {
  x: number;
  y: number;
  visible: boolean;
}

interface TrackpadMovePayload {
  dx: number;
  dy: number;
}

export const registerSocketHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    let currentRoom: string | null = null;
    let clientRole: 'desktop' | 'mobile' | null = null;
    let clientDeviceId: string | null = null;

    console.log(`Socket connected: ${socket.id}`);

    // 1. Session Join
    socket.on('SESSION_JOIN', (payload: SessionJoinPayload) => {
      const { deviceId, role, token } = payload;
      if (!deviceId) {
        socket.emit('error', { message: 'Missing deviceId parameter' });
        return;
      }

      // Secure verification: if role is mobile, require and verify JWT token
      if (role === 'mobile') {
        if (!token) {
          console.warn(`Unauthorized join attempt: socket ${socket.id} tried to join as mobile without a token`);
          socket.emit('error', { message: 'Unauthorized: Pairing token is required' });
          socket.disconnect();
          return;
        }

        try {
          const decoded = jwt.verify(token, env.JWT_SECRET) as {
            deviceId: string;
            role: string;
            pairedWith: string;
          };

          if (decoded.role !== 'mobile' || decoded.pairedWith !== deviceId) {
            console.warn(`Unauthorized join attempt: socket ${socket.id} token mismatch`);
            socket.emit('error', { message: 'Unauthorized: Invalid pairing verification' });
            socket.disconnect();
            return;
          }
          console.log(`Socket ${socket.id} successfully authorized via JWT for device ${deviceId}`);
        } catch (err: any) {
          console.warn(`Unauthorized join attempt: socket ${socket.id} JWT verification failed:`, err.message);
          socket.emit('error', { message: 'Unauthorized: Invalid or expired pairing token' });
          socket.disconnect();
          return;
        }
      }

      clientRole = role;
      clientDeviceId = deviceId;
      currentRoom = `room:session:${deviceId}`;

      socket.join(currentRoom);
      console.log(`Socket ${socket.id} joined room ${currentRoom} as role: ${role}`);

      // Confirm join
      socket.emit('SESSION_JOINED', {
        sessionId: deviceId,
        role,
        message: `Successfully connected to session: ${deviceId}`
      });

      // Broadcast peer presence updates to other room members
      socket.to(currentRoom).emit('PEER_PRESENCE', {
        deviceId,
        role,
        status: 'online'
      });
    });

    // 2. Slide Controls (Forward from Mobile Web to Desktop Agent)
    socket.on('NEXT_SLIDE', () => {
      if (currentRoom && clientRole === 'mobile') {
        console.log(`Forwarding NEXT_SLIDE to room ${currentRoom}`);
        socket.to(currentRoom).emit('NEXT_SLIDE');
      }
    });

    socket.on('PREVIOUS_SLIDE', () => {
      if (currentRoom && clientRole === 'mobile') {
        console.log(`Forwarding PREVIOUS_SLIDE to room ${currentRoom}`);
        socket.to(currentRoom).emit('PREVIOUS_SLIDE');
      }
    });

    socket.on('START_SLIDESHOW', () => {
      if (currentRoom && clientRole === 'mobile') {
        console.log(`Forwarding START_SLIDESHOW to room ${currentRoom}`);
        socket.to(currentRoom).emit('START_SLIDESHOW');
      }
    });

    socket.on('END_SLIDESHOW', () => {
      if (currentRoom && clientRole === 'mobile') {
        console.log(`Forwarding END_SLIDESHOW to room ${currentRoom}`);
        socket.to(currentRoom).emit('END_SLIDESHOW');
      }
    });

    socket.on('BLACK_SCREEN', () => {
      if (currentRoom && clientRole === 'mobile') {
        console.log(`Forwarding BLACK_SCREEN to room ${currentRoom}`);
        socket.to(currentRoom).emit('BLACK_SCREEN');
      }
    });

    socket.on('FULLSCREEN_TOGGLE', () => {
      if (currentRoom && clientRole === 'mobile') {
        console.log(`Forwarding FULLSCREEN_TOGGLE to room ${currentRoom}`);
        socket.to(currentRoom).emit('FULLSCREEN_TOGGLE');
      }
    });

    // 3. Laser Pointer Movements
    socket.on('LASER_MOVE', (data: LaserMovePayload) => {
      if (currentRoom && clientRole === 'mobile') {
        socket.to(currentRoom).emit('LASER_MOVE', data);
      }
    });

    // 4. Trackpad Movements
    socket.on('TRACKPAD_MOVE', (data: TrackpadMovePayload) => {
      if (currentRoom && clientRole === 'mobile') {
        socket.to(currentRoom).emit('TRACKPAD_MOVE', data);
      }
    });

    socket.on('LEFT_CLICK', () => {
      if (currentRoom && clientRole === 'mobile') {
        socket.to(currentRoom).emit('LEFT_CLICK');
      }
    });

    socket.on('RIGHT_CLICK', () => {
      if (currentRoom && clientRole === 'mobile') {
        socket.to(currentRoom).emit('RIGHT_CLICK');
      }
    });

    // 5. Heartbeat Ping-Pong
    socket.on('HEARTBEAT', (data: { clientTime: number }) => {
      socket.emit('HEARTBEAT_ACK', {
        clientTime: data.clientTime,
        serverTime: Date.now()
      });
    });

    // 6. Disconnect
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      if (currentRoom && clientRole && clientDeviceId) {
        socket.to(currentRoom).emit('PEER_PRESENCE', {
          deviceId: clientDeviceId,
          role: clientRole,
          status: 'offline'
        });
      }
    });
  });
};
