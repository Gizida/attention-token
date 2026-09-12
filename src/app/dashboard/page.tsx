'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';

type Transaction = {
  id?: number;
  type: string;
  amount: number | string;
  created_at: string;
  sol_amount?: number | string | null;
  provider?: string | null;
};

export default function DashboardHome() {
  const user = useUser();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTx = async () => {
      try {
        const res = await fetch('/api/transactions', { cache: 'no-store' });

        if (res.ok) {
          const data = await res.json();
          setTransactions(data.transactions);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchTx();
  }, []);

  const balance = Number(user.balance);
  const walletShort = useMemo(
    () => `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-6)}`,
    [user.wallet_address]
  );

  const transactionCount = transactions.length;

  return (
    <div className="mx-auto w-full max-w-6xl pb-16">
      {/* Header */}
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">
          Account overview
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-primary md:text-5xl">
              Your attention,
              <br />
              <span className="text-secondary">at work.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-secondary">
              Complete offers, build your balance, and turn your earned credits
              into on-chain rewards.
            </p>
          </div>

          <Link
            href="/dashboard/offers"
            className="inline-flex w-fit items-center rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-background transition hover:bg-brand-hover"
          >
            Find something to earn <span className="ml-2">→</span>
          </Link>
        </div>
      </header>

      {/* Balance + wallet hero */}
      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_8%_10%,rgba(124,255,178,0.16),transparent_34%),radial-gradient(circle_at_92%_15%,rgba(151,108,255,0.16),transparent_35%),linear-gradient(135deg,#0d1513_0%,#0d1117_52%,#141022_100%)] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.24)] md:p-9">
        <div className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full bg-brand/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-[-3rem] h-56 w-56 rounded-full bg-purple-400/10 blur-3xl" />

        <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
              Available balance
            </p>

            <div className="mt-4 flex items-end gap-3">
              <span className="text-6xl font-semibold tracking-[-0.06em] text-white md:text-7xl">
                {balance.toFixed(2)}
              </span>
              <span className="pb-2 text-sm font-medium text-white/50">
                credits
              </span>
            </div>

            <p className="mt-4 max-w-xl text-sm leading-6 text-white/55">
              Your credits are your current reward balance. Keep earning from
              offers, then move them through the withdrawal flow when you&apos;re ready.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/dashboard/offers"
                className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-background transition hover:bg-brand-hover"
              >
                Earn credits
              </Link>
              <Link
                href="/dashboard/withdraw"
                className="rounded-xl border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/[0.08]"
              >
                Withdraw
              </Link>
            </div>
          </div>

          <div className="lg:border-l lg:border-white/10 lg:pl-9">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
              Connected wallet
            </p>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/10 p-4">
              <p className="font-mono text-sm tracking-tight text-white/80">
                {walletShort}
              </p>
            </div>

            <div className="mt-5 flex items-center justify-between text-xs">
              <span className="text-white/40">Transaction history</span>
              <span className="text-white/65">
                {transactionCount} {transactionCount === 1 ? 'entry' : 'entries'}
              </span>
            </div>

            <Link
              href="/dashboard/withdraw"
              className="mt-5 inline-flex text-sm font-medium text-brand transition hover:text-brand-hover"
            >
              View withdrawal options →
            </Link>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <Link
          href="/dashboard/offers"
          className="group rounded-2xl border border-default bg-surface p-6 transition hover:-translate-y-0.5 hover:border-brand/25 hover:bg-surface-elevated"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            01
          </p>
          <h2 className="mt-6 text-xl font-semibold text-primary">
            Browse offers
          </h2>
          <p className="mt-2 text-sm leading-6 text-secondary">
            Find surveys, tasks, and other ways to turn your attention into credits.
          </p>
          <span className="mt-6 block text-sm font-medium text-secondary transition group-hover:text-primary">
            Open offers <span aria-hidden="true">→</span>
          </span>
        </Link>

        <Link
          href="/dashboard/withdraw"
          className="group rounded-2xl border border-default bg-surface p-6 transition hover:-translate-y-0.5 hover:border-brand/25 hover:bg-surface-elevated"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            02
          </p>
          <h2 className="mt-6 text-xl font-semibold text-primary">
            Withdraw
          </h2>
          <p className="mt-2 text-sm leading-6 text-secondary">
            Convert your earned balance into the reward available through the
            withdrawal flow.
          </p>
          <span className="mt-6 block text-sm font-medium text-secondary transition group-hover:text-primary">
            Manage withdrawal <span aria-hidden="true">→</span>
          </span>
        </Link>

        <Link
          href="/dashboard/affiliates"
          className="group rounded-2xl border border-default bg-surface p-6 transition hover:-translate-y-0.5 hover:border-brand/25 hover:bg-surface-elevated"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            03
          </p>
          <h2 className="mt-6 text-xl font-semibold text-primary">
            Invite & earn
          </h2>
          <p className="mt-2 text-sm leading-6 text-secondary">
            Share your referral link and earn a percentage of eligible referral
            activity.
          </p>
          <span className="mt-6 block text-sm font-medium text-secondary transition group-hover:text-primary">
            Open affiliates <span aria-hidden="true">→</span>
          </span>
        </Link>
      </section>

      {/* Transactions */}
      <section className="mt-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Activity
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary">
              Recent transactions
            </h2>
          </div>

          {transactionCount > 0 && (
            <p className="text-xs text-muted">
              {transactionCount} recent {transactionCount === 1 ? 'transaction' : 'transactions'}
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-default bg-surface">
          {loading ? (
            <div className="space-y-4 p-7">
              <div className="h-5 w-32 animate-pulse rounded bg-surface-elevated" />
              <div className="h-12 animate-pulse rounded-xl bg-surface-elevated" />
              <div className="h-12 animate-pulse rounded-xl bg-surface-elevated" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="px-7 py-12 text-center md:py-16">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-default bg-surface-elevated text-brand">
                +
              </div>
              <h3 className="mt-5 text-lg font-semibold text-primary">
                Your activity will appear here.
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-secondary">
                Complete your first offer and this space will become your running
                record of earnings and withdrawals.
              </p>
              <Link
                href="/dashboard/offers"
                className="mt-6 inline-flex text-sm font-semibold text-brand hover:text-brand-hover"
              >
                Find your first offer →
              </Link>
            </div>
          ) : (
            <div>
              <div className="hidden grid-cols-[1fr_auto] gap-6 border-b border-default bg-surface-elevated px-7 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted md:grid">
                <span>Transaction</span>
                <span>Amount</span>
              </div>

              {transactions.map((tx, index) => {
                const isEarn = tx.type === 'earn';
                const isWithdraw = tx.type === 'withdraw';
                const amount = Number(tx.amount);
                const isDebit = isWithdraw || tx.type === 'reversal' || amount < 0;
                const transactionLabel =
                  tx.type === 'earn' && tx.provider === 'offerwall.gg'
                    ? 'Offerwall reward'
                    : tx.type === 'reversal'
                      ? 'Offer reversal'
                      : tx.type.replaceAll('_', ' ');

                return (
                  <div
                    key={tx.id ?? `${tx.created_at}-${index}`}
                    className="grid gap-3 border-b border-default px-6 py-5 last:border-b-0 md:grid-cols-[1fr_auto] md:items-center md:px-7"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm ${
                            isEarn && !isDebit
                              ? 'border-success/15 bg-success/5 text-success'
                              : isDebit
                                ? 'border-danger/15 bg-danger/5 text-danger'
                                : 'border-default bg-surface-elevated text-muted'
                          }`}
                        >
                          {isEarn && !isDebit ? '+' : isWithdraw ? '↗' : isDebit ? '−' : '•'}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium capitalize text-primary">
                            {transactionLabel}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {new Date(tx.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {isWithdraw && tx.sol_amount && (
                        <p className="mt-3 pl-12 text-xs text-brand">
                          Received {Number(tx.sol_amount).toFixed(6)} SOL
                        </p>
                      )}
                    </div>

                    <div className="pl-12 text-left md:pl-0 md:text-right">
                      <p
                        className={`text-sm font-semibold ${
                          isDebit ? 'text-danger' : 'text-success'
                        }`}
                      >
                        {isDebit ? '-' : '+'}
                        {Math.abs(amount).toFixed(2)}
                        <span className="ml-1 text-xs font-normal text-muted">
                          credits
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
