import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env';
import { errorMiddleware } from './middleware/error.middleware';
import healthRoutes from './routes/health.routes';
import testRoutes from './routes/test.routes';
import emailRoutes from './routes/email.routes';
import configRoutes from './routes/config.routes';
import searchRoutes from './routes/search.routes';
import authRoutes from './routes/auth.routes';
import slackRoutes from './routes/slack.routes';
import dashboardApiRouter, { dashboardRouter } from './routes/dashboard.routes';
import { dashboardAuth, optionalJWT } from './middleware/auth.middleware';
import { emailQueue, EMAIL_QUEUE_NAME } from './queues/emailQueue';
import { emailWorker } from './workers/emailWorker';
import { recoverStaleProcessingEmails } from './models/email.model';
import { initSchedulerConfig } from './services/schedulerConfigService';
import { initElasticsearch } from './services/elasticsearchService';
import { initUserModel } from './models/user.model';
import { initSlackIntegrationModel } from './models/slackIntegration.model';

const app: Express = express();

// Security & Parsing Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.corsOrigin || '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, status: 'OK', service: 'reachinbox-api' });
});
app.use('/api', optionalJWT);

// BullMQ Live Queue Dashboard Route
app.use('/admin/queues', dashboardAuth, dashboardRouter);

// API Routes
app.use('/api', healthRoutes);
app.use('/api', testRoutes);
app.use('/api', searchRoutes);
app.use('/api', emailRoutes);
app.use('/api', configRoutes);
app.use('/api', dashboardApiRouter);
app.use('/api', authRoutes);
app.use('/api', slackRoutes);

import path from 'path';
import fs from 'fs';

// Global Error Handler for API routes
app.use('/api', errorMiddleware);

// Serve Frontend Static Bundle if public or dist folder exists
function getActivePublicPath(): string | null {
  const possiblePublicPaths = [
    path.resolve(__dirname, './public'),
    path.resolve(__dirname, '../public'),
    path.resolve(process.cwd(), 'public'),
    path.resolve(process.cwd(), 'backend/public'),
    path.resolve(process.cwd(), 'dist/public'),
    path.resolve(__dirname, '../../frontend/dist'),
    path.resolve(process.cwd(), '../frontend/dist'),
  ];

  for (const p of possiblePublicPaths) {
    if (fs.existsSync(path.join(p, 'index.html'))) {
      return p;
    }
  }
  return null;
}

const activePublicPath = getActivePublicPath();
if (activePublicPath) {
  console.log(`[Static Frontend] Active static directory found at: ${activePublicPath}`);
  app.use(express.static(activePublicPath));
} else {
  console.warn('[Static Frontend Warning] No frontend index.html found in candidate paths.');
}

// Catch-all SPA route handler for client-side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/admin')) {
    return next();
  }
  const currentPublic = activePublicPath || getActivePublicPath();
  if (currentPublic) {
    return res.sendFile(path.join(currentPublic, 'index.html'));
  }
  return res.status(200).json({ success: true, status: 'OK', service: 'reachinbox-api' });
});

app.use(errorMiddleware);

// Start server if executed directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, '0.0.0.0', async () => {
    console.log(`=================================`);
    console.log(`🚀 Server running on port ${config.port}`);
    console.log(`🏥 Health check: http://localhost:${config.port}/api/health`);
    console.log(`📊 BullMQ Dashboard: http://localhost:${config.port}/admin/queues`);


    try {
      await emailQueue.waitUntilReady();
      console.log(`[BullMQ Queue] Connected to Redis queue '${EMAIL_QUEUE_NAME}'`);

      await emailWorker.waitUntilReady();
      console.log(`[BullMQ Worker] Connected and ready (Concurrency: ${config.workerConcurrency})`);

      await initUserModel();

      await initSlackIntegrationModel();

      await initSchedulerConfig();

      await initElasticsearch();

      const recoveredCount = await recoverStaleProcessingEmails();
      if (recoveredCount > 0) {
        console.log(`[Startup Recovery] Recovered ${recoveredCount} stale 'PROCESSING' email(s) back to 'QUEUED' state.`);
      } else {
        console.log(`[Startup Recovery] No stale 'PROCESSING' emails found.`);
      }
    } catch (err: any) {
      console.error(`[Startup Error] Failed to initialize queue/worker/database recovery:`, err?.message);
    }
    console.log(`=================================`);
  });
}

export default app;





