import { Queue } from 'bullmq';
import { config } from '../config/env';

export const EMAIL_QUEUE_NAME = 'email-scheduler';

export function getBullMQRedisOptions() {
  if (config.redis.url) {
    try {
      const url = new URL(config.redis.url);
      return {
        host: url.hostname,
        port: parseInt(url.port || '6379', 10),
        username: url.username ? decodeURIComponent(url.username) : undefined,
        password: url.password ? decodeURIComponent(url.password) : undefined,
        tls: url.protocol === 'rediss:' ? {} : undefined,
        maxRetriesPerRequest: null,
      };
    } catch {
      // Fallback
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
