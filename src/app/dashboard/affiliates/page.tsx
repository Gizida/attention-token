'use client';

import { useEffect, useMemo, useState } from 'react';

type AffiliateData = {
  total_referrals: number;
  total_earned_all_time: number | string;
  pending_referral_balance: number | string;
  referral_code: string;
};

export default function AffiliatesPage() {
  const [data, setData] = useState<AffiliateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copyError, setCopyError] = useState('');
  const [copied, setCopied] = useState(false);

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

  const copyLink = async () => {
    if (!referralLink) return;

    try {
      await navigator.clipboard.writeText(referralLink);
      setCopyError('');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
      setCopyError('Unable to copy the referral link.');
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
      {/* Referral overview banner */}
      <section className="relative mb-12 overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_8%_10%,rgba(124,255,178,0.22),transparent_34%),radial-gradient(circle_at_92%_18%,rgba(151,108,255,0.28),transparent_38%),linear-gradient(135deg,#101b18_0%,#0c1117_47%,#171126_100%)] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:p-9 lg:p-10">
        <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-brand/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-[-4rem] h-72 w-72 rounded-full bg-purple-400/10 blur-3xl" />

        <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-brand">
              Referral program
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
              Invite people.
              <br />
              <span className="text-white/65">Keep a share of what they earn.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/65 md:text-lg">
              Share your link with friends and communities. When your referrals
              earn, you receive 5% of their earnings, up to 500 credits per person.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-10 gap-y-6 border-t border-white/10 pt-6 lg:min-w-[290px] lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                Affiliates
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
                {totalReferrals}
              </p>
              <p className="mt-1 text-xs text-white/40">people referred</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                Lifetime
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
                {lifetimeEarnings.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-white/40">credits earned</p>
            </div>

            <div className="col-span-2 flex items-center justify-between gap-4 border-t border-white/10 pt-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                  Referral code
                </p>
                <p className="mt-1 font-mono text-sm text-white/75">
                  {data.referral_code}
                </p>
              </div>
              <span className="rounded-full border border-brand/20 bg-brand/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">
                5% share
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main referral composition */}
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
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
                Earn from referred users&apos; completed activity.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-primary">500 credit cap</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Maximum referral earnings per person.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-primary">Automatic settlement</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Commissions become available after seven days.
              </p>
            </div>
          </div>
        </div>

        {/* Maturity panel */}
        <div className="relative overflow-hidden rounded-2xl border border-default bg-surface p-7 md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand/5 blur-3xl" />

          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Maturing commissions
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary">
              Available automatically.
            </h2>
            <p className="mt-3 text-sm leading-6 text-secondary">
              Referral rewards share the same seven-day availability period as
              the qualifying Offerwall earnings.
            </p>

            <div className="mt-10">
              <p className="text-4xl font-semibold tracking-tight text-brand">
                {pendingBalance.toFixed(2)}
              </p>
              <p className="mt-1 text-sm text-muted">credits pending maturity</p>
            </div>

            <div className="mt-8 rounded-xl border border-brand/20 bg-brand/5 px-5 py-4 text-sm leading-6 text-secondary">
              No claim action is required. Mature rewards move into your available
              balance automatically.
            </div>

            {copyError && (
              <div className="mt-4 rounded-lg border border-default bg-surface-elevated px-4 py-3 text-sm text-secondary">
                {copyError}
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
              earnings, and the resulting commission becomes available after seven days.
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
        Referral earnings mature automatically and may be reversed when the underlying offer is reversed.
      </p>
    </div>
  );
}
