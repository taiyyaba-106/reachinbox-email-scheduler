import mysql from 'mysql2/promise';
import { config } from './env';

export const dbPool = mysql.createPool(
  config.mysql.url
    ? {
        uri: config.mysql.url,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ssl: config.mysql.ssl ? { rejectUnauthorized: false } : undefined,
      }
    : {
        host: config.mysql.host,
        port: config.mysql.port,
        user: config.mysql.user,
        password: config.mysql.password,
        database: config.mysql.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ssl: config.mysql.ssl ? { rejectUnauthorized: false } : undefined,
      }
);

export async function initDatabase(): Promise<void> {
  const query = `
    CREATE TABLE IF NOT EXISTS scheduled_emails (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      recipient VARCHAR(255) NOT NULL,
      subject VARCHAR(500) NOT NULL,
      body TEXT NOT NULL,
      scheduled_at DATETIME NOT NULL,
      sent_at DATETIME NULL,
      attempts INT NOT NULL DEFAULT 0,
      status ENUM('PENDING', 'QUEUED', 'PROCESSING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
      job_id VARCHAR(255) NULL,
      message_id VARCHAR(500) NULL,
      error_message TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `;
  await dbPool.query(query);

  const alterQueries = [
    `ALTER TABLE scheduled_emails ADD COLUMN IF NOT EXISTS sent_at DATETIME NULL;`,
    `ALTER TABLE scheduled_emails ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0;`,
    `ALTER TABLE scheduled_emails ADD COLUMN IF NOT EXISTS message_id VARCHAR(500) NULL;`,
    `ALTER TABLE scheduled_emails ADD COLUMN IF NOT EXISTS user_id INT NULL;`,
  ];
  for (const q of alterQueries) {
    try {
      await dbPool.query(q);
    } catch {
      // Ignore if column exists
    }
  }
}

export async function checkMySQLConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    const connection = await dbPool.getConnection();
    await connection.ping();
    connection.release();
    await initDatabase();
    return { connected: true };
  } catch (err: any) {
    return {
      connected: false,
      error: err?.message || 'Failed to connect to MySQL',
    };
  }
}
