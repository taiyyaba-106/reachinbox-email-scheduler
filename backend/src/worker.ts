import { emailWorker } from './workers/emailWorker';
import { emailQueue, EMAIL_QUEUE_NAME } from './queues/emailQueue';
import { initSchedulerConfig } from './services/schedulerConfigService';
import { config } from './config/env';

async function startWorkerProcess(): Promise<void> {
  console.log(`=================================`);
  console.log(`⚙️ Starting Standalone BullMQ Worker Process...`);
  console.log(`[BullMQ Worker] Target Queue: '${EMAIL_QUEUE_NAME}'`);
  console.log(`[BullMQ Worker] Configured Concurrency: ${config.workerConcurrency}`);

  try {
    await emailQueue.waitUntilReady();
    console.log(`[BullMQ Worker] Queue connection established.`);

    await initSchedulerConfig();
    console.log(`[BullMQ Worker] Redis runtime configuration loaded.`);

    await emailWorker.waitUntilReady();
    console.log(`✅ [BullMQ Worker] Worker process is active and processing delayed jobs.`);
  } catch (err: any) {
    console.error(`❌ [BullMQ Worker Startup Error] Failed to initialize worker:`, err?.message || err);
  }
  console.log(`=================================`);
}

// Graceful shutdown handling
const shutdown = async () => {
  console.log('\n[BullMQ Worker] Shutting down worker process gracefully...');
  try {
    await emailWorker.close();
    console.log('[BullMQ Worker] Worker closed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[BullMQ Worker] Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

startWorkerProcess();
