import { Request, Response, NextFunction } from 'express';
import { getHealthStatus } from '../services/health.service';

export async function healthCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const health = await getHealthStatus();
    const httpStatus = health.status === 'OK' ? 200 : health.status === 'DEGRADED' ? 200 : 503;

    res.status(httpStatus).json({
      success: health.status !== 'DOWN',
      data: health,
    });
  } catch (error) {
    next(error);
  }
}
