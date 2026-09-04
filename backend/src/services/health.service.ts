import { checkMySQLConnection } from '../config/db';
import { checkRedisConnection } from '../config/redis';

export interface HealthCheckResult {
  status: 'OK' | 'DEGRADED' | 'DOWN';
  timestamp: string;
  services: {
    mysql: { connected: boolean; error?: string };
    redis: { connected: boolean; error?: string };
  };
}

export async function getHealthStatus(): Promise<HealthCheckResult> {
  const mysqlCheck = await checkMySQLConnection();
  const redisCheck = await checkRedisConnection();

  const allConnected = mysqlCheck.connected && redisCheck.connected;
  const anyConnected = mysqlCheck.connected || redisCheck.connected;

  let status: 'OK' | 'DEGRADED' | 'DOWN' = 'OK';
  if (!allConnected && anyConnected) {
    status = 'DEGRADED';
  } else if (!allConnected && !anyConnected) {
    status = 'DOWN';
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    services: {
      mysql: mysqlCheck,
      redis: redisCheck,
    },
  };
}
