import dns from 'dns';
import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

let isConnected = false;

export const connectDB = async (retries = 3, delay = 2000) => {
  if (isConnected) {
    return mongoose.connection;
  }

  // Ensure resilient SRV lookup for cloud MongoDB Atlas clusters on Windows
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch (err) {
    // ignore if restricted
  }

  const options = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4, // Force IPv4
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.info(`Connecting to MongoDB (Attempt ${attempt}/${retries}) at ${env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}...`);
      const conn = await mongoose.connect(env.MONGODB_URI, options);
      isConnected = true;
      logger.info(`MongoDB connected successfully to host: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      logger.error(`MongoDB connection attempt ${attempt} failed: ${error.message}`);
      if (attempt < retries) {
        logger.info(`Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        logger.warn('All MongoDB connection attempts exhausted. Server will start in degraded mode until database is reachable.');
      }
    }
  }

  return mongoose.connection;
};

// Event listeners
mongoose.connection.on('connected', () => {
  isConnected = true;
  logger.info('Mongoose event: Connection established');
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  logger.error(`Mongoose connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  logger.warn('Mongoose event: Connection lost / disconnected');
});

export const getDBStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return {
    state: states[mongoose.connection.readyState] || 'unknown',
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
    isConnected: mongoose.connection.readyState === 1,
  };
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected gracefully.');
  }
};

