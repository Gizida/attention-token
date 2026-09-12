import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';

import { createAuthChallenge } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { publicKey } = await request.json();
    const walletAddress = new PublicKey(String(publicKey)).toBase58();
    const configuredOrigin = process.env.AUTH_ORIGIN?.trim();
    const origin = configuredOrigin || request.nextUrl.origin;
    const domain = process.env.AUTH_DOMAIN?.trim() || new URL(origin).host;
    const challenge = await createAuthChallenge({ walletAddress, origin, domain });
    return NextResponse.json({
      nonce: challenge.nonce,
      message: challenge.message,
      expiresAt: challenge.expiresAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
  }
}
