'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback } from 'react';
import bs58 from 'bs58';

export function useWalletAuth() {
  const { publicKey, signMessage, connected } = useWallet();

  const authenticate = useCallback(async (refCode?: string | null) => {
    if (!publicKey || !signMessage) throw new Error('Wallet not connected or does not support signing.');
    const challengeResponse = await fetch('/api/auth/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey: publicKey.toBase58() }),
    });
    const challenge = await challengeResponse.json();
    if (!challengeResponse.ok) throw new Error(challenge.error || 'Could not create sign-in challenge');

    const signature = await signMessage(new TextEncoder().encode(challenge.message));
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: publicKey.toBase58(),
        signature: bs58.encode(signature),
        nonce: challenge.nonce,
        refCode: refCode || null,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Authentication failed');
    return data.user;
  }, [publicKey, signMessage]);

  return { authenticate, connected };
}
