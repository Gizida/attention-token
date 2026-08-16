import db from './db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function getOrCreateUser(walletAddress: string) {
  // Check if user exists
  const userResult = await db.query(
    'SELECT * FROM users WHERE wallet_address = $1',
    [walletAddress]
  );
  
  if (userResult.rows.length > 0) {
    // Update last login
    await db.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [userResult.rows[0].id]
    );
    return userResult.rows[0];
  }
  
  const referralCode = crypto.createHash('md5').update(walletAddress).digest('hex').substring(0, 8);

  // Create new user
  const newUser = await db.query(
    'INSERT INTO users (wallet_address, referral_code) VALUES ($1, $2) RETURNING *',
    [walletAddress, referralCode]
  );
  
  return newUser.rows[0];
}

export async function createSession(userId: number) {
  // Generate JWT token
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
  
  // Store session in database
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  await db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
  await db.query(
    'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );
  
  return token;
}

export async function verifySession(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    
    // Check if session exists in database
    const sessionResult = await db.query(
      'SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()',
      [token]
    );
    
    if (sessionResult.rows.length === 0) {
      return null;
    }
    
    return decoded.userId;
  } catch (error) {
    return null;
  }
}