'use client';

import { useCallback, useEffect, useState } from 'react';

import { useUser } from '@/context/UserContext';

type Withdrawal = {
  id: string;
  credits: number;
  usdAmount: number;
  solAmount: number;
  status: string;
  quoteExpiresAt: string;
  signature: string | null;
  reviewReason: string | null;
  statusMessage: string | null;
  createdAt: string;
};

const statusLabels: Record<string, string> = {
  awaiting_review: 'Awaiting review',
  queued: 'Queued',
  signing: 'Signing',
  signed: 'Signed',
  submitted: 'Confirming on Solana',
  confirmed: 'Paid',
  retryable: 'Retrying safely',
  rejected: 'Rejected',
  expired: 'Expired and refunded',
};

export default function WithdrawPage() {
  const user = useUser();
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  const loadWithdrawals = useCallback(async () => {
    const response = await fetch('/api/withdrawals', { cache: 'no-store' });
    if (response.ok) setWithdrawals((await response.json()).withdrawals);
  }, []);

  useEffect(() => {
    void loadWithdrawals();
    const timer = window.setInterval(loadWithdrawals, 10_000);
    return () => window.clearInterval(timer);
  }, [loadWithdrawals]);

  const credits = Number(amount);
  const available = Number(user.balances.available);
  const canSubmit = Number.isSafeInteger(credits) && credits >= 100 && credits <= available && credits <= 10_000 && !loading;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ credits }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Withdrawal request failed');
      const withdrawal = data.withdrawal as Withdrawal;
      setMessage(
        withdrawal.status === 'awaiting_review'
          ? `Your ${withdrawal.solAmount.toFixed(9)} SOL quote is reserved and awaiting review.`
          : `Your ${withdrawal.solAmount.toFixed(9)} SOL payout is queued.`,
      );
      setAmount('');
      await Promise.all([loadWithdrawals(), user.refreshUser()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Withdrawal request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl pb-16">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">Withdraw</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-primary md:text-5xl">Turn credits into SOL.</h1>
        <p className="mt-4 max-w-2xl text-secondary">
          Earnings become withdrawable after seven days. Your SOL amount is fixed when the request is accepted.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ['Available', user.balances.available],
          ['Pending maturity', user.balances.pending],
          ['Reserved', user.balances.reserved],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-default bg-surface p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-primary">{Number(value).toFixed(2)} cr</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={submit} className="rounded-[28px] border border-default bg-surface p-7">
          <h2 className="text-2xl font-semibold text-primary">Request a payout</h2>
          <label htmlFor="withdraw-credits" className="mt-7 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Credits
          </label>
          <input
            id="withdraw-credits"
            type="number"
            min={100}
            max={Math.min(10_000, Math.floor(available))}
            step={1}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="mt-3 w-full rounded-2xl border border-default bg-surface-elevated px-5 py-4 text-3xl font-semibold text-primary outline-none focus:border-brand"
          />
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => setAmount(String(Math.min(2_500, Math.floor(available))))} className="rounded-lg border border-default px-3 py-2 text-xs text-secondary">Auto max</button>
            <button type="button" onClick={() => setAmount(String(Math.min(10_000, Math.floor(available))))} className="rounded-lg border border-default px-3 py-2 text-xs text-secondary">Available max</button>
          </div>
          <div className="mt-6 rounded-xl bg-surface-elevated p-4 text-sm leading-6 text-secondary">
            <p>100 credits = $1.00. Requests up to $25 can be automatic.</p>
            <p>Requests from $25.01 to $100 require review. Quotes expire if they remain unsigned for 15 minutes.</p>
          </div>
          <button disabled={!canSubmit} className="mt-6 w-full rounded-xl bg-brand px-4 py-3 font-semibold text-background disabled:opacity-40">
            {loading ? 'Creating request…' : 'Review and request payout'}
          </button>
          {message && <p className="mt-4 text-sm text-secondary" role="status">{message}</p>}
        </form>

        <div className="rounded-[28px] border border-default bg-surface p-7">
          <h2 className="text-2xl font-semibold text-primary">Recent withdrawals</h2>
          <div className="mt-6 space-y-3">
            {withdrawals.length === 0 && <p className="text-sm text-muted">No withdrawal requests yet.</p>}
            {withdrawals.map((withdrawal) => (
              <article key={withdrawal.id} className="rounded-xl border border-default bg-surface-elevated p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-primary">{withdrawal.credits.toFixed(2)} cr · {withdrawal.solAmount.toFixed(9)} SOL</p>
                    <p className="mt-1 text-xs text-muted">{new Date(withdrawal.createdAt).toLocaleString()}</p>
                  </div>
                  <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                    {statusLabels[withdrawal.status] || withdrawal.status}
                  </span>
                </div>
                {withdrawal.reviewReason && <p className="mt-3 text-sm text-secondary">{withdrawal.reviewReason}</p>}
                {!withdrawal.reviewReason && withdrawal.statusMessage && (
                  <p className="mt-3 text-sm leading-6 text-secondary">{withdrawal.statusMessage}</p>
                )}
                {!['confirmed', 'rejected', 'expired'].includes(withdrawal.status) && (
                  <p className="mt-2 text-xs text-muted">
                    Quote expires {new Date(withdrawal.quoteExpiresAt).toLocaleString()}
                  </p>
                )}
                {withdrawal.signature && (
                  <a className="mt-3 inline-block text-sm text-brand hover:underline" href={`https://explorer.solana.com/tx/${withdrawal.signature}`} target="_blank" rel="noreferrer">
                    View on Solana Explorer
                  </a>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
