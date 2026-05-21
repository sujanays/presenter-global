import { existsSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';

const nodeRequire = createRequire(__filename);
(function loadMonorepoEnv() {
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    const loaderPath = path.join(dir, 'config/loadRootEnv.cjs');
    if (existsSync(loaderPath)) {
      nodeRequire(loaderPath).loadRootEnv(__dirname);
      return;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  console.warn('[env] config/loadRootEnv.cjs not found');
})();

export const env = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'presenter_super_jwt_secret_key_123',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'presenter_super_refresh_secret_key_987',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/presenter',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  MOBILE_URL: process.env.MOBILE_URL || process.env.CLIENT_URL || 'http://localhost:3000',
  PAIR_TOKEN_EXPIRY_MS: 60000, // 60 seconds
};

const isLocalUrl = (url: string) =>
  /localhost|127\.0\.0\.1/.test(url);

export const envDiagnostics = {
  databaseUrlConfigured: Boolean(env.DATABASE_URL) && !isLocalUrl(env.DATABASE_URL),
  redisUrlConfigured: Boolean(env.REDIS_URL) && !isLocalUrl(env.REDIS_URL),
  nodeEnv: env.NODE_ENV,
};

/** Origins allowed for REST API CORS (mobile web + local dev). */
export const corsOrigins = [
  env.CLIENT_URL,
  env.MOBILE_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter((origin, index, list) => Boolean(origin) && list.indexOf(origin) === index);
