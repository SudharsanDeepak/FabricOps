import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/everest_textile_os',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_everest_textile_key_change_in_production_min32chars',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  COOKIE_NAME: process.env.COOKIE_NAME || 'everest_os_jwt',
  IOT_DEFECT_SCANNER_URL: process.env.IOT_DEFECT_SCANNER_URL || 'http://localhost:8080/scanner',
  AI_QUALITY_SERVICE_URL: process.env.AI_QUALITY_SERVICE_URL || 'http://localhost:8081/vision-qc',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};

