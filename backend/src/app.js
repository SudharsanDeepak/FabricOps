import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { authenticateToken } from './middleware/auth.middleware.js';
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
const allowedOrigins = [env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || !env.isProduction) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsers & Cookie parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Extract JWT session from cookie or Bearer token
app.use(authenticateToken);

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

