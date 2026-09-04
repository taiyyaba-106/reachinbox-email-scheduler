import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { dbPool, initDatabase } from '../config/db';

export interface UserRecord {
  id: number;
  google_id: string | null;
  email: string;
  name: string | null;
  picture: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface GoogleUserProfile {
  googleId: string;
  email: string;
  name?: string;
  picture?: string;
}

let usersTableInitialized = false;

/**
 * Initializes the `users` table in MySQL if it does not exist.
 */
export async function initUserModel(): Promise<void> {
  if (usersTableInitialized) return;
  await initDatabase();

  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      google_id VARCHAR(255) UNIQUE NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NULL,
      picture TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_google_id (google_id),
      INDEX idx_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  await dbPool.execute(query);

  // Safely ensure columns exist if table was created previously without them
  try {
    await dbPool.execute(`ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE NULL`);
  } catch {}
  try {
    await dbPool.execute(`ALTER TABLE users ADD COLUMN name VARCHAR(255) NULL`);
  } catch {}
  try {
    await dbPool.execute(`ALTER TABLE users ADD COLUMN picture TEXT NULL`);
  } catch {}

  usersTableInitialized = true;
  console.log('[MySQL] `users` table verified/created with all required columns.');
}


/**
 * Finds a user by primary key ID.
 */
export async function findUserById(id: number): Promise<UserRecord | null> {
  await initUserModel();
  const query = `SELECT * FROM users WHERE id = ?`;
  const [rows] = await dbPool.execute<RowDataPacket[]>(query, [id]);
  if (rows.length === 0) return null;
  return rows[0] as UserRecord;
}

/**
 * Finds a user by email address.
 */
export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  await initUserModel();
  const query = `SELECT * FROM users WHERE email = ?`;
  const [rows] = await dbPool.execute<RowDataPacket[]>(query, [email]);
  if (rows.length === 0) return null;
  return rows[0] as UserRecord;
}

/**
 * Finds a user by Google ID.
 */
export async function findUserByGoogleId(googleId: string): Promise<UserRecord | null> {
  await initUserModel();
  const query = `SELECT * FROM users WHERE google_id = ?`;
  const [rows] = await dbPool.execute<RowDataPacket[]>(query, [googleId]);
  if (rows.length === 0) return null;
  return rows[0] as UserRecord;
}

/**
 * Finds an existing user by googleId or email, or creates a new user if neither exists.
 * Links googleId if user exists with matching email address.
 */
export async function findOrCreateGoogleUser(profile: GoogleUserProfile): Promise<UserRecord> {
  await initUserModel();

  // 1. Try to find user by google_id
  let existingUser = await findUserByGoogleId(profile.googleId);
  if (existingUser) {
    // Update name/picture if changed
    const updateQuery = `
      UPDATE users
      SET name = COALESCE(?, name),
          picture = COALESCE(?, picture)
      WHERE id = ?
    `;
    await dbPool.execute(updateQuery, [profile.name || null, profile.picture || null, existingUser.id]);
    return (await findUserById(existingUser.id))!;
  }

  // 2. Try to find user by email (account linking)
  existingUser = await findUserByEmail(profile.email);
  if (existingUser) {
    const updateQuery = `
      UPDATE users
      SET google_id = ?,
          name = COALESCE(?, name),
          picture = COALESCE(?, picture)
      WHERE id = ?
    `;
    await dbPool.execute(updateQuery, [profile.googleId, profile.name || null, profile.picture || null, existingUser.id]);
    return (await findUserById(existingUser.id))!;
  }

  // 3. Create new user
  const insertQuery = `
    INSERT INTO users (google_id, email, name, picture)
    VALUES (?, ?, ?, ?)
  `;
  const [result] = await dbPool.execute<ResultSetHeader>(insertQuery, [
    profile.googleId,
    profile.email,
    profile.name || null,
    profile.picture || null,
  ]);

  const newUser = await findUserById(result.insertId);
  return newUser!;
}
