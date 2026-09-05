import { Queue } from 'bullmq';
import { config } from '../config/env';

export const EMAIL_QUEUE_NAME = 'email-scheduler';

export function getBullMQRedisOptions() {
  if (config.redis.url) {
    try {
      const url = new URL(config.redis.url);
      const isTLS = url.protocol === 'rediss:';
      return {
        host: url.hostname,
        port: parseInt(url.port || '6379', 10),
        username: url.username ? decodeURIComponent(url.username) : undefined,
        password: url.password ? decodeURIComponent(url.password) : undefined,
        tls: isTLS ? { rejectUnauthorized: false } : undefined,
        maxRetriesPerRequest: null,
      };
    } catch (err: any) {
      console.warn('[BullMQ] Failed to parse REDIS_URL, falling back to host/port:', err?.message);
    }
  }
  return {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    maxRetriesPerRequest: null,
  };
}

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: getBullMQRedisOptions(),
});
