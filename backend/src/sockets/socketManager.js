import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import { User, Order, OrderTimelineEvent } from '../models/index.js';

let ioInstance = null;

/**
 * Extract token from handshake auth, Authorization header, or cookies.
 */
function extractToken(handshake) {
  if (handshake.auth?.token) {
    return handshake.auth.token;
  }
  if (handshake.headers?.authorization?.startsWith('Bearer ')) {
    return handshake.headers.authorization.split(' ')[1];
  }
  if (handshake.headers?.cookie) {
    const cookies = handshake.headers.cookie.split(';');
    for (const c of cookies) {
      const [key, val] = c.trim().split('=');
      if (key === env.COOKIE_NAME) {
        return val;
      }
    }
  }
  return null;
}

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = extractToken(socket.handshake);
      if (token) {
        try {
          const decoded = jwt.verify(token, env.JWT_SECRET);
          const user = await User.findById(decoded.id).select('-passwordHash').lean();
          if (user && user.status === 'ACTIVE') {
            socket.user = user;
          } else {
            socket.user = null;
          }
        } catch (jwtErr) {
          socket.user = null;
        }
      } else {
        socket.user = null;
      }
      next();
    } catch (err) {
      next();
    }
  });

  io.on('connection', (socket) => {
    const userName = socket.user?.name || 'Anonymous';
    const userRole = socket.user?.role || 'UNAUTHENTICATED';
    logger.info(`Socket connected: ${socket.id} (${userName} [${userRole}])`);

    // Authorized room subscription
    socket.on('join_room', async (roomName, callback) => {
      try {
        const targetRoom = typeof roomName === 'string' ? roomName : roomName?.room;
        if (!targetRoom || typeof targetRoom !== 'string') {
          if (typeof callback === 'function') callback({ success: false, error: 'Invalid room name' });
          return;
        }

        // Self-heal: if socket.user was not resolved during initial handshake, re-check handshake cookie
        if (!socket.user) {
          const token = extractToken(socket.handshake);
          if (token) {
            try {
              const decoded = jwt.verify(token, env.JWT_SECRET);
              const user = await User.findById(decoded.id).select('-passwordHash').lean();
              if (user && user.status === 'ACTIVE') {
                socket.user = user;
              }
            } catch (jwtErr) {
              // invalid or expired token
            }
          }
        }

        // Room Authorization Rules
        if (targetRoom === 'admin_control_tower') {
          if (!socket.user || socket.user.role !== 'ADMIN') {
            logger.warn(`Unauthorized room join attempt on 'admin_control_tower' by socket ${socket.id}`);
            socket.emit('subscription_error', { room: targetRoom, message: 'Access denied: Admin role required' });
            if (typeof callback === 'function') callback({ success: false, error: 'Access denied: Admin role required' });
            return;
          }
        } else if (targetRoom === 'operator_floor') {
          if (!socket.user || (socket.user.role !== 'ADMIN' && socket.user.role !== 'OPERATOR')) {
            logger.warn(`Unauthorized room join attempt on 'operator_floor' by socket ${socket.id}`);
            socket.emit('subscription_error', { room: targetRoom, message: 'Access denied: Operator or Admin role required' });
            if (typeof callback === 'function') callback({ success: false, error: 'Access denied: Operator or Admin role required' });
            return;
          }
        } else if (targetRoom.startsWith('order:')) {
          const orderId = targetRoom.split(':')[1];
          if (!socket.user) {
            socket.emit('subscription_error', { room: targetRoom, message: 'Authentication required to subscribe to order updates' });
            if (typeof callback === 'function') callback({ success: false, error: 'Authentication required' });
            return;
          }

          // Customers can only join rooms for their OWN confirmed orders
          if (socket.user.role === 'CUSTOMER') {
            const order = await Order.findById(orderId).select('customerId').lean();
            if (!order || order.customerId.toString() !== socket.user._id.toString()) {
              logger.warn(`Customer ${socket.user._id} attempted unauthorized subscription to ${targetRoom}`);
              socket.emit('subscription_error', { room: targetRoom, message: 'Cross-customer access denied' });
              if (typeof callback === 'function') callback({ success: false, error: 'Cross-customer access denied' });
              return;
            }
          }
        } else if (targetRoom.startsWith('customer:')) {
          const customerId = targetRoom.split(':')[1];
          if (!socket.user || (socket.user.role !== 'ADMIN' && socket.user._id.toString() !== customerId)) {
            socket.emit('subscription_error', { room: targetRoom, message: 'Unauthorized customer channel' });
            if (typeof callback === 'function') callback({ success: false, error: 'Unauthorized customer channel' });
            return;
          }
        }

        // Authorized: Join room
        socket.join(targetRoom);
        logger.info(`Socket ${socket.id} (${userName}) authorized and joined room: ${targetRoom}`);
        if (typeof callback === 'function') callback({ success: true, room: targetRoom });
      } catch (err) {
        logger.error(`Error joining room: ${err.message}`);
        if (typeof callback === 'function') callback({ success: false, error: 'Internal subscription error' });
      }
    });

    socket.on('leave_room', (roomName) => {
      const targetRoom = typeof roomName === 'string' ? roomName : roomName?.room;
      if (targetRoom) {
        socket.leave(targetRoom);
        logger.info(`Socket ${socket.id} left room: ${targetRoom}`);
      }
    });

    // Reconcile client state after network reconnection
    socket.on('reconcile_state', async ({ orderId, lastTimestamp }, callback) => {
      try {
        if (!orderId) {
          if (typeof callback === 'function') callback({ success: false, error: 'OrderId required' });
          return;
        }

        const query = { orderId };
        if (lastTimestamp) {
          query.updatedAt = { $gt: new Date(lastTimestamp) };
        }

        const events = await OrderTimelineEvent.find(query).sort({ sequence: 1 }).lean();
        const order = await Order.findById(orderId).select('status estimatedDeliveryDate confirmedDeliveryDate isAtRiskOfDelay delayRiskReason').lean();

        if (typeof callback === 'function') {
          callback({
            success: true,
            serverTimestamp: new Date(),
            order,
            events,
          });
        }
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
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
