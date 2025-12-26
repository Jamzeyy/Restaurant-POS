import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query } from './db.js';

const SESSION_TTL_HOURS = 12;

const getSessionExpiry = () => {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + SESSION_TTL_HOURS);
  return expiresAt;
};

export const authenticate = async (email, password) => {
  const result = await query(
    'SELECT id, email, full_name, password_hash, is_active FROM users WHERE email = $1',
    [email]
  );

  if (!result.rows.length) {
    return null;
  }

  const user = result.rows[0];
  if (!user.is_active) {
    return null;
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return null;
  }

  return { id: user.id, email: user.email, fullName: user.full_name };
};

export const createSession = async (userId) => {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = getSessionExpiry();

  await query(
    'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );

  return { token, expiresAt };
};

export const destroySession = async (token) => {
  await query('DELETE FROM sessions WHERE token = $1', [token]);
};

export const getSessionUser = async (token) => {
  const result = await query(
    `SELECT users.id, users.email, users.full_name, sessions.expires_at
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token = $1`,
    [token]
  );

  if (!result.rows.length) {
    return null;
  }

  const session = result.rows[0];
  if (new Date(session.expires_at) < new Date()) {
    await destroySession(token);
    return null;
  }

  return {
    id: session.id,
    email: session.email,
    fullName: session.full_name,
    expiresAt: session.expires_at
  };
};
