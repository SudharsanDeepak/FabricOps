import os from 'os';
import { getDBStatus } from '../config/db.js';
import { env } from '../config/env.js';

export const getHealth = (req, res) => {
  const dbStatus = getDBStatus();
  const uptimeSeconds = process.uptime();

  const isHealthy = dbStatus.isConnected;

  const healthData = {
    service: 'FabricOps API',
    status: isHealthy ? 'HEALTHY' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptimeSeconds / 60)}m ${Math.floor(uptimeSeconds % 60)}s`,
    environment: env.NODE_ENV,
    database: dbStatus,
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      memoryUsage: {
        rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
      },
      loadAvg: os.loadavg(),
    },
    version: '1.0.0',
  };

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    data: healthData,
  });
};

