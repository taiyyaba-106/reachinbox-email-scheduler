import { Response } from 'express';

export function sendError(
  res: Response,
  statusCode: number,
  message: string,
  code: string = 'BAD_REQUEST'
): Response {
  return res.status(statusCode).json({
    success: false,
    message,
    error: {
      message,
      code,
    },
  });
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  extra: Record<string, any> = {}
): Response {
  return res.status(statusCode).json({
    success: true,
    data,
    ...extra,
  });
}
