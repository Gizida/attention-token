import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

import { consumeAuthChallenge, createSession, getOrCreateUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const walletAddress = new PublicKey(String(body.publicKey)).toBase58();
    const nonce = String(body.nonce ?? '');
    const signature = bs58.decode(String(body.signature ?? ''));
    if (!nonce || signature.length !== 64) {
      return NextResponse.json({ error: 'Invalid authentication request' }, { status: 400 });
    }
    const message = await consumeAuthChallenge({ nonce, walletAddress });
    if (!message) return NextResponse.json({ error: 'Challenge expired or already used' }, { status: 401 });
    const valid = nacl.sign.detached.verify(
      new TextEncoder().encode(message),
      signature,
      new PublicKey(walletAddress).toBytes(),
    );
    if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

    const refCode = typeof body.refCode === 'string' ? body.refCode.trim() : null;
    const user = await getOrCreateUser(walletAddress, refCode);
    const token = await createSession(Number(user.id));
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, walletAddress: user.wallet_address },
    });
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    console.error('Authentication failed', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 400 });
  }
}
