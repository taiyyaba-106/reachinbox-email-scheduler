import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { findOrCreateGoogleUser, UserRecord } from '../models/user.model';

/**
 * Creates and configures Google OAuth2 Client.
 */
export function getGoogleOAuthClient(): OAuth2Client {
  return new OAuth2Client(
    config.google.clientId,
    config.google.clientSecret,
    config.google.callbackUrl
  );
}

/**
 * Generates the Google OAuth authorization redirect URL.
 */
export function getGoogleAuthUrl(): string {
  const client = getGoogleOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    prompt: 'select_account',
  });
}

export interface GoogleAuthResult {
  user: UserRecord;
  token: string;
}

/**
 * Handles authorization code exchange, profile extraction, user creation, and JWT generation.
 */
export async function handleGoogleCallback(code: string): Promise<GoogleAuthResult> {
  if (!code || typeof code !== 'string') {
    throw new Error('Invalid authorization code provided');
  }

  const client = getGoogleOAuthClient();

  // 1. Exchange authorization code for OAuth tokens
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  // 2. Fetch user profile from Google UserInfo API
  const userInfoRes = await client.request<{
    id: string;
    email: string;
    name?: string;
    picture?: string;
    verified_email?: boolean;
  }>({
    url: 'https://www.googleapis.com/oauth2/v2/userinfo',
  });

  const profile = userInfoRes.data;
  if (!profile || !profile.email) {
    throw new Error('Failed to retrieve user email from Google OAuth profile');
  }

  console.log(`[Google Auth] Authenticated Google User: ${profile.email} (ID: ${profile.id})`);

  // 3. Find or create user in MySQL database
  const user = await findOrCreateGoogleUser({
    googleId: profile.id,
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
  });

  // 4. Generate application JWT token
  const token = generateAppJwt(user.id, user.email);

  return {
    user,
    token,
  };
}

/**
 * Generates signed application JWT token.
 */
export function generateAppJwt(userId: number, email: string): string {
  return jwt.sign(
    { userId, email },
    config.jwt.secret,
    { expiresIn: '7d' }
  );
}

/**
 * Verifies signed application JWT token.
 */
export function verifyAppJwt(token: string): { userId: number; email: string } {
  const payload = jwt.verify(token, config.jwt.secret) as { userId: number; email: string };
  return payload;
}
