import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.middleware.js';
import { notFoundHandler, globalErrorHandler } from './middleware/error.middleware.js';
import apiRoutes from './routes/index.js';
import healthRoutes from './routes/health.routes.js';

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: env.isProduction ? undefined : false,
}));

// CORS setup
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsers & Cookie parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logger
app.use(requestLogger);

// Health check probe shortcut
app.use('/health', healthRoutes);

// API v1 root mount
app.use('/api/v1', apiRoutes);

// 404 & Error Handling
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;

