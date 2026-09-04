import { Request, Response, NextFunction } from 'express';
import { verifyAppJwt } from '../services/googleAuthService';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
  };
}

/**
 * Middleware to enforce JWT authentication on protected API endpoints.
 */
export function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string | undefined;

  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (queryToken) {
    token = queryToken;
  }

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication token is required (Bearer token or token query parameter)',
    });
    return;
  }

  try {
    const payload = verifyAppJwt(token);
    req.user = payload;
    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token',
    });
  }
}

/**
 * Optional JWT middleware that attaches user info if token is valid, but does not block request if missing.
 */
export function optionalJWT(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string | undefined;

  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (queryToken) {
    token = queryToken;
  }

  if (token) {
    try {
      const payload = verifyAppJwt(token);
      req.user = payload;
    } catch {
      // Ignore invalid token in optional mode
    }
  }
  next();
}

/**
 * Middleware to protect administrative routes like Bull Board Queue Dashboard.
 * Accepts Authorization Bearer header, ?token=... query parameter, or ADMIN_KEY in environment.
 */
export function dashboardAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string | undefined;

  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (queryToken) {
    token = queryToken;
  }

  if (token) {
    try {
      verifyAppJwt(token);
      return next();
    } catch {
      // invalid token, fallback
    }
  }

  const adminKey = process.env.ADMIN_KEY || 'admin123';
  if (req.query.adminKey === adminKey || req.query.key === adminKey) {
    return next();
  }

  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  res.status(401).json({
    success: false,
    error: 'Unauthorized access to Queue Admin Dashboard. Please provide a valid token or admin key.',
  });
}

