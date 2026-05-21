import { Pool } from 'pg';
import { env } from './env.js';

let pool: Pool | null = null;

const databaseNeedsSsl = (): boolean => {
  if (env.NODE_ENV === 'production') return true;
  return /render\.com|neon\.tech|supabase\.co|sslmode=require/i.test(env.DATABASE_URL);
};

export const getDbPool = (): Pool => {
  if (!pool) {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      ssl: databaseNeedsSsl() ? { rejectUnauthorized: false } : undefined,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client:', err);
    });
  }
  return pool;
};

// Helper query function that handles executing database queries
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const dbPool = getDbPool();
  try {
    const res = await dbPool.query(text, params);
    const duration = Date.now() - start;
    if (env.NODE_ENV === 'development') {
      console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Database query error:', { text, error });
    throw error;
  }
};
