import { redisClient } from '../config/redis';
import { config } from '../config/env';

export interface RateLimitStatus {
  allowed: boolean;
  currentCount: number;
  maxLimit: number;
  delayMs: number;
}

/**
 * Returns the Redis key for the current hourly rate limiting window.
 * Format: rate_limit:emails:<YYYY-MM-DD-HH>
 */
export function getCurrentHourlyKey(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hour = String(now.getUTCHours()).padStart(2, '0');
  return `rate_limit:emails:${year}-${month}-${day}-${hour}`;
}

/**
 * Calculates remaining milliseconds until the next hourly window starts.
 */
export function getDelayUntilNextWindow(): number {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
  return Math.max(1000, nextHour.getTime() - now.getTime());
}

/**
 * Gets current count in Redis for the active hourly window.
 */
export async function getCurrentRateLimitCount(): Promise<number> {
  const key = getCurrentHourlyKey();
  const val = await redisClient.get(key);
  return val ? parseInt(val, 10) : 0;
}

import { getSchedulerConfig } from './schedulerConfigService';

/**
 * Atomically checks if current hourly email count is under limit.
 * If under limit, increments counter and returns allowed: true.
 * If limit reached, returns allowed: false and calculated delayMs to next window.
 */
export async function checkAndIncrementRateLimit(customLimit?: number): Promise<RateLimitStatus> {
  const key = getCurrentHourlyKey();
  let maxLimit = customLimit;

  if (!maxLimit) {
    const schedulerConfig = await getSchedulerConfig();
    maxLimit = schedulerConfig.hourlyEmailLimit;
  }


  // Lua script ensures atomic check and increment across concurrent workers
  const luaScript = `
    local current = tonumber(redis.call('get', KEYS[1]) or '0')
    local limit = tonumber(ARGV[1])
    if current < limit then
      local new_count = redis.call('incr', KEYS[1])
      if new_count == 1 then
        redis.call('expire', KEYS[1], 7200)
      end
      return {1, new_count}
    else
      return {0, current}
    end
  `;

  const result = (await redisClient.eval(luaScript, 1, key, maxLimit)) as [number, number];
  const allowed = result[0] === 1;
  const currentCount = result[1];
  const delayMs = getDelayUntilNextWindow();

  console.log(`[RateLimit] Rate limit check | Key: ${key} | Current Count: ${allowed ? currentCount - 1 : currentCount} | Maximum Allowed: ${maxLimit}`);

  if (allowed) {
    console.log(`[RateLimit] Email allowed. Current count incremented to ${currentCount}/${maxLimit}.`);
  } else {
    console.warn(`[RateLimit] Email delayed because rate limit was reached (${currentCount}/${maxLimit}). Next window in ${delayMs}ms.`);
  }

  return {
    allowed,
    currentCount,
    maxLimit,
    delayMs,
  };
}
