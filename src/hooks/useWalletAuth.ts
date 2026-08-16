'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback } from 'react';
import bs58 from 'bs58';

export function useWalletAuth() {
  const { publicKey, signMessage, connected} = useWallet();

  const authenticate = useCallback(async (refCode?: string | null) => {
    if (!publicKey || !signMessage) {
      throw new Error('Wallet not connected or does not support signing.');
    }

    // 1. Create a random message for the user to sign
    const message = `Welcome to Attention Monetization! Sign this message to authenticate. Nonce: ${Date.now()}`;
    const messageBytes = new TextEncoder().encode(message);

    try {
      // 2. Ask the wallet to sign the message
      const signature = await signMessage(messageBytes);
      const signatureBase58 = bs58.encode(signature);

      // 3. Send to backend for verification
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: publicKey.toString(),
          signature: signatureBase58,
          message,
          refCode: refCode || null // Send the code!
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Authentication failed');
      }

      const data = await response.json();
        if (data.user && data.user.id) {
          localStorage.setItem('userId', data.user.id);
        }
      return data.user;

    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }, [publicKey, signMessage]);

  return { authenticate, connected };
}