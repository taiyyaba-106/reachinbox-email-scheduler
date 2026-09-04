import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';
import { getGoogleAuthUrl, handleGoogleCallback } from '../services/googleAuthService';
import { findUserById } from '../models/user.model';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * GET /api/auth/google
 * Initiates Google OAuth 2.0 flow by redirecting to Google Consent Screen.
 */
export async function initiateGoogleAuthHandler(req: Request, res: Response): Promise<void> {
  if (!config.google.clientId || !config.google.clientSecret) {
    res.status(400).json({
      success: false,
      error: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env',
    });
    return;
  }

  const authUrl = getGoogleAuthUrl();
  console.log('[Google Auth] Redirecting user to Google consent screen...');
  res.redirect(authUrl);
}

/**
 * GET /api/auth/google/callback
 * Handles authorization code callback from Google, exchanges code for user profile,
 * creates/updates user in MySQL, and returns application JWT.
 */
export async function googleAuthCallbackHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errorQuery = req.query.error;
    if (errorQuery) {
      console.warn(`[Google Auth] OAuth consent failed or cancelled by user: ${errorQuery}`);
      res.status(400).json({
        success: false,
        error: `Google OAuth authentication cancelled or failed: ${errorQuery}`,
      });
      return;
    }

    const code = req.query.code as string | undefined;
    if (!code) {
      res.status(400).json({
        success: false,
        error: 'Missing authorization code in Google OAuth callback',
      });
      return;
    }

    const result = await handleGoogleCallback(code);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      res.redirect(`${frontendUrl}/login?token=${result.token}`);
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Google OAuth authentication successful',
      token: result.token,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        picture: result.user.picture,
      },
    });
  } catch (error: any) {
    console.error('[Google Auth] Callback processing error:', error?.message);
    res.status(400).json({
      success: false,
      error: `Google OAuth authentication failed: ${error?.message || 'Unknown error'}`,
    });
  }
}

/**
 * GET /api/auth/me
 * Returns current authenticated user profile.
 */
export async function getMeHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const user = await findUserById(req.user.userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User record not found' });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
}
