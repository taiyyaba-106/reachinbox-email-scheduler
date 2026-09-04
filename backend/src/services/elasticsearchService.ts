import { Client } from '@elastic/elasticsearch';
import { config } from '../config/env';

export interface EmailDocument {
  id: number;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt?: string | Date | null;
  sentAt?: string | Date | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  error?: string | null;
  attempts?: number;
}

export interface SearchEmailParams {
  query?: string;
  status?: string;
  recipient?: string;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  success: boolean;
  data: EmailDocument[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export const esClient = new Client({
  node: config.elasticsearch.url,
});

/**
 * Initializes Elasticsearch index 'emails' with appropriate mappings if it does not exist.
 * Handled gracefully so backend does not crash if Elasticsearch is temporarily offline.
 */
export async function initElasticsearch(): Promise<boolean> {
  const indexName = config.elasticsearch.index;
  try {
    const exists = await esClient.indices.exists({ index: indexName });

    if (!exists) {
      console.log(`[Elasticsearch] Index '${indexName}' does not exist. Creating with custom mappings...`);
      await esClient.indices.create({
        index: indexName,
        mappings: {
          properties: {
            id: { type: 'integer' },
            recipient: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            subject: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            body: { type: 'text' },
            status: { type: 'keyword' },
            scheduledAt: { type: 'date' },
            sentAt: { type: 'date' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
            error: { type: 'text' },
            attempts: { type: 'integer' },
          },
        },
      });
      console.log(`[Elasticsearch] Index '${indexName}' created successfully.`);
    } else {
      console.log(`[Elasticsearch] Connected to Elasticsearch. Index '${indexName}' is ready.`);
    }
    return true;
  } catch (error: any) {
    console.warn(`[Elasticsearch Warning] Failed to connect/initialize index '${indexName}': ${error?.message}. Backend will run without Elasticsearch.`);
    return false;
  }
}

/**
 * Indexes or upserts an email document into Elasticsearch.
 */
export async function indexEmailDocument(doc: EmailDocument): Promise<void> {
  const indexName = config.elasticsearch.index;
  try {
    await esClient.index({
      index: indexName,
      id: String(doc.id),
      document: {
        id: doc.id,
        recipient: doc.recipient,
        subject: doc.subject,
        body: doc.body,
        status: doc.status,
        scheduledAt: doc.scheduledAt ? new Date(doc.scheduledAt).toISOString() : null,
        sentAt: doc.sentAt ? new Date(doc.sentAt).toISOString() : null,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
        error: doc.error || null,
        attempts: doc.attempts || 0,
      },
      refresh: 'wait_for',
    });
    console.log(`[Elasticsearch] Email ID ${doc.id} indexed successfully.`);
  } catch (error: any) {
    console.warn(`[Elasticsearch Warning] Failed to index Email ID ${doc.id}: ${error?.message}`);
  }
}

/**
 * Updates an existing email document in Elasticsearch when status/attempts change.
 */
export async function updateEmailDocumentStatus(emailId: number, updates: Partial<EmailDocument>): Promise<void> {
  const indexName = config.elasticsearch.index;
  try {
    const docUpdates: Record<string, any> = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (updates.sentAt) {
      docUpdates.sentAt = new Date(updates.sentAt).toISOString();
    }
    if (updates.scheduledAt) {
      docUpdates.scheduledAt = new Date(updates.scheduledAt).toISOString();
    }

    await esClient.update({
      index: indexName,
      id: String(emailId),
      doc: docUpdates,
      doc_as_upsert: true,
      refresh: 'wait_for',
    });
    console.log(`[Elasticsearch] Updated document for Email ID ${emailId} with status '${updates.status || 'UNCHANGED'}'.`);
  } catch (error: any) {
    console.warn(`[Elasticsearch Warning] Failed to update document for Email ID ${emailId}: ${error?.message}`);
  }
}

/**
 * Fallback search querying MySQL database directly when Elasticsearch is unavailable or returns 0 results.
 */
async function searchMysqlFallback(params: SearchEmailParams): Promise<SearchResult> {
  try {
    const { dbPool, initDatabase } = await import('../config/db');
    const { formatEmailRecord } = await import('../models/email.model');
    await initDatabase();

    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 10));
    const offset = (page - 1) * limit;

    const whereConditions: string[] = [];
    const queryParams: any[] = [];

    if (params.query && params.query.trim().length > 0) {
      const qStr = `%${params.query.trim()}%`;
      whereConditions.push('(subject LIKE ? OR body LIKE ? OR recipient LIKE ?)');
      queryParams.push(qStr, qStr, qStr);
    }

    if (params.status && params.status.trim().toUpperCase() !== 'ALL') {
      whereConditions.push('status = ?');
      queryParams.push(params.status.trim().toUpperCase());
    }

    if (params.recipient && params.recipient.trim().length > 0) {
      whereConditions.push('recipient LIKE ?');
      queryParams.push(`%${params.recipient.trim()}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as total FROM scheduled_emails ${whereClause}`;
    const [countRows] = await dbPool.execute<any[]>(countSql, queryParams);
    const total = countRows[0]?.total || 0;

    const dataSql = `
      SELECT * FROM scheduled_emails 
      ${whereClause} 
      ORDER BY id DESC 
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `;
    const [rows] = await dbPool.execute<any[]>(dataSql, queryParams);

    const data = (rows || []).map((r) => formatEmailRecord(r) as any);

    return {
      success: true,
      data,
      pagination: { page, limit, total },
    };
  } catch (err: any) {
    console.error('[MySQL Fallback Search Error]:', err?.message);
    return {
      success: true,
      data: [],
      pagination: { page: params.page || 1, limit: params.limit || 10, total: 0 },
    };
  }
}

/**
 * Performs full-text search over subject, body, recipient with optional status filter & pagination.
 * Automatically falls back to MySQL if Elasticsearch returns zero results or throws an error.
 */
export async function searchEmailsService(params: SearchEmailParams): Promise<SearchResult> {
  const indexName = config.elasticsearch.index;
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 10));
  const from = (page - 1) * limit;

  try {
    const mustQueries: any[] = [];
    if (params.query && params.query.trim().length > 0) {
      mustQueries.push({
        multi_match: {
          query: params.query.trim(),
          fields: ['subject^2', 'body', 'recipient'],
          fuzziness: 'AUTO',
        },
      });
    } else {
      mustQueries.push({ match_all: {} });
    }

    const filterQueries: any[] = [];
    if (params.status && params.status.trim().length > 0 && params.status.trim().toUpperCase() !== 'ALL') {
      filterQueries.push({
        match: { status: params.status.trim().toUpperCase() },
      });
    }

    if (params.recipient && params.recipient.trim().length > 0) {
      filterQueries.push({
        wildcard: { recipient: `*${params.recipient.trim().toLowerCase()}*` },
      });
    }

    const response = await esClient.search({
      index: indexName,
      from,
      size: limit,
      query: {
        bool: {
          must: mustQueries,
          filter: filterQueries,
        },
      },
      sort: [{ id: { order: 'desc' } }],
    });

    const hits = response.hits.hits || [];
    const total = typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0;

    if (hits.length === 0 && total === 0) {
      // Fallback to MySQL if Elasticsearch has no documents for this query
      return await searchMysqlFallback(params);
    }

    const data: EmailDocument[] = hits.map((hit: any) => hit._source as EmailDocument);

    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
      },
    };
  } catch (error: any) {
    console.warn(`[Elasticsearch Warning] Search query failed or ES offline: ${error?.message}. Using MySQL fallback.`);
    return await searchMysqlFallback(params);
  }
}
