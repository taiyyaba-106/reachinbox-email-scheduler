import { Request, Response, NextFunction } from 'express';
import { dbPool, initDatabase } from '../config/db';
import { emailQueue } from '../queues/emailQueue';
import { formatEmailRecord } from '../models/email.model';
import { RowDataPacket } from 'mysql2';

export async function handleGetDashboardStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await initDatabase();

    // 1. Authoritative MySQL Counts
    const countsSql = `
      SELECT 
        COUNT(*) AS totalEmails,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pendingEmails,
        SUM(CASE WHEN status = 'QUEUED' THEN 1 ELSE 0 END) AS queuedEmails,
        SUM(CASE WHEN status = 'PROCESSING' THEN 1 ELSE 0 END) AS processingEmails,
        SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) AS sentEmails,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS failedEmails,
        SUM(CASE WHEN DATE(scheduled_at) = CURDATE() THEN 1 ELSE 0 END) AS scheduledToday,
        SUM(CASE WHEN status = 'SENT' AND DATE(sent_at) = CURDATE() THEN 1 ELSE 0 END) AS sentToday,
        SUM(CASE WHEN status = 'FAILED' AND DATE(updated_at) = CURDATE() THEN 1 ELSE 0 END) AS failedToday
      FROM scheduled_emails
    `;

    const [countRows] = await dbPool.execute<RowDataPacket[]>(countsSql);
    const row = countRows[0] || {};

    const totalEmails = Number(row.totalEmails || 0);
    const pendingEmails = Number(row.pendingEmails || 0);
    const queuedEmails = Number(row.queuedEmails || 0);
    const processingEmails = Number(row.processingEmails || 0);
    const sentEmails = Number(row.sentEmails || 0);
    const failedEmails = Number(row.failedEmails || 0);
    const scheduledToday = Number(row.scheduledToday || 0);
    const sentToday = Number(row.sentToday || 0);
    const failedToday = Number(row.failedToday || 0);

    // 2. Fetch Recent 5 Email Records
    const recentSql = `
      SELECT * FROM scheduled_emails 
      ORDER BY created_at DESC, id DESC 
      LIMIT 5
    `;
    const [recentRows] = await dbPool.execute<RowDataPacket[]>(recentSql);
    const recentEmails = (recentRows as any[] || []).map((row) => formatEmailRecord(row));

    // 3. Live BullMQ Queue Counts
    let bullmqCounts = {
      waiting: 0,
      delayed: 0,
      active: 0,
      completed: 0,
      failed: 0,
    };

    try {
      const counts = await emailQueue.getJobCounts('waiting', 'delayed', 'active', 'completed', 'failed');
      bullmqCounts = {
        waiting: counts.waiting || 0,
        delayed: counts.delayed || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
      };
    } catch (err: any) {
      console.warn('[Dashboard API] Failed to fetch BullMQ queue counts:', err?.message);
    }

    // 4. Delivery Rate Percentage
    const finishedTotal = sentEmails + failedEmails;
    const deliveryRate = finishedTotal > 0 ? Math.round((sentEmails / finishedTotal) * 1000) / 10 : 100;

    res.status(200).json({
      success: true,
      data: {
        totalEmails,
        pendingEmails,
        queuedEmails,
        processingEmails,
        sentEmails,
        failedEmails,
        scheduledToday,
        sentToday,
        failedToday,
        deliveryRate,
        recentEmails,
        bullmq: bullmqCounts,
      },
    });
  } catch (error) {
    next(error);
  }
}
