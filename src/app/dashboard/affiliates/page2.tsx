'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser } from '@/context/UserContext';

type AffiliateData = {
  total_referrals: number;
  total_earned_all_time: number | string;
  pending_referral_balance: number | string;
  referral_code: string;
};

export default function AffiliatesPage() {
  const user = useUser();
  const [data, setData] = useState<AffiliateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimStatus, setClaimStatus] = useState('');
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/affiliates', { cache: 'no-store' });

      if (res.ok) {
        const json = await res.json();
        setData(json.affiliateData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const referralLink = useMemo(() => {
    if (!data || typeof window === 'undefined') return '';
    return `${window.location.origin}/?ref=${data.referral_code}`;
  }, [data]);

  const pendingBalance = Number(data?.pending_referral_balance ?? 0);
  const lifetimeEarnings = Number(data?.total_earned_all_time ?? 0);
  const totalReferrals = Number(data?.total_referrals ?? 0);
  const canClaim = pendingBalance > 0;

  const handleClaim = async () => {
    if (!canClaim || claiming) return;

    setClaiming(true);
    setClaimStatus('');

    try {
      const res = await fetch('/api/affiliates', { method: 'POST' });
      const json = await res.json();

      if (res.ok) {
        setClaimStatus(`Successfully claimed ${json.claimedAmount} credits.`);
        await fetchData();
        window.location.reload();
      } else {
        setClaimStatus(json.error || 'Failed to claim.');
      }
    } catch (err) {
      console.error(err);
      setClaimStatus('Network error.');
    } finally {
      setClaiming(false);
    }
  };

  const copyLink = async () => {
    if (!referralLink) return;

    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
      setClaimStatus('Unable to copy the referral link.');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl animate-pulse">
        <div className="h-10 w-48 rounded-lg bg-surface-elevated" />
        <div className="mt-3 h-5 w-96 max-w-full rounded bg-surface-elevated" />

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <div className="h-32 rounded-2xl bg-surface" />
          <div className="h-32 rounded-2xl bg-surface" />
          <div className="h-32 rounded-2xl bg-surface" />
        </div>

        <div className="mt-8 h-64 rounded-2xl bg-surface" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <div className="rounded-2xl border border-danger/30 bg-surface p-8">
          <p className="text-sm font-medium text-danger">
            Failed to load affiliate data.
          </p>
          <p className="mt-2 text-sm text-muted">
            Refresh the page and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl pb-16">
      {/* Header */}
      <section className="mb-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-brand">
              Referral program
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-primary md:text-5xl">
              Invite people.
              <br />
              <span className="text-secondary">Keep a share of what they earn.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-secondary md:text-lg">
              Share your link with friends and communities. When your referrals
              earn, you receive 5% of their earnings, up to 500 credits per person.
            </p>
          </div>

          <div className="hidden lg:block">
            <div className="rounded-full border border-brand/20 bg-brand/5 px-4 py-2 text-xs font-medium text-brand">
              Your referral code · {data.referral_code}
            </div>
          </div>
        </div>
      </section>

      {/* Key numbers */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-default bg-surface p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Total affiliates
          </p>
          <div className="mt-6 flex items-end justify-between gap-4">
            <p className="text-4xl font-semibold tracking-tight text-primary">
              {totalReferrals}
            </p>
            <span className="text-xs text-muted">people</span>
          </div>
        </div>

        <div className="rounded-2xl border border-default bg-surface p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Lifetime earnings
          </p>
          <div className="mt-6 flex items-end justify-between gap-4">
            <p className="text-4xl font-semibold tracking-tight text-success">
              {lifetimeEarnings.toFixed(2)}
            </p>
            <span className="pb-1 text-xs text-muted">credits</span>
          </div>
        </div>

        <div className="rounded-2xl border border-brand/20 bg-surface p-6 shadow-[0_0_40px_rgba(124,255,178,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Available to claim
          </p>
          <div className="mt-6 flex items-end justify-between gap-4">
            <p className="text-4xl font-semibold tracking-tight text-brand">
              {pendingBalance.toFixed(2)}
            </p>
            <span className="pb-1 text-xs text-muted">credits</span>
          </div>
        </div>
      </section>

      {/* Main referral composition */}
      <section className="mt-10 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        {/* Referral link */}
        <div className="rounded-2xl border border-default bg-surface p-7 md:p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Your link
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary">
                Share your referral link
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-secondary">
                Anyone who joins through this link becomes part of your referral
                network.
              </p>
            </div>

            <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-default bg-surface-elevated text-brand sm:flex">
              ↗
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-default bg-surface-elevated p-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="min-w-0 flex-1 px-3 py-3">
                <p className="truncate font-mono text-sm text-secondary">
                  {referralLink}
                </p>
              </div>

              <button
                type="button"
                onClick={copyLink}
                className="rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-background transition hover:bg-brand-hover"
              >
                {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-primary">5% share</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Earn from referred users' completed activity.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-primary">500 credit cap</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Maximum referral earnings per person.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-primary">Simple settlement</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Claim your pending commissions into your balance.
              </p>
            </div>
          </div>
        </div>

        {/* Claim panel */}
        <div className="relative overflow-hidden rounded-2xl border border-default bg-surface p-7 md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand/5 blur-3xl" />

          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Pending commissions
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary">
              Ready when you are.
            </h2>
            <p className="mt-3 text-sm leading-6 text-secondary">
              Move your accumulated referral rewards into your main AttentionToken
              balance.
            </p>

            <div className="mt-10">
              <p className="text-4xl font-semibold tracking-tight text-brand">
                {pendingBalance.toFixed(2)}
              </p>
              <p className="mt-1 text-sm text-muted">credits available</p>
            </div>

            <button
              type="button"
              onClick={handleClaim}
              disabled={!canClaim || claiming}
              className="mt-8 w-full rounded-xl bg-brand px-5 py-3.5 text-sm font-semibold text-background transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {claiming ? 'Processing…' : 'Claim balance'}
            </button>

            {claimStatus && (
              <div className="mt-4 rounded-lg border border-default bg-surface-elevated px-4 py-3 text-sm text-secondary">
                {claimStatus}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mt-14 rounded-2xl border border-default bg-surface p-7 md:p-8">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
              How it works
            </p>
            <h2 className="mt-3 max-w-sm text-3xl font-semibold tracking-tight text-primary">
              A referral loop with no extra complexity.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-secondary">
              Your link handles attribution. The platform tracks the qualifying
              earnings, and the resulting commission waits here until you claim it.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                number: '01',
                title: 'Share',
                text: 'Send your referral link to someone you know.',
              },
              {
                number: '02',
                title: 'They earn',
                text: 'Your referral completes eligible tasks and earns credits.',
              },
              {
                number: '03',
                title: 'You earn',
                text: 'You receive 5% of their earnings, up to the per-person cap.',
              },
            ].map((step) => (
              <div
                key={step.number}
                className="rounded-xl border border-default bg-surface-elevated p-5"
              >
                <p className="text-xs font-semibold tracking-[0.18em] text-brand">
                  {step.number}
                </p>
                <h3 className="mt-8 text-lg font-semibold text-primary">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-secondary">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <p className="mt-6 text-center text-xs leading-5 text-muted">
        Your current signed-in wallet owns the referral code shown above.
      </p>
    </div>
  );
}
