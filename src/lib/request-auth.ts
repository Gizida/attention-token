import 'server-only';

import { NextRequest } from 'next/server';

import db from './db';
import { verifySession } from './auth';

export async function getAuthenticatedUserId(request: NextRequest): Promise<number | null> {
  const token = request.cookies.get('auth-token')?.value;
  return token ? verifySession(token) : null;
}

export async function requireAdminUserId(request: NextRequest): Promise<number | null> {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return null;
  const result = await db.query('SELECT wallet_address FROM users WHERE id=$1', [userId]);
  const configured = (process.env.ADMIN_WALLET_ADDRESSES || process.env.ADMIN_WALLET_ADDRESS || '')
    .split(',').map((item) => item.trim()).filter(Boolean);
  return configured.includes(result.rows[0]?.wallet_address) ? userId : null;
}

export function isAdminWallet(walletAddress: string): boolean {
  return (process.env.ADMIN_WALLET_ADDRESSES || process.env.ADMIN_WALLET_ADDRESS || '')
    .split(',').map((item) => item.trim()).filter(Boolean).includes(walletAddress);
}
