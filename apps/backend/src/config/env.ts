import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../../.env') });
dotenv.config(); // fallback to local package .env

export const env = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'presenter_super_jwt_secret_key_123',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'presenter_super_refresh_secret_key_987',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/presenter',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  PAIR_TOKEN_EXPIRY_MS: 60000, // 60 seconds
};
