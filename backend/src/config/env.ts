import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    database: process.env.MYSQL_DATABASE || 'reachinbox',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    url: process.env.MYSQL_URL || '',
    ssl: process.env.MYSQL_SSL === 'true',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    url: process.env.REDIS_URL || '',
  },
  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  workerArtificialDelayMs: parseInt(process.env.WORKER_ARTIFICIAL_DELAY_MS || '0', 10),
  ethereal: {
    host: process.env.ETHEREAL_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.ETHEREAL_PORT || '587', 10),
    user: process.env.ETHEREAL_USER || '',
    password: process.env.ETHEREAL_PASSWORD || '',
  },
  emailJob: {
    attempts: parseInt(process.env.EMAIL_JOB_ATTEMPTS || '3', 10),
    backoffDelay: parseInt(process.env.EMAIL_JOB_BACKOFF_DELAY || '1000', 10),
  },
  rateLimit: {
    hourlyLimit: parseInt(process.env.EMAIL_HOURLY_LIMIT || '100', 10),
  },
  elasticsearch: {
    url: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    index: process.env.ELASTICSEARCH_INDEX || 'emails',
    apiKey: process.env.ELASTICSEARCH_API_KEY || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default_jwt_secret',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
  },
  slack: {
    clientId: process.env.SLACK_CLIENT_ID || '',
    clientSecret: process.env.SLACK_CLIENT_SECRET || '',
    redirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:5000/api/auth/slack/callback',
  },
};
