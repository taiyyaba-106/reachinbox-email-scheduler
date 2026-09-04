export type EmailStatus = 'PENDING' | 'QUEUED' | 'PROCESSING' | 'SENT' | 'FAILED';

export interface User {
  id: number;
  email: string;
  name?: string | null;
  picture?: string | null;
  createdAt?: string;
}

export interface Email {
  id: number;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string | Date;
  sentAt?: string | Date | null;
  attempts?: number;
  status: EmailStatus;
  jobId?: string | null;
  messageId?: string | null;
  errorMessage?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ScheduleEmailPayload {
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
}

export interface ScheduleEmailResponse {
  success: boolean;
  message: string;
  emailId: number;
  jobId: string;
}

export interface BulkScheduleItemResult {
  row: number;
  recipient: string;
  subject: string;
  success: boolean;
  emailId?: number;
  jobId?: string;
  error?: string;
}

export interface BulkScheduleResponse {
  success: boolean;
  message: string;
  total: number;
  successful: number;
  failed: number;
  results: BulkScheduleItemResult[];
  errors: { row: number; recipient: string; error: string }[];
}


export interface Pagination {
  page: number;
  limit: number;
  total: number;
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
  data: Email[];
  pagination: Pagination;
}

export interface DashboardStatsData {
  totalEmails: number;
  pendingEmails: number;
  queuedEmails: number;
  processingEmails: number;
  sentEmails: number;
  failedEmails: number;
  scheduledToday: number;
  sentToday: number;
  failedToday: number;
  deliveryRate: number;
  recentEmails: Email[];
  bullmq: {
    waiting: number;
    delayed: number;
    active: number;
    completed: number;
    failed: number;
  };
}

export interface DashboardStatsResponse {
  success: boolean;
  data: DashboardStatsData;
}

export interface SlackStatus {
  success: boolean;
  connected: boolean;
  teamName: string | null;
  slackUserId: string | null;
  channel: string | null;
}

export interface SchedulerConfig {
  hourlyEmailLimit: number;
  workerConcurrency: number;
  artificialDelayMs: number;
  enabled: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}
