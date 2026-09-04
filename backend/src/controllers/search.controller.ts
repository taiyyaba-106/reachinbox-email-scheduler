import { Request, Response, NextFunction } from 'express';
import { searchEmailsService } from '../services/elasticsearchService';

/**
 * GET /api/emails/search
 * Query parameters:
 *   - q: search query (subject, body, recipient)
 *   - status: PENDING | QUEUED | PROCESSING | SENT | FAILED
 *   - page: page number (default 1)
 *   - limit: results per page (default 10)
 */
export async function searchEmailsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const q = req.query.q ? String(req.query.q) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const recipient = req.query.recipient ? String(req.query.recipient) : undefined;
    const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;

    const result = await searchEmailsService({
      query: q,
      status,
      recipient,
      page,
      limit,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

