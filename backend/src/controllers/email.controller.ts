import { Request, Response, NextFunction } from 'express';
import { scheduleEmail } from '../services/email.service';
import { sendError } from '../utils/apiResponse';
import { AuthRequest } from '../middleware/auth.middleware';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function handleScheduleEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { recipient, subject, body, scheduledAt } = req.body || {};

    // 1. Validate recipient email
    if (!recipient || typeof recipient !== 'string' || !EMAIL_REGEX.test(recipient.trim())) {
      sendError(res, 400, 'Invalid recipient email address format.', 'INVALID_RECIPIENT');
      return;
    }

    // 2. Validate subject
    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      sendError(res, 400, 'Subject is required and cannot be empty.', 'INVALID_SUBJECT');
      return;
    }

    // 3. Validate body
    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      sendError(res, 400, 'Body is required and cannot be empty.', 'INVALID_BODY');
      return;
    }

    // 4. Validate scheduledAt
    if (!scheduledAt || isNaN(Date.parse(scheduledAt))) {
      sendError(res, 400, 'Invalid scheduledAt date format. Please provide a valid ISO date string.', 'INVALID_DATE');
      return;
    }

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate.getTime() <= Date.now()) {
      sendError(res, 400, 'scheduledAt date must be in the future.', 'DATE_MUST_BE_FUTURE');
      return;
    }

    // 5. Schedule email
    const result = await scheduleEmail({
      recipient: recipient.trim(),
      subject: subject.trim(),
      body: body.trim(),
      scheduledAt: scheduledDate.toISOString(),
      userId: authReq.user?.userId,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/emails
 * Fetch paginated email records from MySQL database.
 * Query params:
 *   - page: number (default 1)
 *   - limit: number (default 10)
 *   - status: PENDING | QUEUED | PROCESSING | SENT | FAILED
 */
export async function handleGetEmails(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const page = Math.max(1, req.query.page ? parseInt(String(req.query.page), 10) || 1 : 1);
    const rawLimit = req.query.limit ? parseInt(String(req.query.limit), 10) || 10 : 10;
    const limit = Math.min(100, Math.max(1, rawLimit));
    const status = req.query.status ? String(req.query.status) : undefined;

    const { getPaginatedEmails } = await import('../models/email.model');
    const { emails, total } = await getPaginatedEmails({
      page,
      limit,
      status,
      userId: authReq.user?.userId,
    });

    res.status(200).json({
      success: true,
      data: emails,
      pagination: {
        page,
        limit,
        total,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/emails/:id
 * Fetch single email record by ID.
 */
export async function handleGetEmailById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      sendError(res, 400, 'Invalid email ID format.', 'INVALID_ID');
      return;
    }

    const { findScheduledEmailById, formatEmailRecord } = await import('../models/email.model');
    const record = await findScheduledEmailById(id);

    if (!record) {
      sendError(res, 404, 'Email record not found.', 'NOT_FOUND');
      return;
    }

    res.status(200).json({
      success: true,
      data: formatEmailRecord(record),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/emails/schedule/bulk
 * Bulk schedule emails from parsed CSV rows.
 * Re-validates every row on the backend.
 */
export async function handleBulkScheduleEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { emails } = req.body || {};

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      sendError(res, 400, 'Invalid request body. Expected a non-empty array in "emails" field.', 'INVALID_BULK_INPUT');
      return;
    }

    if (emails.length > 500) {
      sendError(res, 400, 'Bulk schedule limit exceeded. Maximum 500 emails per request.', 'BULK_LIMIT_EXCEEDED');
      return;
    }

    const { scheduleBulkEmails } = await import('../services/email.service');
    const bulkResult = await scheduleBulkEmails(emails);

    res.status(200).json(bulkResult);
  } catch (error) {
    next(error);
  }
}



