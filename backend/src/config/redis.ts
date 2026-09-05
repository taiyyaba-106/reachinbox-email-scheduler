import { Redis } from 'ioredis';
import { config } from './env';

function createRedisClient(): Redis {
  if (config.redis.url) {
    const isTLS = config.redis.url.startsWith('rediss:');
    return new Redis(config.redis.url, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      tls: isTLS ? { rejectUnauthorized: false } : undefined,
    });
  }
  return new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
  });
}

export const redisClient = createRedisClient();

// Gracefully catch Redis connection errors to prevent unhandled error event crashes
redisClient.on('error', (err) => {
  // Silent or single debug logging for connection refused errors when Redis server is offline
});

export async function checkRedisConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    if (redisClient.status === 'wait' || redisClient.status === 'close') {
      await redisClient.connect();
    }
    const pong = await redisClient.ping();
    return { connected: pong === 'PONG' };
  } catch (err: any) {
    return {
      connected: false,
      error: err?.message || 'Failed to connect to Redis',
    };
  }
}
