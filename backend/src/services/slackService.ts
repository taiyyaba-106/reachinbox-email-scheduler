import { WebClient } from '@slack/web-api';
import { config } from '../config/env';
import {
  upsertSlackIntegration,
  getSlackIntegrationByUserId,
  getAllSlackIntegrations,
  SlackIntegrationRecord,
} from '../models/slackIntegration.model';

/**
 * Generates the Slack OAuth v2 authorization redirect URL.
 */
export function getSlackAuthUrl(stateToken?: string): string {
  const scopes = ['chat:write', 'incoming-webhook', 'users:read'];
  const params = new URLSearchParams({
    client_id: config.slack.clientId,
    scope: scopes.join(','),
    redirect_uri: config.slack.redirectUri,
    ...(stateToken ? { state: stateToken } : {}),
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export interface SlackCallbackResult {
  success: boolean;
  teamId: string;
  teamName: string | null;
  slackUserId: string | null;
  incomingWebhookChannel: string | null;
}

/**
 * Exchanges authorization code for Slack OAuth v2 access tokens and saves workspace connection.
 */
export async function handleSlackCallback(code: string, userId?: number): Promise<SlackCallbackResult> {
  if (!code || typeof code !== 'string') {
    throw new Error('Invalid authorization code provided');
  }

  // Use WebClient from @slack/web-api for official OAuth v2 token exchange
  const client = new WebClient();
  const oauthResponse = await client.oauth.v2.access({
    client_id: config.slack.clientId,
    client_secret: config.slack.clientSecret,
    code,
    redirect_uri: config.slack.redirectUri,
  });

  if (!oauthResponse.ok) {
    throw new Error(`Slack OAuth exchange failed: ${oauthResponse.error || 'Unknown error'}`);
  }

  const teamId = oauthResponse.team?.id || '';
  const teamName = oauthResponse.team?.name || null;
  const slackUserId = oauthResponse.authed_user?.id || null;
  const accessToken = oauthResponse.access_token || '';
  const botUserId = oauthResponse.bot_user_id || null;

  const incomingWebhook = (oauthResponse as any).incoming_webhook;
  const webhookUrl = incomingWebhook?.url || null;
  const webhookChannel = incomingWebhook?.channel || null;

  if (!teamId || !accessToken) {
    throw new Error('Missing team information or access token from Slack OAuth response');
  }

  console.log(`[Slack Service] Connected Slack Workspace '${teamName || teamId}' (User ID: ${slackUserId})`);

  // If a logged-in application user ID is provided, persist integration in MySQL
  if (userId) {
    await upsertSlackIntegration({
      userId,
      slackUserId,
      slackTeamId: teamId,
      teamName,
      accessToken,
      botUserId,
      incomingWebhookUrl: webhookUrl,
      incomingWebhookChannel: webhookChannel,
    });
  }

  return {
    success: true,
    teamId,
    teamName,
    slackUserId,
    incomingWebhookChannel: webhookChannel,
  };
}

/**
 * Checks connection status and workspace details for a specific application user ID.
 */
export async function getSlackStatusForUser(userId: number): Promise<{
  connected: boolean;
  teamName: string | null;
  slackUserId: string | null;
  channel: string | null;
}> {
  const integration = await getSlackIntegrationByUserId(userId);
  if (!integration) {
    return {
      connected: false,
      teamName: null,
      slackUserId: null,
      channel: null,
    };
  }

  return {
    connected: true,
    teamName: integration.team_name,
    slackUserId: integration.slack_user_id,
    channel: integration.incoming_webhook_channel,
  };
}

export interface EmailNotificationPayload {
  emailId: number;
  recipient: string;
  subject: string;
  scheduledAt?: string | Date | null;
  sentAt?: string | Date | null;
  error?: string | null;
  attempts?: number;
}

/**
 * Sends real Slack notification when an email is successfully sent.
 * Safe error handling ensures Slack failures never crash worker or invalidate DB status.
 */
export async function sendEmailSentNotification(payload: EmailNotificationPayload): Promise<void> {
  try {
    const integrations = await getAllSlackIntegrations();
    if (integrations.length === 0) {
      console.log(`[Slack Notification] No connected Slack workspace found. Notification logged for SENT Email ID ${payload.emailId}.`);
      return;
    }

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '✅ Email Sent Successfully',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Email ID:*\n#${payload.emailId}` },
          { type: 'mrkdwn', text: '*Status:*\n`SENT`' },
          { type: 'mrkdwn', text: `*Recipient:*\n${payload.recipient}` },
          { type: 'mrkdwn', text: `*Subject:*\n${payload.subject}` },
          { type: 'mrkdwn', text: `*Scheduled At:*\n${payload.scheduledAt ? new Date(payload.scheduledAt).toISOString() : 'N/A'}` },
          { type: 'mrkdwn', text: `*Sent At:*\n${payload.sentAt ? new Date(payload.sentAt).toISOString() : new Date().toISOString()}` },
        ],
      },
    ];

    for (const integration of integrations) {
      try {
        if (integration.incoming_webhook_url) {
          const res = await fetch(integration.incoming_webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocks }),
          });
          console.log(`[Slack Notification] Sent webhook success notification for Email ID ${payload.emailId} to team '${integration.team_name}' (HTTP ${res.status}).`);
        } else if (integration.access_token) {
          const client = new WebClient(integration.access_token);
          const channel = integration.incoming_webhook_channel || 'general';
          await client.chat.postMessage({
            channel,
            text: `✅ Email Sent Successfully to ${payload.recipient}`,
            blocks,
          });
          console.log(`[Slack Notification] Sent API success notification for Email ID ${payload.emailId} to workspace '${integration.team_name}'.`);
        }
      } catch (err: any) {
        console.warn(`[Slack Notification Warning] Failed to post success notification for Email ID ${payload.emailId} to team '${integration.team_name}': ${err?.message}`);
      }
    }
  } catch (error: any) {
    console.warn(`[Slack Notification Warning] Error dispatching success notification for Email ID ${payload.emailId}: ${error?.message}`);
  }
}

/**
 * Sends real Slack notification when an email fails permanently after all retries.
 * Safe error handling ensures Slack failures never crash worker or alter MySQL state.
 */
export async function sendEmailFailedNotification(payload: EmailNotificationPayload): Promise<void> {
  try {
    const integrations = await getAllSlackIntegrations();
    if (integrations.length === 0) {
      console.warn(`[Slack Notification] No connected Slack workspace found. Logged PERMANENT FAILURE notification for Email ID ${payload.emailId}.`);
      return;
    }

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 Email Delivery Failed',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Email ID:*\n#${payload.emailId}` },
          { type: 'mrkdwn', text: '*Status:*\n`FAILED`' },
          { type: 'mrkdwn', text: `*Recipient:*\n${payload.recipient}` },
          { type: 'mrkdwn', text: `*Attempts:*\n${payload.attempts || 3}` },
          { type: 'mrkdwn', text: `*Subject:*\n${payload.subject}` },
          { type: 'mrkdwn', text: `*Error:*\n\`${payload.error || 'SMTP Delivery Failure'}\`` },
        ],
      },
    ];

    for (const integration of integrations) {
      try {
        if (integration.incoming_webhook_url) {
          const res = await fetch(integration.incoming_webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocks }),
          });
          console.log(`[Slack Notification] Sent webhook failure notification for Email ID ${payload.emailId} to team '${integration.team_name}' (HTTP ${res.status}).`);
        } else if (integration.access_token) {
          const client = new WebClient(integration.access_token);
          const channel = integration.incoming_webhook_channel || 'general';
          await client.chat.postMessage({
            channel,
            text: `🚨 Email Delivery Failed for ${payload.recipient}`,
            blocks,
          });
          console.log(`[Slack Notification] Sent API failure notification for Email ID ${payload.emailId} to workspace '${integration.team_name}'.`);
        }
      } catch (err: any) {
        console.warn(`[Slack Notification Warning] Failed to post failure notification for Email ID ${payload.emailId} to team '${integration.team_name}': ${err?.message}`);
      }
    }
  } catch (error: any) {
    console.warn(`[Slack Notification Warning] Error dispatching failure notification for Email ID ${payload.emailId}: ${error?.message}`);
  }
}

