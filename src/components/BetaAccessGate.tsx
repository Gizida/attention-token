'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { track } from '@vercel/analytics';

import { useWalletAuth } from '@/hooks/useWalletAuth';

function clean(value: string | null) {
  return value?.trim().replace(/[^A-Za-z0-9._~-]/g, '').slice(0, 80) || null;
}

export function BetaAccessGate() {
  const { connected, publicKey, disconnect } = useWallet();
  const { authenticate } = useWalletAuth();
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState('');
  const [adult, setAdult] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!connected) return;
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite'); const ref = params.get('ref');
    if (invite) localStorage.setItem('inviteCode', invite);
    if (ref) localStorage.setItem('refCode', ref);
    setInviteCode(invite || localStorage.getItem('inviteCode') || '');
    track('wallet_connected');
  }, [connected]);

  if (!connected || !publicKey) return null;

  async function enterBeta() {
    if (!adult) return setMessage('Confirm the age and terms statement before continuing.');
    setWorking(true); setMessage('Approve the sign-in message in your wallet.');
    try {
      const params = new URLSearchParams(window.location.search);
      await authenticate({
        inviteCode: inviteCode || null,
        refCode: params.get('ref') || localStorage.getItem('refCode'),
        adultAttested: adult,
        acquisition: {
          source: clean(params.get('utm_source')),
          campaign: clean(params.get('utm_campaign')),
          content: clean(params.get('utm_content')),
        },
      });
      track('wallet_sign_in_completed');
      localStorage.removeItem('inviteCode');
      router.push('/dashboard/offers');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to sign in.');
      setWorking(false);
    }
  }

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
    <section className="w-full max-w-lg rounded-[28px] border border-default bg-surface p-7 shadow-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Controlled beta</p>
      <h2 className="mt-3 text-3xl font-bold text-primary">Confirm your access.</h2>
      <p className="mt-3 text-sm leading-6 text-secondary">Existing members can leave the invitation field empty. New wallets need a single-use beta invitation.</p>
      <label className="mt-6 block text-xs font-semibold uppercase tracking-wide text-muted" htmlFor="invite-code">Invitation code</label>
      <input id="invite-code" value={inviteCode} onChange={(event)=>setInviteCode(event.target.value)} placeholder="ABCDE-FGHIJ-KLMNO-PQRST" className="mt-2 w-full rounded-xl border border-default bg-surface-elevated px-4 py-3 font-mono text-sm text-primary outline-none focus:border-brand" />
      <label className="mt-5 flex items-start gap-3 rounded-xl border border-default bg-surface-elevated p-4 text-sm leading-6 text-secondary"><input type="checkbox" checked={adult} onChange={(event)=>setAdult(event.target.checked)} className="mt-1 h-4 w-4 accent-[var(--brand)]" /><span>I confirm that I am at least 18 and accept the <a href="/terms" target="_blank" className="text-brand hover:underline">beta terms</a> and <a href="/privacy" target="_blank" className="text-brand hover:underline">privacy notice</a>.</span></label>
      {message&&<p className="mt-4 text-sm text-secondary" role="status">{message}</p>}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row"><button disabled={working} onClick={enterBeta} className="flex-1 rounded-xl bg-brand px-5 py-3 font-semibold text-background disabled:opacity-50">{working?'Signing in…':'Continue with wallet'}</button><button disabled={working} onClick={()=>void disconnect()} className="rounded-xl border border-default px-5 py-3 text-sm font-semibold text-secondary">Disconnect</button></div>
    </section>
  </div>;
}
