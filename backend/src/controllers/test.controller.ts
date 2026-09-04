import { Request, Response, NextFunction } from 'express';
import { emailQueue } from '../queues/emailQueue';
import { insertPendingEmail, markEmailAsSent } from '../models/email.model';
import { markEmailCompletedInRedis } from '../services/idempotencyService';

export async function addTestJobToQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const jobData = req.body || {};
    const job = await emailQueue.add('test-job', jobData);

    res.status(200).json({
      success: true,
      message: 'Test job added to queue',
      jobId: job.id,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Test 1: Duplicate Job ID
 * Enqueues a job with a deterministic jobId (e.g. email-9999).
 * Attempts to enqueue a second job with the SAME jobId.
 */
export async function testDuplicateJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const testEmailId = req.body.emailId || 99991;
    const deterministicJobId = `email-${testEmailId}`;

    const job1 = await emailQueue.add(
      'send-email',
      { emailId: testEmailId, recipient: 'test1@example.com', subject: 'Idempotency Test 1', body: 'Test Body' },
      { jobId: deterministicJobId }
    );

    let job2Error = null;
    let job2Added = false;
    try {
      const job2 = await emailQueue.add(
        'send-email',
        { emailId: testEmailId, recipient: 'test2@example.com', subject: 'Idempotency Test 2', body: 'Test Body' },
        { jobId: deterministicJobId }
      );
      job2Added = job2.id === deterministicJobId;
    } catch (err: any) {
      job2Error = err?.message || 'Duplicate job rejected';
    }

    res.status(200).json({
      success: true,
      message: 'Duplicate job ID test executed',
      deterministicJobId,
      job1Id: job1.id,
      job2Added,
      job2Error,
      explanation: 'BullMQ ignores or rejects adding duplicate deterministic job IDs if a job with that ID already exists.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Test 2: Already SENT Email
 * Creates an email in MySQL marked as SENT and in Redis completion store,
 * then manually adds a job referencing this emailId to BullMQ.
 */
export async function testAlreadySent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const emailId = await insertPendingEmail({
      recipient: 'already-sent@example.com',
      subject: 'Already Sent Test',
      body: 'This email is already sent.',
      scheduledAt: new Date(),
    });

    await markEmailAsSent(emailId, 'msg-already-sent-123');
    await markEmailCompletedInRedis(emailId);

    const job = await emailQueue.add(
      'send-email',
      { emailId, recipient: 'already-sent@example.com', subject: 'Already Sent Test', body: 'This email is already sent.' },
      { jobId: `email-${emailId}-${Date.now()}` }
    );

    res.status(200).json({
      success: true,
      message: 'Already SENT email test triggered',
      emailId,
      jobId: job.id,
      explanation: 'Worker will check Redis/MySQL, see status is SENT, log idempotency skip, and send 0 emails.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Test 3: Concurrent Processing
 * Enqueues 2 worker jobs for the same unsent emailId simultaneously.
 */
export async function testConcurrentProcessing(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const emailId = await insertPendingEmail({
      recipient: 'concurrent@example.com',
      subject: 'Concurrent Test',
      body: 'Concurrent test body.',
      scheduledAt: new Date(),
    });

    // Enqueue 2 jobs with different BullMQ job IDs targeting the same logical emailId
    const job1 = await emailQueue.add(
      'send-email',
      { emailId, recipient: 'concurrent@example.com', subject: 'Concurrent Test 1', body: 'Concurrent body' },
      { jobId: `email-${emailId}-worker1-${Date.now()}` }
    );

    const job2 = await emailQueue.add(
      'send-email',
      { emailId, recipient: 'concurrent@example.com', subject: 'Concurrent Test 2', body: 'Concurrent body' },
      { jobId: `email-${emailId}-worker2-${Date.now()}` }
    );

    res.status(200).json({
      success: true,
      message: 'Concurrent processing test triggered for email ID ' + emailId,
      emailId,
      job1Id: job1.id,
      job2Id: job2.id,
      explanation: 'Only one worker will acquire the atomic Redis processing lock. The second worker will detect lock acquisition failure or SENT state and skip delivery.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Inspects BullMQ Queue State (Delayed, Waiting, Active, Completed, Failed Counts)
 */
export async function getQueueState(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const counts = await emailQueue.getJobCounts('delayed', 'waiting', 'active', 'completed', 'failed');
    const delayedJobs = await emailQueue.getDelayed();
    const delayedList = delayedJobs.map((j) => ({
      id: j.id,
      name: j.name,
      data: j.data,
      delay: j.opts.delay,
      timestamp: j.timestamp,
    }));

    res.status(200).json({
      success: true,
      counts,
      delayedJobsCount: delayedList.length,
      delayedJobs: delayedList,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Test Endpoint: Dispatches a sample email success or failure notification directly to a Slack incoming webhook URL.
 */
export async function testSlackWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { webhookUrl, type } = req.body;
    if (!webhookUrl || typeof webhookUrl !== 'string') {
      res.status(400).json({ success: false, error: 'webhookUrl is required' });
      return;
    }

    const isFailure = type === 'failure';
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: isFailure ? '🚨 Email Delivery Failed (Test)' : '✅ Email Sent Successfully (Test)',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: '*Email ID:*\n#999' },
          { type: 'mrkdwn', text: `*Status:*\n\`${isFailure ? 'FAILED' : 'SENT'}\`` },
          { type: 'mrkdwn', text: '*Recipient:*\nuser@example.com' },
          { type: 'mrkdwn', text: '*Subject:*\nQuarterly Meeting Sync' },
        ],
      },
    ];

    const slackRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    });

    res.status(200).json({
      success: true,
      message: 'Test notification sent to Slack webhook',
      httpStatus: slackRes.status,
    });
  } catch (error) {
    next(error);
  }
}



