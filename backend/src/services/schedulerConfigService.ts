import { redisClient } from '../config/redis';
import { config } from '../config/env';

export interface SchedulerConfig {
  hourlyEmailLimit: number;
  workerConcurrency: number;
  artificialDelayMs: number;
  enabled: boolean;
}

const REDIS_CONFIG_KEY = 'scheduler:config';

/**
 * Returns default configuration derived from environment variables or fallbacks.
 */
export function getDefaultSchedulerConfig(): SchedulerConfig {
  return {
    hourlyEmailLimit: config.rateLimit.hourlyLimit || 100,
    workerConcurrency: config.workerConcurrency || 5,
    artificialDelayMs: config.workerArtificialDelayMs || 0,
    enabled: true,
  };
}

/**
 * Validates partial or full scheduler configuration objects.
 */
export function validateSchedulerConfig(input: Partial<SchedulerConfig>): void {
  if (input.hourlyEmailLimit !== undefined) {
    if (typeof input.hourlyEmailLimit !== 'number' || input.hourlyEmailLimit < 1) {
      throw new Error('hourlyEmailLimit must be a positive integer >= 1');
    }
  }
  if (input.workerConcurrency !== undefined) {
    if (typeof input.workerConcurrency !== 'number' || input.workerConcurrency < 1) {
      throw new Error('workerConcurrency must be a positive integer >= 1');
    }
  }
  if (input.artificialDelayMs !== undefined) {
    if (typeof input.artificialDelayMs !== 'number' || input.artificialDelayMs < 0) {
      throw new Error('artificialDelayMs must be a non-negative integer >= 0');
    }
  }
  if (input.enabled !== undefined) {
    if (typeof input.enabled !== 'boolean') {
      throw new Error('enabled must be a boolean (true or false)');
    }
  }
}

/**
 * Retrieves current runtime configuration from Redis.
 * If Redis has no stored config, initializes Redis with default config.
 */
export async function getSchedulerConfig(): Promise<SchedulerConfig> {
  try {
    const raw = await redisClient.get(REDIS_CONFIG_KEY);
    if (!raw) {
      const defaults = getDefaultSchedulerConfig();
      await redisClient.set(REDIS_CONFIG_KEY, JSON.stringify(defaults));
      console.log('[SchedulerConfig] Initialized default configuration in Redis:', defaults);
      return defaults;
    }
    const parsed = JSON.parse(raw);
    return {
      hourlyEmailLimit: typeof parsed.hourlyEmailLimit === 'number' ? parsed.hourlyEmailLimit : config.rateLimit.hourlyLimit,
      workerConcurrency: typeof parsed.workerConcurrency === 'number' ? parsed.workerConcurrency : config.workerConcurrency,
      artificialDelayMs: typeof parsed.artificialDelayMs === 'number' ? parsed.artificialDelayMs : config.workerArtificialDelayMs,
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
    };
  } catch (err: any) {
    console.error('[SchedulerConfig] Error reading config from Redis, returning default fallback:', err?.message);
    return getDefaultSchedulerConfig();
  }
}

/**
 * Updates runtime configuration in Redis and validates input values.
 */
export async function updateSchedulerConfig(updates: Partial<SchedulerConfig>): Promise<SchedulerConfig> {
  validateSchedulerConfig(updates);
  const current = await getSchedulerConfig();
  const newConfig: SchedulerConfig = {
    ...current,
    ...updates,
  };

  await redisClient.set(REDIS_CONFIG_KEY, JSON.stringify(newConfig));
  console.log('[SchedulerConfig] Configuration updated in Redis:', newConfig);
  return newConfig;
}

/**
 * Ensures Redis configuration is populated on server startup.
 */
export async function initSchedulerConfig(): Promise<SchedulerConfig> {
  const currentConfig = await getSchedulerConfig();
  console.log(`[SchedulerConfig] Startup Config Loaded | Enabled: ${currentConfig.enabled} | Hourly Limit: ${currentConfig.hourlyEmailLimit} | Concurrency: ${currentConfig.workerConcurrency} | Delay: ${currentConfig.artificialDelayMs}ms`);
  return currentConfig;
}
