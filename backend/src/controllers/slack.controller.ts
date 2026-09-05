import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';
import { getSlackAuthUrl, handleSlackCallback, getSlackStatusForUser } from '../services/slackService';
import { verifyAppJwt } from '../services/googleAuthService';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * GET /api/auth/slack
 * Initiates Slack OAuth flow by redirecting to Slack authorization screen.
 */
export async function initiateSlackAuthHandler(req: Request, res: Response): Promise<void> {
  if (
    !config.slack.clientId ||
    !config.slack.clientSecret ||
    config.slack.clientId === 'your_slack_client_id' ||
    config.slack.clientSecret === 'your_slack_client_secret'
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'https://reachinbox-email-scheduler-app.vercel.app';
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      res.redirect(`${frontendUrl}/settings?error=Slack%20OAuth%20App%20is%20not%20configured%20in%20backend%20.env`);
      return;
    }
    res.status(400).json({
      success: false,
      error: 'Slack OAuth is not configured. Please set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET in backend/.env',
    });
    return;
  }

  // Preserve user authentication token across OAuth redirect via state parameter
  let stateToken = req.query.token as string | undefined;
  if (!stateToken && req.headers.authorization?.startsWith('Bearer ')) {
    stateToken = req.headers.authorization.substring(7);
  }

  const authUrl = getSlackAuthUrl(stateToken);
  console.log('[Slack Auth] Redirecting user to Slack OAuth consent screen...');
  res.redirect(authUrl);
}

/**
 * GET /api/auth/slack/callback
 * Handles authorization callback from Slack, exchanges code for workspace tokens,
 * and saves connection info.
 */
export async function slackAuthCallbackHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errorQuery = req.query.error;
    if (errorQuery) {
      console.warn(`[Slack Auth] Authorization denied or failed: ${errorQuery}`);
      res.status(400).json({
        success: false,
        error: `Slack OAuth authorization cancelled or denied: ${errorQuery}`,
      });
      return;
    }

    const code = req.query.code as string | undefined;
    if (!code) {
      res.status(400).json({
        success: false,
        error: 'Missing authorization code in Slack OAuth callback',
      });
      return;
    }

    const stateToken = req.query.state as string | undefined;
    let userId: number | undefined;

    if (stateToken) {
      try {
        const payload = verifyAppJwt(stateToken);
        userId = payload.userId;
      } catch {
        console.warn('[Slack Auth] State token verification failed or expired.');
      }
    }

    const result = await handleSlackCallback(code, userId);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      res.redirect(`${frontendUrl}/settings?slack=connected`);
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Slack workspace connected successfully',
      data: {
        teamId: result.teamId,
        teamName: result.teamName,
        slackUserId: result.slackUserId,
        incomingWebhookChannel: result.incomingWebhookChannel,
      },
    });
  } catch (error: any) {
    console.error('[Slack Auth] Callback error:', error?.message);
    res.status(400).json({
      success: false,
      error: `Slack OAuth connection failed: ${error?.message || 'Unknown error'}`,
    });
  }
}

/**
 * GET /api/integrations/slack/status
 * Returns connection status of Slack workspace for the authenticated user.
 */
export async function getSlackStatusHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const status = await getSlackStatusForUser(req.user.userId);
    res.status(200).json({
      success: true,
      ...status,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/integrations/slack/webhook
 * Saves a direct Slack Incoming Webhook URL.
 */
export async function connectSlackWebhookHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { webhookUrl, channel } = req.body || {};
    if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('https://hooks.slack.com/')) {
      res.status(400).json({
        success: false,
        error: 'Invalid Slack webhook URL. Expected format: https://hooks.slack.com/services/...',
      });
      return;
    }

    const { upsertSlackIntegration } = await import('../models/slackIntegration.model');
    await upsertSlackIntegration({
      userId: req.user.userId,
      slackTeamId: 'webhook-connected',
      teamName: 'Connected Slack Channel',
      accessToken: 'webhook-mode',
      incomingWebhookUrl: webhookUrl.trim(),
      incomingWebhookChannel: channel ? String(channel).trim() : '#general',
    });

    res.status(200).json({
      success: true,
      message: 'Slack Webhook connected successfully!',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/integrations/slack
 * Disconnects active Slack integration for user.
 */
export async function disconnectSlackHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { deleteSlackIntegrationByUserId } = await import('../models/slackIntegration.model');
    await deleteSlackIntegrationByUserId(req.user.userId);

    res.status(200).json({
      success: true,
      message: 'Slack integration disconnected.',
    });
  } catch (error) {
    next(error);
  }
}
