import { Router } from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { emailQueue } from '../queues/emailQueue';
import { handleGetDashboardStats } from '../controllers/dashboard.controller';

// Initialize Bull Board Express Adapter
export const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});

export const dashboardRouter = serverAdapter.getRouter();

// Dashboard Statistics Router for GET /api/dashboard/stats
const apiRouter = Router();
apiRouter.get('/dashboard/stats', handleGetDashboardStats);

export default apiRouter;
