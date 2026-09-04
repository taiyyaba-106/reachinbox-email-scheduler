import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

function getErrorCode(statusCode: number): string {
  switch (statusCode) {
    case 400: return 'BAD_REQUEST';
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 429: return 'TOO_MANY_REQUESTS';
    default: return 'INTERNAL_SERVER_ERROR';
  }
}

export function errorMiddleware(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const rawMessage = err.message || 'An unexpected error occurred';
  const code = err.code || getErrorCode(statusCode);

  // Log error internally without exposing credentials
  const sanitizedMessage = rawMessage.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+):[^@\s]+/g, '$1:****');
  console.error(`[Error] ${statusCode} (${code}) - ${sanitizedMessage}`);

  res.status(statusCode).json({
    success: false,
    message: rawMessage,
    error: {
      message: rawMessage,
      code,
    },
  });
}

