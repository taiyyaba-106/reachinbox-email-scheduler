import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { dbPool, initDatabase } from '../config/db';
import { initUserModel } from './user.model';

export interface SlackIntegrationRecord {
  id: number;
  user_id: number;
  slack_user_id: string | null;
  slack_team_id: string;
  team_name: string | null;
  access_token: string;
  bot_user_id: string | null;
  incoming_webhook_url: string | null;
  incoming_webhook_channel: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSlackIntegrationDTO {
  userId: number;
  slackUserId?: string | null;
  slackTeamId: string;
  teamName?: string | null;
  accessToken: string;
  botUserId?: string | null;
  incomingWebhookUrl?: string | null;
  incomingWebhookChannel?: string | null;
}

let tableInitialized = false;

/**
 * Initializes the `slack_integrations` table in MySQL if it does not exist.
 */
export async function initSlackIntegrationModel(): Promise<void> {
  if (tableInitialized) return;
  await initUserModel();
  await initDatabase();

  const query = `
    CREATE TABLE IF NOT EXISTS slack_integrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      slack_user_id VARCHAR(255) NULL,
      slack_team_id VARCHAR(255) NOT NULL,
      team_name VARCHAR(255) NULL,
      access_token TEXT NOT NULL,
      bot_user_id VARCHAR(255) NULL,
      incoming_webhook_url TEXT NULL,
      incoming_webhook_channel VARCHAR(255) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      UNIQUE KEY uq_user_team (user_id, slack_team_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

  `;

  await dbPool.execute(query);
  tableInitialized = true;
  console.log('[MySQL] `slack_integrations` table verified/created.');
}

/**
 * Saves or updates a Slack integration for a user.
 */
export async function upsertSlackIntegration(data: CreateSlackIntegrationDTO): Promise<number> {
  await initSlackIntegrationModel();

  const query = `
    INSERT INTO slack_integrations 
      (user_id, slack_user_id, slack_team_id, team_name, access_token, bot_user_id, incoming_webhook_url, incoming_webhook_channel)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      slack_user_id = VALUES(slack_user_id),
      team_name = VALUES(team_name),
      access_token = VALUES(access_token),
      bot_user_id = VALUES(bot_user_id),
      incoming_webhook_url = VALUES(incoming_webhook_url),
      incoming_webhook_channel = VALUES(incoming_webhook_channel),
      updated_at = NOW();
  `;

  const [result] = await dbPool.execute<ResultSetHeader>(query, [
    data.userId,
    data.slackUserId || null,
    data.slackTeamId,
    data.teamName || null,
    data.accessToken,
    data.botUserId || null,
    data.incomingWebhookUrl || null,
    data.incomingWebhookChannel || null,
  ]);

  return result.insertId || result.affectedRows;
}

/**
 * Gets the active Slack integration for a specific user ID.
 */
export async function getSlackIntegrationByUserId(userId: number): Promise<SlackIntegrationRecord | null> {
  await initSlackIntegrationModel();
  const query = `SELECT * FROM slack_integrations WHERE user_id = ? ORDER BY id DESC LIMIT 1`;
  const [rows] = await dbPool.execute<RowDataPacket[]>(query, [userId]);
  if (rows.length === 0) return null;
  return rows[0] as SlackIntegrationRecord;
}

/**
 * Removes Slack integration for a user.
 */
export async function deleteSlackIntegrationByUserId(userId: number): Promise<boolean> {
  await initSlackIntegrationModel();
  const query = `DELETE FROM slack_integrations WHERE user_id = ?`;
  const [result] = await dbPool.execute<ResultSetHeader>(query, [userId]);
  return result.affectedRows > 0;
}

/**
 * Retrieves all active Slack integrations across all users.
 */
export async function getAllSlackIntegrations(): Promise<SlackIntegrationRecord[]> {
  await initSlackIntegrationModel();
  const query = `SELECT * FROM slack_integrations ORDER BY id DESC`;
  const [rows] = await dbPool.execute<RowDataPacket[]>(query);
  return rows as SlackIntegrationRecord[];
}

