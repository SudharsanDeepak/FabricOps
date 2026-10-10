import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDB, disconnectDB } from './config/db.js';
import { initSocket } from './sockets/socketManager.js';

const httpServer = http.createServer(app);

// Initialize Socket.io
initSocket(httpServer);

const startServer = async () => {
  try {
    // Attempt database connection
    await connectDB();

    httpServer.listen(env.PORT, () => {
      logger.info(`=======================================================`);
      logger.info(`  Everest Textile OS — Backend API Server Started`);
      logger.info(`  Mode:        ${env.NODE_ENV}`);
      logger.info(`  Port:        ${env.PORT}`);
      logger.info(`  HealthCheck: http://localhost:${env.PORT}/api/v1/health`);
      logger.info(`=======================================================`);
    });
  } catch (error) {
    logger.error(`Critical startup failure: ${error.message}`);
    process.exit(1);
  }
};

// Graceful shutdown handling
const shutdown = async (signal) => {
  logger.info(`Received ${signal}. Gracefully terminating Everest Textile OS...`);
  httpServer.close(async () => {
    logger.info('HTTP server closed.');
    await disconnectDB();
    process.exit(0);
  });

  // Force close if graceful shutdown takes too long
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();

export { httpServer };

