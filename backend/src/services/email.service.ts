import { emailQueue } from '../queues/emailQueue';
import { insertPendingEmail, updateEmailJobStatus } from '../models/email.model';
import { config } from '../config/env';

export interface ScheduleEmailPayload {
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  userId?: number;
}

export interface ScheduleEmailResult {
  success: boolean;
  message: string;
  emailId: number;
  jobId: string;
}

export async function scheduleEmail(payload: ScheduleEmailPayload): Promise<ScheduleEmailResult> {
  const scheduledDate = new Date(payload.scheduledAt);

  // 1. Insert into MySQL database as PENDING
  const emailId = await insertPendingEmail({
    recipient: payload.recipient,
    subject: payload.subject,
    body: payload.body,
    scheduledAt: scheduledDate,
    userId: payload.userId,
  });

  // 2. Calculate delay in milliseconds
  const delay = Math.max(0, scheduledDate.getTime() - Date.now());
  const jobId = `email-${emailId}`;

  // 3. Add BullMQ job to "email-scheduler" queue using delayed-job functionality
  try {
    await emailQueue.add(
      'send-email',
      {
        emailId,
        recipient: payload.recipient,
        subject: payload.subject,
        body: payload.body,
        scheduledAt: payload.scheduledAt,
      },
      {
        delay,
        jobId,
        attempts: config.emailJob.attempts,
        backoff: {
          type: 'exponential',
          delay: config.emailJob.backoffDelay,
        },
      }
    );
  } catch (error: any) {
    // Safely update DB status to FAILED if queueing fails so record does not remain stuck in PENDING/QUEUED
    await updateEmailJobStatus(emailId, 'FAILED', null, error?.message || 'Failed to add job to BullMQ queue');
    throw new Error(`Failed to queue email job: ${error?.message || 'BullMQ queue error'}`);
  }

  // 4. Update status from PENDING to QUEUED in database
  await updateEmailJobStatus(emailId, 'QUEUED', jobId);

  return {
    success: true,
    message: 'Email scheduled successfully',
    emailId,
    jobId,
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface BulkScheduleItemResult {
  row: number;
  recipient: string;
  subject: string;
  success: boolean;
  emailId?: number;
  jobId?: string;
  error?: string;
}

export interface BulkScheduleResult {
  success: boolean;
  message: string;
  total: number;
  successful: number;
  failed: number;
  results: BulkScheduleItemResult[];
  errors: { row: number; recipient: string; error: string }[];
}

export async function scheduleBulkEmails(payloads: ScheduleEmailPayload[]): Promise<BulkScheduleResult> {
  const results: BulkScheduleItemResult[] = [];
  const errors: { row: number; recipient: string; error: string }[] = [];
  const seenKeys = new Set<string>();

  let successfulCount = 0;
  let failedCount = 0;

  for (let i = 0; i < payloads.length; i++) {
    const item = payloads[i];
    const rowNum = i + 1;
    const recipient = item?.recipient ? String(item.recipient).trim() : '';
    const subject = item?.subject ? String(item.subject).trim() : '';
    const body = item?.body ? String(item.body).trim() : '';
    const scheduledAt = item?.scheduledAt ? String(item.scheduledAt).trim() : '';

    // Re-validation 1: Empty row check
    if (!recipient && !subject && !body && !scheduledAt) {
      failedCount++;
      const errorText = 'Empty CSV row.';
      results.push({ row: rowNum, recipient: 'N/A', subject: 'N/A', success: false, error: errorText });
      errors.push({ row: rowNum, recipient: 'N/A', error: errorText });
      continue;
    }

    // Re-validation 2: Recipient check
    if (!recipient || !EMAIL_REGEX.test(recipient)) {
      failedCount++;
      const errorText = 'Invalid recipient email format.';
      results.push({ row: rowNum, recipient: recipient || 'Missing', subject, success: false, error: errorText });
      errors.push({ row: rowNum, recipient: recipient || 'Missing', error: errorText });
      continue;
    }

    // Re-validation 3: Subject check
    if (!subject) {
      failedCount++;
      const errorText = 'Subject is required.';
      results.push({ row: rowNum, recipient, subject: 'Missing', success: false, error: errorText });
      errors.push({ row: rowNum, recipient, error: errorText });
      continue;
    }

    // Re-validation 4: Body check
    if (!body) {
      failedCount++;
      const errorText = 'Body content is required.';
      results.push({ row: rowNum, recipient, subject, success: false, error: errorText });
      errors.push({ row: rowNum, recipient, error: errorText });
      continue;
    }

    // Re-validation 5: Date check
    if (!scheduledAt || isNaN(Date.parse(scheduledAt))) {
      failedCount++;
      const errorText = 'Invalid scheduledAt date format.';
      results.push({ row: rowNum, recipient, subject, success: false, error: errorText });
      errors.push({ row: rowNum, recipient, error: errorText });
      continue;
    }

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate.getTime() <= Date.now()) {
      failedCount++;
      const errorText = 'Scheduled date/time must be in the future.';
      results.push({ row: rowNum, recipient, subject, success: false, error: errorText });
      errors.push({ row: rowNum, recipient, error: errorText });
      continue;
    }

    // Re-validation 6: Duplicate detection within payload
    const dupKey = `${recipient.toLowerCase()}|${subject}|${body}|${scheduledDate.toISOString()}`;
    if (seenKeys.has(dupKey)) {
      failedCount++;
      const errorText = 'Duplicate email record within CSV file.';
      results.push({ row: rowNum, recipient, subject, success: false, error: errorText });
      errors.push({ row: rowNum, recipient, error: errorText });
      continue;
    }
    seenKeys.add(dupKey);

    // Passed all validations -> Schedule using existing MySQL + BullMQ logic
    try {
      const scheduleRes = await scheduleEmail({
        recipient,
        subject,
        body,
        scheduledAt: scheduledDate.toISOString(),
      });

      successfulCount++;
      results.push({
        row: rowNum,
        recipient,
        subject,
        success: true,
        emailId: scheduleRes.emailId,
        jobId: scheduleRes.jobId,
      });
    } catch (err: any) {
      failedCount++;
      const errorText = err?.message || 'Failed to schedule email.';
      results.push({ row: rowNum, recipient, subject, success: false, error: errorText });
      errors.push({ row: rowNum, recipient, error: errorText });
    }
  }

  return {
    success: true,
    message: `Processed ${payloads.length} rows: ${successfulCount} scheduled, ${failedCount} failed.`,
    total: payloads.length,
    successful: successfulCount,
    failed: failedCount,
    results,
    errors,
  };
}

