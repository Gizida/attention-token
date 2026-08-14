'use client';

import { useEffect, useState, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { useRouter } from 'next/navigation';

export function LandingPage() {
  const { connected, publicKey } = useWallet();
  const { authenticate } = useWalletAuth();
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [mounted, setMounted] = useState(false);
  const hasAttemptedAuth = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (connected && publicKey && !hasAttemptedAuth.current) {
      hasAttemptedAuth.current = true;
      
      const handleAuth = async () => {
        try {
          setStatus('Please sign the message in your wallet...');
          await authenticate();
          setStatus('Success! Redirecting to dashboard...');
          router.push('/dashboard');
        } catch (err) {
          setStatus('Authentication failed or rejected. Please try again.');
          hasAttemptedAuth.current = false;
          console.error(err);
        }
      };
      handleAuth();
    }
  }, [connected, publicKey, authenticate, router]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      
      <img 
       src="/images/construction.png" 
       alt="Under Construction" 
       className="absolute bottom-10 right-10 w-48 md:w-64 pointer-events-none z-0 opacity-80"
      />
      {/* NAVBAR */}
      <nav className="w-full px-6 md:px-12 py-4 flex justify-between items-center border-b border-default">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-brand">
            <span className="text-background font-bold">A</span>
          </div>
          <span className="font-bold text-lg text-primary">AttentionToken</span>
        </div>

        <div className="flex items-center gap-6 md:gap-8">
          <div className="hidden md:flex items-center gap-6">
            <span className="text-base font-medium text-secondary hover:text-primary transition cursor-pointer">How it works</span>
            <span className="text-base font-medium text-secondary hover:text-primary transition cursor-pointer">FAQ</span>
          </div>

          <div>
            {mounted ? (
              <WalletMultiButton className="!bg-brand !text-background !rounded-lg !py-4 !px-8 !w-full hover:!bg-brand-hover !text-base !font-bold" />
            ) : (
              <div className="h-[40px] w-[120px] rounded-lg animate-pulse bg-surface-elevated"></div>
            )}
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="flex-1 flex flex-col md:flex-row items-center justify-between px-6 md:px-12 py-16 md:py-24 max-w-7xl mx-auto w-full">
        <div className="w-full md:w-1/2 mb-12 md:mb-0 md:pr-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight text-primary">
            COMPLETE TASKS.<br/>
            <span className="text-brand">EARN REWARDS.</span>
          </h1>
          <p className="text-lg mb-8 max-w-md text-secondary">
            Turn your time and attention into rewards. Complete tasks from our marketplace, earn credits, and withdraw them through Solana.
          </p>

          <div className="w-full max-w-xs">
            {mounted ? (
              <WalletMultiButton className="!bg-brand !text-background !rounded-lg !py-4 !px-8 !w-full hover:!bg-brand-hover !text-base !font-bold" />
            ) : (
              <div className="h-[52px] w-full rounded-lg animate-pulse bg-surface-elevated"></div>
            )}
          </div>
        </div>

        <div className="w-full md:w-1/2 flex justify-center">
          {/* Abstract Visual Placeholder */}
          <div className="w-64 h-64 md:w-96 md:h-96 rounded-2xl flex items-center justify-center relative overflow-hidden bg-surface border border-default">
            <div className="absolute w-48 h-48 rounded-full blur-3xl opacity-30 bg-brand"></div>
            <span className="relative text-6xl font-bold text-muted">A</span>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="py-16 px-6 md:px-12 border-t border-default">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 text-primary">HOW IT WORKS</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            { num: '01', title: 'Connect', desc: 'Connect your Solana wallet to create your account securely.' },
            { num: '02', title: 'Complete', desc: 'Choose tasks from our marketplace and complete them.' },
            { num: '03', title: 'Earn', desc: 'Convert your earned credits into SOL or platform tokens.' },
          ].map((step) => (
            <div key={step.num} className="p-6 rounded-xl text-center bg-surface border border-default">
              <div className="text-3xl font-bold mb-4 text-brand">{step.num}</div>
              <h3 className="text-xl font-bold mb-2 text-primary">{step.title}</h3>
              <p className="text-secondary">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHAT YOU EARN SECTION */}
      <section className="py-16 px-6 md:px-12 border-t border-default">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 text-primary">WHAT YOU EARN</h2>
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-4 md:gap-8">
          <div className="p-4 md:p-6 rounded-xl bg-surface-elevated border border-default">
            <span className="text-sm md:text-base text-secondary">Credits</span>
          </div>

          <div className="text-2xl md:text-3xl font-bold text-brand">→</div>
          
          <div className="p-4 md:p-6 rounded-xl bg-surface-elevated border border-brand">
            <span className="text-sm md:text-base font-bold text-brand">SOL / Platform Token</span>
          </div>
        </div>
      </section>

      {/* READY TO START CTA */}
      <section className="py-24 px-6 md:px-12 border-t border-default">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary">READY TO START?</h2>
          <p className="mb-8 text-secondary">Connect your Solana wallet to access your dashboard</p>

          <div className="w-full max-w-xs mx-auto">
            {mounted ? (
              <WalletMultiButton className="!bg-brand !text-background !rounded-lg !py-4 !px-8 !w-full hover:!bg-brand-hover !text-base !font-bold" />
            ) : (
              <div className="h-[52px] w-full rounded-lg animate-pulse bg-surface-elevated"></div>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-6 md:px-12 border-t border-default">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-brand">
              <span className="text-black text-xs font-bold">A</span>
            </div>
            <span className="font-bold text-sm text-primary">AttentionToken</span>
          </div>
          <div className="flex gap-8">
            <span className="text-xs hover:text-white transition text-muted">Terms of Service</span>
            <span className="text-xs hover:text-white transition text-muted">Privacy Policy</span>
          </div>
        </div>
      </footer>

      {/* Authentication Status Toast */}
      {status && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 bg-surface border border-default">
          <p className="text-sm animate-pulse text-brand">{status}</p>
        </div>
      )}
    </div>
  );
}