import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { dbPool, initDatabase } from '../config/db';
import { indexEmailDocument, updateEmailDocumentStatus } from '../services/elasticsearchService';

export interface ScheduledEmailRecord {
  id: number;
  recipient: string;
  subject: string;
  body: string;
  scheduled_at: Date;
  sent_at?: Date | null;
  attempts?: number;
  status: 'PENDING' | 'QUEUED' | 'PROCESSING' | 'SENT' | 'FAILED';
  job_id: string | null;
  message_id?: string | null;
  error_message?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateScheduledEmailDTO {
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: Date;
  userId?: number;
}

export async function insertPendingEmail(data: CreateScheduledEmailDTO): Promise<number> {
  await initDatabase();
  const query = `
    INSERT INTO scheduled_emails (recipient, subject, body, scheduled_at, status, user_id)
    VALUES (?, ?, ?, ?, 'PENDING', ?)
  `;
  const [result] = await dbPool.execute<ResultSetHeader>(query, [
    data.recipient,
    data.subject,
    data.body,
    data.scheduledAt,
    data.userId || null,
  ]);

  const emailId = result.insertId;

  // Sync creation with Elasticsearch
  indexEmailDocument({
    id: emailId,
    recipient: data.recipient,
    subject: data.subject,
    body: data.body,
    status: 'PENDING',
    scheduledAt: data.scheduledAt,
    createdAt: new Date(),
    updatedAt: new Date(),
    attempts: 0,
  }).catch((err) => console.warn('[Elasticsearch] Sync error:', err?.message));

  return emailId;
}

export async function updateEmailJobStatus(
  id: number,
  status: 'QUEUED' | 'PROCESSING' | 'SENT' | 'FAILED',
  jobId?: string | null,
  errorMessage?: string | null,
  attemptsCount?: number
): Promise<void> {
  const query = `
    UPDATE scheduled_emails
    SET status = ?,
        job_id = COALESCE(?, job_id),
        error_message = ?,
        attempts = COALESCE(?, attempts)
    WHERE id = ?
  `;
  await dbPool.execute(query, [status, jobId || null, errorMessage || null, attemptsCount || null, id]);

  // Sync status update with Elasticsearch
  updateEmailDocumentStatus(id, {
    status,
    ...(errorMessage ? { error: errorMessage } : {}),
    ...(attemptsCount !== undefined ? { attempts: attemptsCount } : {}),
  }).catch((err) => console.warn('[Elasticsearch] Sync error:', err?.message));
}

export async function markEmailAsSent(id: number, messageId: string): Promise<void> {
  const query = `
    UPDATE scheduled_emails
    SET status = 'SENT',
        sent_at = NOW(),
        message_id = ?,
        attempts = attempts + 1,
        error_message = NULL
    WHERE id = ?
  `;
  await dbPool.execute(query, [messageId, id]);

  // Sync SENT status with Elasticsearch
  updateEmailDocumentStatus(id, {
    status: 'SENT',
    sentAt: new Date(),
    error: null,
  }).catch((err) => console.warn('[Elasticsearch] Sync error:', err?.message));
}

export async function markEmailAsFailed(id: number, errorMessage: string, attemptsCount?: number): Promise<void> {
  const query = `
    UPDATE scheduled_emails
    SET status = 'FAILED',
        attempts = COALESCE(?, attempts + 1),
        error_message = ?
    WHERE id = ?
  `;
  await dbPool.execute(query, [attemptsCount || null, errorMessage, id]);

  // Sync FAILED status with Elasticsearch
  updateEmailDocumentStatus(id, {
    status: 'FAILED',
    error: errorMessage,
    ...(attemptsCount !== undefined ? { attempts: attemptsCount } : {}),
  }).catch((err) => console.warn('[Elasticsearch] Sync error:', err?.message));
}


export async function findScheduledEmailById(id: number): Promise<ScheduledEmailRecord | null> {
  await initDatabase();
  const query = `SELECT * FROM scheduled_emails WHERE id = ?`;
  const [rows] = await dbPool.execute<RowDataPacket[]>(query, [id]);
  if (rows.length === 0) return null;
  return rows[0] as ScheduledEmailRecord;
}

export function formatEmailRecord(record: ScheduledEmailRecord) {
  return {
    id: record.id,
    recipient: record.recipient,
    subject: record.subject,
    body: record.body,
    scheduledAt: record.scheduled_at,
    sentAt: record.sent_at || null,
    attempts: record.attempts || 0,
    status: record.status,
    jobId: record.job_id || null,
    messageId: record.message_id || null,
    errorMessage: record.error_message || null,
    createdAt: record.created_at || null,
    updatedAt: record.updated_at || null,
  };
}

export async function getPaginatedEmails(options: {
  page?: number;
  limit?: number;
  status?: string;
  userId?: number;
}): Promise<{ emails: any[]; total: number }> {
  await initDatabase();
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(100, options.limit || 10));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];

  if (options.status && options.status.toUpperCase() !== 'ALL') {
    conditions.push('status = ?');
    params.push(options.status.toUpperCase());
  }

  if (options.userId) {
    conditions.push('(user_id = ? OR user_id IS NULL)');
    params.push(options.userId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) as total FROM scheduled_emails ${whereClause}`;
  const [countRows] = await dbPool.execute<RowDataPacket[]>(countQuery, params);
  const total = countRows[0]?.total || 0;

  // Prepared statement params for LIMIT and OFFSET in MySQL must be string/numbers
  const dataQuery = `
    SELECT * FROM scheduled_emails 
    ${whereClause} 
    ORDER BY created_at DESC, id DESC 
    LIMIT ${Number(limit)} OFFSET ${Number(offset)}
  `;
  const [rows] = await dbPool.execute<RowDataPacket[]>(dataQuery, params);

  const formattedEmails = (rows as ScheduledEmailRecord[]).map(formatEmailRecord);

  return {
    emails: formattedEmails,
    total,
  };
}

/**
 * Recovers stale emails stuck in 'PROCESSING' state due to an ungraceful server crash on backend restart.
 * Resets them back to 'QUEUED' so worker / BullMQ retry logic can safely process them.
 */
export async function recoverStaleProcessingEmails(): Promise<number> {
  await initDatabase();
  const query = `
    UPDATE scheduled_emails
    SET status = 'QUEUED',
        error_message = 'Reset status from PROCESSING to QUEUED on server restart'
    WHERE status = 'PROCESSING'
  `;
  const [result] = await dbPool.execute<ResultSetHeader>(query);
  return result.affectedRows;
}


