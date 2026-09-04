import { Worker, Job } from 'bullmq';
import { config } from '../config/env';
import { EMAIL_QUEUE_NAME, getBullMQRedisOptions } from '../queues/emailQueue';
import {
  findScheduledEmailById,
  updateEmailJobStatus,
  markEmailAsSent,
  markEmailAsFailed,
} from '../models/email.model';
import { sendEmail } from '../services/emailService';
import { checkAndIncrementRateLimit } from '../services/rateLimitService';
import {
  isEmailCompletedInRedis,
  markEmailCompletedInRedis,
  acquireEmailLock,
  releaseEmailLock,
} from '../services/idempotencyService';
import { getSchedulerConfig } from '../services/schedulerConfigService';
import {
  sendEmailSentNotification,
  sendEmailFailedNotification,
} from '../services/slackService';

export interface EmailJobData {

  emailId?: number;
  recipient?: string;
  subject?: string;
  body?: string;
  scheduledAt?: string;
  message?: string;
  [key: string]: any;
}

export const emailWorker = new Worker<EmailJobData>(
  EMAIL_QUEUE_NAME,
  async (job: Job<EmailJobData>) => {
    const { emailId, recipient, subject, body } = job.data;
    const attemptNumber = job.attemptsMade + 1;
    const maxAttempts = job.opts.attempts || config.emailJob.attempts || 3;
    const lockToken = `worker-${process.pid}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Read runtime configuration from Redis
    const schedulerConfig = await getSchedulerConfig();

    console.log(`[BullMQ Worker] [Job ${job.id}] STARTED processing (Attempt ${attemptNumber}/${maxAttempts}) | Config Enabled: ${schedulerConfig.enabled} | Limit: ${schedulerConfig.hourlyEmailLimit}`);

    // Check if scheduler is enabled in Redis runtime configuration
    if (!schedulerConfig.enabled) {
      console.warn(`[BullMQ Worker] [Job ${job.id}] Scheduler is currently DISABLED in Redis runtime configuration. Delaying job processing by 10,000ms.`);
      await job.moveToDelayed(Date.now() + 10000, job.token);
      return;
    }

    // If job contains emailId, perform database load and idempotency check
    if (emailId) {
      // 1. Idempotency Layer 1: Check Redis completion key
      if (await isEmailCompletedInRedis(emailId)) {
        console.log(`[Idempotency] [Job ${job.id}] Email ID ${emailId} is already marked SENT in Redis idempotency store. Skipping duplicate delivery.`);
        return;
      }

      // 2. Idempotency Layer 2: Check MySQL database status
      const emailRecord = await findScheduledEmailById(emailId);
      if (emailRecord && emailRecord.status === 'SENT') {
        console.log(`[Idempotency] [Job ${job.id}] Email ID ${emailId} is already SENT in MySQL database. Syncing Redis & skipping.`);
        await markEmailCompletedInRedis(emailId);
        return;
      }

      // 3. Idempotency Layer 3: Acquire atomic Redis processing lock
      const lockAcquired = await acquireEmailLock(emailId, lockToken);
      if (!lockAcquired) {
        console.warn(`[Idempotency] [Job ${job.id}] Processing lock for Email ID ${emailId} is currently held by another worker. Skipping duplicate processing.`);
        return;
      }

      const targetRecipient = recipient || emailRecord?.recipient || 'Unknown Recipient';
      const targetSubject = subject || emailRecord?.subject || 'No Subject';
      const targetBody = body || emailRecord?.body || '';

      try {
        await updateEmailJobStatus(emailId, 'PROCESSING', null, null, attemptNumber);

        if (!recipient && !emailRecord?.recipient || !subject && !emailRecord?.subject || !body && !emailRecord?.body) {
          const errorMsg = 'Missing recipient, subject, or body for email delivery';
          await markEmailAsFailed(emailId, errorMsg, attemptNumber);
          throw new Error(errorMsg);
        }


        // Check Redis-backed hourly email rate limit using Redis runtime configuration
        const rateLimitResult = await checkAndIncrementRateLimit(schedulerConfig.hourlyEmailLimit);
        if (!rateLimitResult.allowed) {
          console.warn(`[BullMQ Worker] [Job ${job.id}] Email delayed because hourly rate limit was reached (${rateLimitResult.currentCount}/${rateLimitResult.maxLimit}). Rescheduling job for next hourly window in ${rateLimitResult.delayMs}ms.`);
          await job.moveToDelayed(Date.now() + rateLimitResult.delayMs, job.token);
          return;
        }

        // Controlled failure test trigger
        if (targetRecipient.includes('fail') || targetSubject.includes('TRIGGER_FAIL')) {
          throw new Error('Controlled SMTP delivery failure for testing BullMQ retries');
        }

        // Artificial processing delay from Redis configuration (or env fallback)
        const delayMs = schedulerConfig.artificialDelayMs || config.workerArtificialDelayMs;
        if (delayMs > 0) {
          console.log(`[BullMQ Worker] [Job ${job.id}] Artificial delay of ${delayMs}ms active...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }

        // 4. Critical Section: Send email via Ethereal SMTP service
        const sendResult = await sendEmail({
          recipient: targetRecipient,
          subject: targetSubject,
          body: targetBody,
        });

        // 5. Persist SENT state in MySQL & Redis Idempotency Store
        await markEmailAsSent(emailId, sendResult.messageId);
        await markEmailCompletedInRedis(emailId);



        // 6. Trigger real Slack notification after successful SMTP delivery & DB persistence
        sendEmailSentNotification({
          emailId,
          recipient: targetRecipient,
          subject: targetSubject,
          scheduledAt: emailRecord?.scheduled_at,
          sentAt: new Date(),
        }).catch((err) => console.warn('[Slack Notification] Error dispatching sent notification:', err?.message));

        console.log(`[BullMQ Worker] [Job ${job.id}] FINISHED processing successfully. Message ID: ${sendResult.messageId}`);
        if (sendResult.previewUrl) {
          console.log(`[BullMQ Worker] [Job ${job.id}] Ethereal Preview URL: ${sendResult.previewUrl}`);
        }
      } catch (err: any) {
        const errorMsg = err?.message || 'Failed to deliver email via SMTP';
        const isFinalAttempt = attemptNumber >= maxAttempts;

        if (isFinalAttempt) {
          console.error(`[BullMQ Worker] [Job ${job.id}] PERMANENTLY FAILED after ${attemptNumber} attempts: ${errorMsg}`);
          await markEmailAsFailed(emailId, errorMsg, attemptNumber);

          // Trigger real Slack failure notification ONLY after permanent failure
          sendEmailFailedNotification({
            emailId,
            recipient: targetRecipient,
            subject: targetSubject,
            error: errorMsg,
            attempts: attemptNumber,
          }).catch((err) => console.warn('[Slack Notification] Error dispatching failed notification:', err?.message));
        } else {
          console.warn(`[BullMQ Worker] [Job ${job.id}] Failed attempt ${attemptNumber}/${maxAttempts}: ${errorMsg}. Retrying with exponential backoff...`);
          await updateEmailJobStatus(emailId, 'PROCESSING', null, `Attempt ${attemptNumber}/${maxAttempts} failed: ${errorMsg}`, attemptNumber);
        }

        throw err;
      }
 finally {
        // Release processing lock so future attempts can acquire if needed
        await releaseEmailLock(emailId, lockToken);
      }
    } else {
      console.log(`[BullMQ Worker] [Job ${job.id}] Test job data logged:`, JSON.stringify(job.data));
    }
  },
  {
    connection: getBullMQRedisOptions(),
    concurrency: config.workerConcurrency,
  }
);

export function updateWorkerConcurrency(concurrency: number): void {
  emailWorker.concurrency = concurrency;
  console.log(`[BullMQ Worker] Concurrency updated dynamically to ${concurrency}`);
}



emailWorker.on('completed', (job: Job<EmailJobData>) => {
  console.log(`[BullMQ Worker] [Job ${job.id}] Completed event fired.`);
});

emailWorker.on('failed', (job: Job<EmailJobData> | undefined, err: Error) => {
  const attempts = (job?.attemptsMade || 0) + 1;
  const max = job?.opts?.attempts || config.emailJob.attempts || 3;
  if (attempts >= max) {
    console.error(`[BullMQ Worker] [Job ${job?.id}] Final failure event after ${attempts} attempts: ${err.message}`);
  } else {
    console.warn(`[BullMQ Worker] [Job ${job?.id}] Attempt ${attempts} failed. Scheduled for exponential backoff retry.`);
  }
});

emailWorker.on('error', (err: Error) => {
  console.error('[BullMQ Worker] Redis connection / Worker error:', err.message);
});
