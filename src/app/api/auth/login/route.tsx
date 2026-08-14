import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { getOrCreateUser, createSession } from '@/lib/auth';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

export async function POST(req: NextRequest) {
  try {
    const { publicKey, signature, message } = await req.json();
    
    // Verify wallet signature 
    const messageBytes = new TextEncoder().encode(message);
    const publicKeyObj = new PublicKey(publicKey);
    const signatureBytes = bs58.decode(signature);
    
    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyObj.toBytes()
    );
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
    
    // Get or create user in database
    const user = await getOrCreateUser(publicKey);
    
    // Create session token
    const sessionToken = await createSession(user.id);
    
    // Set HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, walletAddress: user.wallet_address }
    });
    
    response.cookies.set('auth-token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });
    
    return response;
    
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}