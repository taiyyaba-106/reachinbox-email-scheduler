import { Request, Response, NextFunction } from 'express';
import {
  getSchedulerConfig,
  updateSchedulerConfig,
  SchedulerConfig,
} from '../services/schedulerConfigService';
import { updateWorkerConcurrency } from '../workers/emailWorker';

import { sendError } from '../utils/apiResponse';

/**
 * GET /api/config
 * Retrieves current Redis-backed runtime scheduler configuration.
 */
export async function getSchedulerConfigHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const configData = await getSchedulerConfig();
    res.status(200).json({
      success: true,
      data: configData,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/config
 * Updates Redis-backed runtime scheduler configuration.
 */
export async function updateSchedulerConfigHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const updates: Partial<SchedulerConfig> = req.body || {};

    if (updates.hourlyEmailLimit !== undefined && (typeof updates.hourlyEmailLimit !== 'number' || updates.hourlyEmailLimit < 1)) {
      sendError(res, 400, 'hourlyEmailLimit must be a positive integer.', 'INVALID_CONFIG');
      return;
    }
    if (updates.workerConcurrency !== undefined && (typeof updates.workerConcurrency !== 'number' || updates.workerConcurrency < 1 || updates.workerConcurrency > 50)) {
      sendError(res, 400, 'workerConcurrency must be an integer between 1 and 50.', 'INVALID_CONFIG');
      return;
    }
    if (updates.artificialDelayMs !== undefined && (typeof updates.artificialDelayMs !== 'number' || updates.artificialDelayMs < 0)) {
      sendError(res, 400, 'artificialDelayMs must be a non-negative integer.', 'INVALID_CONFIG');
      return;
    }

    const updatedConfig = await updateSchedulerConfig(updates);

    if (updates.workerConcurrency !== undefined) {
      updateWorkerConcurrency(updatedConfig.workerConcurrency);
    }

    res.status(200).json({
      success: true,
      message: 'Scheduler configuration updated successfully in Redis',
      data: updatedConfig,
    });
  } catch (error) {
    next(error);
  }
}


