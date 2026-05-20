import Redis from 'ioredis';
import { env } from './env.js';

let redisClient: Redis | null = null;
let redisPublisher: Redis | null = null;
let redisSubscriber: Redis | null = null;

const createRedisConfig = () => {
  return {
    maxRetriesPerRequest: 1,
    retryStrategy: (times: number) => {
      if (times > 3) {
        return null; // Stop retrying
      }
      return Math.min(times * 100, 2000);
    }
  };
};

export const getRedisClient = (): Redis | null => {
  if (!redisClient && env.REDIS_URL) {
    try {
      redisClient = new Redis(env.REDIS_URL, createRedisConfig());
      redisClient.on('error', (err) => {
        // Suppress logs to avoid flooding terminal in memory mode
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
