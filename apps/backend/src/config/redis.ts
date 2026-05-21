import Redis from 'ioredis';
import { env } from './env.js';

let redisClient: Redis | null = null;
let redisPublisher: Redis | null = null;
let redisSubscriber: Redis | null = null;

const createRedisConfig = (): Record<string, unknown> => {
  const url = env.REDIS_URL || '';
  const options: Record<string, unknown> = {
    maxRetriesPerRequest: 2,
    connectTimeout: 10000,
    retryStrategy: (times: number) => {
      if (times > 5) return null;
      return Math.min(times * 200, 3000);
    },
  };

  // Upstash / Render Key Value often use rediss://
  if (url.startsWith('rediss://')) {
    options.tls = { rejectUnauthorized: false };
  }

  return options;
};

export const getRedisClient = (): Redis | null => {
  if (!redisClient && env.REDIS_URL) {
    try {
      redisClient = new Redis(env.REDIS_URL, createRedisConfig());
      redisClient.on('ready', () => {
        console.log('Redis client connected.');
      });
      redisClient.on('error', (err) => {
        console.warn('Redis client error:', err.message);
      });
    } catch (e) {
      console.warn('Redis initialization error. Running in memory-only mode.');
    }
  }
  return redisClient;
};

export const getRedisPubSub = () => {
  if (!redisPublisher && env.REDIS_URL) {
    try {
      redisPublisher = new Redis(env.REDIS_URL, createRedisConfig());
      redisSubscriber = new Redis(env.REDIS_URL, createRedisConfig());
      
      redisPublisher.on('error', () => {});
      redisSubscriber.on('error', () => {});
    } catch (e) {
      console.warn('Redis PubSub initialization error.');
    }
  }
  return { pub: redisPublisher, sub: redisSubscriber };
};
