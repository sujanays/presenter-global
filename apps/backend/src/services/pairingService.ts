import { getRedisClient } from '../config/redis.js';
import { env } from '../config/env.js';

interface PairTokenData {
  deviceId: string;
  createdAt: number;
}

// In-memory fallback map for offline development when Redis is not available
const localTokenMap = new Map<string, PairTokenData>();

// Clean up expired local tokens periodically (every 30 seconds)
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of localTokenMap.entries()) {
    if (now - data.createdAt > env.PAIR_TOKEN_EXPIRY_MS) {
      localTokenMap.delete(token);
    }
  }
}, 30000);

export const createPairingToken = async (deviceId: string): Promise<string> => {
  const token = Math.floor(100000 + Math.random() * 900000).toString();
  const redis = getRedisClient();

  if (redis && redis.status === 'ready') {
    try {
      // Store token with 60 second expiry
      await redis.set(`pair:${token}`, deviceId, 'PX', env.PAIR_TOKEN_EXPIRY_MS);
      console.log(`Stored pairing token ${token} in Redis for device ${deviceId}`);
    } catch (e) {
      console.error('Failed to store pairing token in Redis. Using local fallback.');
      localTokenMap.set(token, { deviceId, createdAt: Date.now() });
    }
  } else {
    localTokenMap.set(token, { deviceId, createdAt: Date.now() });
  }

  return token;
};

export const verifyPairingToken = async (token: string): Promise<string | null> => {
  const redis = getRedisClient();

  if (redis && redis.status === 'ready') {
    try {
      const deviceId = await redis.get(`pair:${token}`);
      if (deviceId) {
        // One-time use: delete immediately after successful scan
        await redis.del(`pair:${token}`);
        return deviceId;
      }
    } catch (e) {
      console.error('Failed to fetch pairing token from Redis. Trying local fallback.');
    }
  }

  // Fallback to local memory lookup
  const tokenData = localTokenMap.get(token);
  if (tokenData) {
    const elapsed = Date.now() - tokenData.createdAt;
    if (elapsed <= env.PAIR_TOKEN_EXPIRY_MS) {
      localTokenMap.delete(token); // One-time use
      return tokenData.deviceId;
    }
    localTokenMap.delete(token); // Cleanup expired
  }

  return null;
};
