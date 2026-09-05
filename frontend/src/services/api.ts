import type {
  User,
  Email,
  ScheduleEmailPayload,
  ScheduleEmailResponse,
  BulkScheduleResponse,
  SearchResult,
  SearchEmailParams,
  DashboardStatsResponse,
  SlackStatus,
  SchedulerConfig,
  ApiResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://reachinbox-email-scheduler-1-17a7.onrender.com';

export function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('token', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('token');
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    throw new ApiError('Network error. Unable to connect to server.', 0, 'NETWORK_ERROR');
  }

  if (response.status === 401 || response.status === 403) {
    removeAuthToken();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login?expired=true';
    }
  }

  let data: any = {};
  try {
    data = await response.json();
  } catch {
    // Non-JSON response fallback
  }

  if (!response.ok) {
    let errorMessage = 'An unexpected API error occurred';
    let errorCode = `HTTP_${response.status}`;

    if (data?.error?.message) {
      errorMessage = data.error.message;
      errorCode = data.error.code || errorCode;
    } else if (typeof data?.error === 'string') {
      errorMessage = data.error;
    } else if (data?.message) {
      errorMessage = data.message;
    } else {
      switch (response.status) {
        case 400:
          errorMessage = 'Invalid request parameter.';
          break;
        case 401:
          errorMessage = 'Authentication expired or invalid credentials.';
          break;
        case 403:
          errorMessage = 'You do not have permission to perform this action.';
          break;
        case 404:
          errorMessage = 'Requested API endpoint or record was not found.';
          break;
        case 409:
          errorMessage = 'Conflict detected with existing record.';
          break;
        case 429:
          errorMessage = 'Rate limit exceeded. Please slow down and try again.';
          break;
        case 500:
          errorMessage = 'Internal server error. Please try again later.';
          break;
        default:
          errorMessage = `HTTP error ${response.status}`;
      }
    }

    throw new ApiError(errorMessage, response.status, errorCode);
  }

  return data as T;
}


// Authentication API
export const authApi = {
  getGoogleLoginUrl: (): string => `${API_BASE_URL}/api/auth/google`,
  demoLogin: (): Promise<{ success: boolean; token: string; user: User }> =>
    request('/api/auth/demo', { method: 'POST' }),
  getMe: (): Promise<{ success: boolean; user: User }> => request('/api/auth/me'),
};

// Scheduled Emails API
export const emailApi = {
  scheduleEmail: (payload: ScheduleEmailPayload): Promise<ScheduleEmailResponse> =>
    request('/api/emails/schedule', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  bulkScheduleEmails: (emails: ScheduleEmailPayload[]): Promise<BulkScheduleResponse> =>
    request('/api/emails/schedule/bulk', {
      method: 'POST',
      body: JSON.stringify({ emails }),
    }),
  getEmails: (params: { page?: number; limit?: number; status?: string } = {}): Promise<SearchResult> => {
    const queryParams = new URLSearchParams();
    if (params.status && params.status !== 'ALL') queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));

    const queryString = queryParams.toString();
    return request(`/api/emails${queryString ? `?${queryString}` : ''}`);
  },
  searchEmails: (params: SearchEmailParams = {}): Promise<SearchResult> => {
    const queryParams = new URLSearchParams();
    if (params.query) queryParams.append('q', params.query);
    if (params.status && params.status !== 'ALL') queryParams.append('status', params.status);
    if (params.recipient) queryParams.append('recipient', params.recipient);
    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));

    const queryString = queryParams.toString();
    return request(`/api/emails/search${queryString ? `?${queryString}` : ''}`);
  },
  getEmailById: (id: number): Promise<ApiResponse<Email>> => request(`/api/emails/${id}`),
};


// Dashboard API
export const dashboardApi = {
  getStats: (): Promise<DashboardStatsResponse> => request('/api/dashboard/stats'),
};

// Scheduler Runtime Config API
export const configApi = {
  getConfig: (): Promise<{ success: boolean; data: SchedulerConfig }> => request('/api/config'),
  updateConfig: (updates: Partial<SchedulerConfig>): Promise<{ success: boolean; data: SchedulerConfig }> =>
    request('/api/config', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
};

// Slack Integration API
export const slackApi = {
  getSlackAuthUrl: (): string => {
    const token = getAuthToken();
    return `${API_BASE_URL}/api/auth/slack${token ? `?token=${token}` : ''}`;
  },
  getStatus: (): Promise<SlackStatus> => request('/api/integrations/slack/status'),
  connectWebhook: (webhookUrl: string, channel?: string): Promise<{ success: boolean; message: string }> =>
    request('/api/integrations/slack/webhook', {
      method: 'POST',
      body: JSON.stringify({ webhookUrl, channel }),
    }),
  disconnect: (): Promise<{ success: boolean; message: string }> =>
    request('/api/integrations/slack', { method: 'DELETE' }),
};
