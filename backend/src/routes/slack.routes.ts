import { Router } from 'express';
import {
  initiateSlackAuthHandler,
  slackAuthCallbackHandler,
  getSlackStatusHandler,
  connectSlackWebhookHandler,
  disconnectSlackHandler,
} from '../controllers/slack.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

router.get('/auth/slack', initiateSlackAuthHandler);
router.get('/auth/slack/callback', slackAuthCallbackHandler);
router.get('/integrations/slack/status', authenticateJWT, getSlackStatusHandler);
router.post('/integrations/slack/webhook', authenticateJWT, connectSlackWebhookHandler);
router.delete('/integrations/slack', authenticateJWT, disconnectSlackHandler);

export default router;
