'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback } from 'react';
import bs58 from 'bs58';

export const CURRENT_TERMS_VERSION = '2026-09-12';

export type AuthenticationInput = {
  refCode?: string | null;
  inviteCode?: string | null;
  adultAttested: boolean;
  acquisition?: { source?: string | null; campaign?: string | null; content?: string | null };
};

export function useWalletAuth() {
  const { publicKey, signMessage, connected } = useWallet();

  const authenticate = useCallback(async (input: AuthenticationInput) => {
    if (!publicKey || !signMessage) throw new Error('Wallet not connected or does not support signing.');
    const challengeResponse = await fetch('/api/auth/challenge', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey: publicKey.toBase58() }),
    });
    const challenge = await challengeResponse.json();
    if (!challengeResponse.ok) throw new Error(challenge.error || 'Could not create sign-in challenge');
    const signature = await signMessage(new TextEncoder().encode(challenge.message));
    const response = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: publicKey.toBase58(), signature: bs58.encode(signature), nonce: challenge.nonce,
        refCode: input.refCode || null, inviteCode: input.inviteCode || null,
        adultAttested: input.adultAttested, termsVersion: CURRENT_TERMS_VERSION,
        acquisition: input.acquisition,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Authentication failed');
    return data.user;
  }, [publicKey, signMessage]);

  return { authenticate, connected };
}
