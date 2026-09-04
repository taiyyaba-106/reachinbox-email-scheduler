import { redisClient } from '../config/redis';

const LOCK_PREFIX = 'idempotency:lock:email:';
const SENT_PREFIX = 'idempotency:sent:email:';
const DEFAULT_LOCK_TTL_MS = 60000; // 60 seconds lock safety TTL
const SENT_TTL_SECONDS = 604800; // 7 days TTL

/**
 * Checks if email delivery was already completed according to Redis idempotency store.
 */
export async function isEmailCompletedInRedis(emailId: number): Promise<boolean> {
  const key = `${SENT_PREFIX}${emailId}`;
  const exists = await redisClient.exists(key);
  return exists === 1;
}

/**
 * Persists idempotency completion in Redis after an email is successfully sent.
 */
export async function markEmailCompletedInRedis(emailId: number): Promise<void> {
  const key = `${SENT_PREFIX}${emailId}`;
  await redisClient.set(key, 'SENT', 'EX', SENT_TTL_SECONDS);
}

/**
 * Atomically acquires a distributed processing lock for a specific email ID using Redis SET NX.
 * Returns true if lock was successfully acquired, false if another worker holds the lock.
 */
export async function acquireEmailLock(
  emailId: number,
  lockToken: string,
  ttlMs: number = DEFAULT_LOCK_TTL_MS
): Promise<boolean> {
  const key = `${LOCK_PREFIX}${emailId}`;
  const result = await redisClient.set(key, lockToken, 'PX', ttlMs, 'NX');
  return result === 'OK';
}

/**
 * Releases the distributed processing lock safely using a Lua script
 * ensuring only the worker that acquired the lock token can release it.
 */
export async function releaseEmailLock(emailId: number, lockToken: string): Promise<boolean> {
  const key = `${LOCK_PREFIX}${emailId}`;
  const luaScript = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  const result = await redisClient.eval(luaScript, 1, key, lockToken);
  return result === 1;
}
