'use client';

import { useCallback, useEffect, useState } from 'react';

import { useUser } from '@/context/UserContext';

type OfferwallSession = {
  mode: 'live' | 'preview';
  url: string;
};

export default function OffersPage() {
  const { balance, refreshUser } = useUser();
  const [session, setSession] = useState<OfferwallSession | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshingBalance, setRefreshingBalance] = useState(false);

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/offerwall/session', { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Unable to load offers.');
      setSession(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load offers.');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    setRefreshingBalance(true);
    try {
      await refreshUser();
    } catch {
      // The dashboard session handler will take care of expired sessions.
    } finally {
      setRefreshingBalance(false);
    }
  }, [refreshUser]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    const interval = window.setInterval(refreshBalance, 30_000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshBalance();
    };

    window.addEventListener('focus', refreshBalance);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshBalance);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [refreshBalance]);

  return (
    <div className="mx-auto w-full max-w-7xl pb-10">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
            Offerwall.gg
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Offers &amp; Tasks
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary sm:text-base">
            Choose an offer, follow every requirement, and your credits will appear after the provider confirms completion.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-default bg-surface px-4 py-2.5">
            <span className="text-xs text-muted">Balance</span>
            <span className="ml-2 text-sm font-semibold text-brand">
              {Number(balance).toFixed(2)} credits
            </span>
          </div>
          <button
            type="button"
            onClick={refreshBalance}
            disabled={refreshingBalance}
            className="rounded-xl border border-default bg-surface px-4 py-2.5 text-sm font-semibold text-secondary transition hover:border-brand/30 hover:text-primary disabled:opacity-50"
          >
            {refreshingBalance ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {session?.mode === 'preview' && (
        <div className="mb-4 rounded-xl border border-warning/25 bg-warning/5 px-4 py-3 text-sm text-secondary">
          Preview mode is active. Offers are visible, but clicks remain disabled until the server secret is configured.
        </div>
      )}

      <section className="min-h-[720px] overflow-hidden rounded-2xl border border-default bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.2)]">
        {loading ? (
          <div className="flex min-h-[720px] items-center justify-center text-sm text-muted">
            Loading available offers…
          </div>
        ) : error ? (
          <div className="flex min-h-[720px] flex-col items-center justify-center px-6 text-center">
            <h2 className="text-lg font-semibold text-primary">Offers are unavailable</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-secondary">{error}</p>
            <button
              type="button"
              onClick={loadSession}
              className="mt-5 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-background transition hover:bg-brand-hover"
            >
              Try again
            </button>
          </div>
        ) : session ? (
          <iframe
            src={session.url}
            title="AttentionToken offers"
            className="block min-h-[800px] w-full border-0 bg-[#0b0d10]"
            allow="clipboard-write"
          />
        ) : null}
      </section>

      <p className="mt-4 text-xs leading-5 text-muted">
        Rewards can take time to confirm. Open the offerwall support area if a completed offer does not appear.
      </p>
    </div>
  );
}
