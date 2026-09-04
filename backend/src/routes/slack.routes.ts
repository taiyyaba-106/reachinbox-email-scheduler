import { Router } from 'express';
import {
  initiateSlackAuthHandler,
  slackAuthCallbackHandler,
  getSlackStatusHandler,
} from '../controllers/slack.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

router.get('/auth/slack', initiateSlackAuthHandler);
router.get('/auth/slack/callback', slackAuthCallbackHandler);
router.get('/integrations/slack/status', authenticateJWT, getSlackStatusHandler);

export default router;
