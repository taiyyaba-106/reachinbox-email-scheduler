import { Router } from 'express';
import {
  initiateGoogleAuthHandler,
  googleAuthCallbackHandler,
  getMeHandler,
  demoLoginHandler,
} from '../controllers/auth.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

router.get('/auth/google', initiateGoogleAuthHandler);
router.get('/auth/google/callback', googleAuthCallbackHandler);
router.post('/auth/demo', demoLoginHandler);
router.get('/auth/me', authenticateJWT, getMeHandler);

export default router;
