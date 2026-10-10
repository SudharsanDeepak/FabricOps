import { Server } from 'socket.io';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

let ioInstance = null;

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Join role-based or user-specific rooms
    socket.on('join_room', (roomName) => {
      socket.join(roomName);
      logger.info(`Socket ${socket.id} joined room: ${roomName}`);
    });

    socket.on('leave_room', (roomName) => {
      socket.leave(roomName);
      logger.info(`Socket ${socket.id} left room: ${roomName}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (Reason: ${reason})`);
    });
  });

  ioInstance = io;
  return io;
};

export const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.io has not been initialized. Call initSocket first.');
  }
  return ioInstance;
};

export const broadcastEvent = (room, event, data) => {
  if (ioInstance) {
    if (room) {
      ioInstance.to(room).emit(event, data);
    } else {
      ioInstance.emit(event, data);
    }
  }
};

