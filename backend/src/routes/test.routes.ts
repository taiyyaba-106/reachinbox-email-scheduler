import { Router } from 'express';
import {
  addTestJobToQueue,
  testDuplicateJob,
  testAlreadySent,
  testConcurrentProcessing,
  getQueueState,
  testSlackWebhook,
} from '../controllers/test.controller';

const router = Router();

router.post('/test/queue', addTestJobToQueue);
router.get('/test/queue/state', getQueueState);
router.post('/test/idempotency/duplicate-job', testDuplicateJob);
router.post('/test/idempotency/already-sent', testAlreadySent);
router.post('/test/idempotency/concurrent', testConcurrentProcessing);
router.post('/test/slack/webhook', testSlackWebhook);

export default router;



