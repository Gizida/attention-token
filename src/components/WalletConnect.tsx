'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function WalletConnect() {
  const { connected, publicKey } = useWallet();
  const { authenticate } = useWalletAuth();
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (connected && publicKey) {
      const handleAuth = async () => {
        try {
          setStatus('Please sign the message in your wallet...');
          await authenticate();
          setStatus('Success! Redirecting to dashboard...');
          router.push('/dashboard');
        } catch (err) {
          setStatus('Authentication failed or rejected. Please try again.');
          console.error(err);
        }
      };
      handleAuth();
    }
  }, [connected, publicKey, authenticate, router]);

  return (
    <div 
      className="flex flex-col items-center justify-center min-h-screen"
      style={{ backgroundColor: 'var(--background)' }}
    >
      <div 
        className="p-8 shadow-lg max-w-md w-full text-center"
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)'
        }}
      >
        <h1 
          className="text-2xl font-bold mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          Welcome to Solana Auth
        </h1>
        <p 
          className="mb-6"
          style={{ color: 'var(--text-secondary)' }}
        >
          Connect your Solana wallet to access your dashboard
        </p>
        
        {mounted ? (
          <WalletMultiButton />
        ) : (
          <div 
            className="h-[46px] w-full animate-pulse"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              borderRadius: 'var(--radius-sm)'
            }}
          ></div>
        )}
        
        {status && (
          <div 
            className="mt-6 text-sm animate-pulse"
            style={{ color: 'var(--text-muted)' }}
          >
            {status}
          </div>
        )}
      </div>
    </div>
  );
}