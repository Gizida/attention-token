'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@/context/UserContext';

export default function WithdrawPage() {
  const user = useUser();
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [solPrice, setSolPrice] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
          { cache: 'no-store' }
        );
        const data = await res.json();
        setSolPrice(data.solana.usd);
      } catch (err) {
        console.error('Failed to fetch SOL price');
      }
    };

    fetchPrice();
  }, []);

  const numericAmount = parseFloat(amount) || 0;
  const usdValue = numericAmount / 100;
  const solToReceive = solPrice > 0 ? usdValue / solPrice : 0;

  const balance = Number(user.balance);
  const remainingBalance = Math.max(balance - numericAmount, 0);
  const destination = `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-6)}`;

  const canReview = numericAmount >= 100 && numericAmount <= balance && !loading;

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || numericAmount < 100) {
      setStatus('Minimum withdrawal is 100 credits ($1.00).');
      return;
    }

    if (numericAmount > balance) {
      setStatus('Insufficient balance.');
      return;
    }

    setStatus('');
    setShowConfirm(true);
  };

  const handleConfirmWithdraw = async () => {
    setLoading(true);
    setShowConfirm(false);

    try {
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credits: numericAmount }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus(`Success! ${data.solAmount} SOL has been sent to your wallet.`);
        setAmount('');
        window.location.reload();
      } else {
        setStatus(data.error || 'Withdrawal failed.');
      }
    } catch (error) {
      setStatus('Network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const setQuickAmount = (value: number) => {
    const nextValue = Math.max(0, Math.floor(value));
    setAmount(String(nextValue));
    setStatus('');
  };

  const previewLabel = useMemo(() => {
    if (!amount) return 'Enter an amount to see your SOL estimate.';
    if (numericAmount < 100) return 'Minimum withdrawal: 100 credits.';
    if (numericAmount > balance) return 'That amount exceeds your current balance.';
    if (!solPrice) return 'Fetching the current SOL price…';
    return 'Estimate updates with the current SOL market price.';
  }, [amount, numericAmount, balance, solPrice]);

  return (
    <div className="mx-auto w-full max-w-6xl pb-16">
      {/* Header */}
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">
          Withdraw
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-primary md:text-5xl">
              Turn credits
              <br />
              <span className="text-secondary">into SOL.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-secondary">
              Choose how much of your balance you want to withdraw. The amount is
              converted to SOL at the current displayed market price and sent to
              your connected wallet.
            </p>
          </div>

          <div className="text-sm text-muted">
            Minimum · <span className="font-semibold text-primary">100 credits</span>
          </div>
        </div>
      </header>

      {/* Main withdrawal workspace */}
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Form / conversion panel */}
        <div className="rounded-[28px] border border-default bg-surface p-7 md:p-9">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Conversion
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary">
                Choose an amount
              </h2>
            </div>

            <div className="rounded-full border border-brand/20 bg-brand/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
              1 credit = $0.01
            </div>
          </div>

          <form onSubmit={handleReview} className="mt-8">
            <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Credits to withdraw
            </label>

            <div className="relative mt-3">
              <input
                type="number"
                min="100"
                max={balance}
                step="1"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setStatus('');
                }}
                placeholder="0"
                className="w-full rounded-2xl border border-default bg-surface-elevated px-5 py-5 pr-24 text-4xl font-semibold tracking-tight text-primary outline-none transition placeholder:text-muted focus:border-brand/60 focus:ring-4 focus:ring-brand/5 md:text-5xl"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted">
                credits
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setQuickAmount(balance)}
                className="rounded-lg border border-default bg-surface-elevated px-3 py-2 text-xs font-semibold text-secondary transition hover:border-brand/30 hover:text-primary"
              >
                Max
              </button>
              <button
                type="button"
                onClick={() => setQuickAmount(balance * 0.5)}
                className="rounded-lg border border-default bg-surface-elevated px-3 py-2 text-xs font-semibold text-secondary transition hover:border-brand/30 hover:text-primary"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => setQuickAmount(balance * 0.25)}
                className="rounded-lg border border-default bg-surface-elevated px-3 py-2 text-xs font-semibold text-secondary transition hover:border-brand/30 hover:text-primary"
              >
                25%
              </button>
              <button
                type="button"
                onClick={() => setQuickAmount(100)}
                className="rounded-lg border border-default bg-surface-elevated px-3 py-2 text-xs font-semibold text-secondary transition hover:border-brand/30 hover:text-primary"
              >
                Minimum
              </button>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-default bg-surface-elevated p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  USD value
                </p>
                <p className="mt-2 text-xl font-semibold text-primary">
                  ${usdValue.toFixed(2)}
                </p>
              </div>

              <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Estimated SOL
                </p>
                <p className="mt-2 text-xl font-semibold text-brand">
                  {solToReceive.toFixed(6)} SOL
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs leading-5 text-muted">
              {previewLabel}
            </p>

            <div className="mt-8 flex items-center justify-between gap-4 border-t border-default pt-6">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted">
                  Remaining balance
                </p>
                <p className="mt-1 text-sm font-semibold text-primary">
                  {remainingBalance.toFixed(2)} credits
                </p>
              </div>

              <button
                type="submit"
                disabled={!canReview}
                className="rounded-xl bg-brand px-6 py-3.5 text-sm font-semibold text-background transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                Review withdrawal →
              </button>
            </div>
          </form>

          {status && (
            <div className="mt-5 rounded-xl border border-default bg-surface-elevated px-4 py-3 text-sm text-secondary">
              {status}
            </div>
          )}
        </div>

        {/* Destination / quote panel */}
        <aside className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_18%_10%,rgba(124,255,178,0.16),transparent_38%),radial-gradient(circle_at_95%_88%,rgba(151,108,255,0.14),transparent_34%),linear-gradient(145deg,#0d1513_0%,#0c1117_55%,#141022_100%)] p-7 md:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-brand/10 blur-3xl" />

          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
              Settlement
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              Sent to your wallet.
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/55">
              Your withdrawal is sent to the same Solana wallet connected to this account.
            </p>

            <div className="mt-9 rounded-2xl border border-white/10 bg-black/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">
                Destination
              </p>
              <p className="mt-3 font-mono text-sm text-white/80">
                {destination}
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">
                Current SOL price
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                {solPrice > 0 ? `$${solPrice.toLocaleString()}` : 'Fetching…'}
              </p>
              <p className="mt-2 text-xs leading-5 text-white/40">
                The displayed estimate changes with the live SOL price.
              </p>
            </div>

            <div className="mt-8 border-t border-white/10 pt-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/45">Available</span>
                <span className="font-semibold text-white/80">
                  {balance.toFixed(2)} cr
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-white/45">Minimum</span>
                <span className="font-semibold text-brand">100 cr</span>
              </div>
            </div>
          </div>
        </aside>
      </section>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-default bg-surface shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
            <div className="border-b border-default px-6 py-5 md:px-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                Final review
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-primary">
                Confirm withdrawal
              </h3>
              <p className="mt-2 text-sm leading-6 text-secondary">
                Check the conversion and destination below before sending.
              </p>
            </div>

            <div className="space-y-3 p-6 md:p-7">
              <div className="flex items-center justify-between rounded-xl bg-surface-elevated px-4 py-3">
                <span className="text-sm text-muted">Credits to deduct</span>
                <span className="font-semibold text-primary">{numericAmount.toFixed(2)} cr</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-surface-elevated px-4 py-3">
                <span className="text-sm text-muted">USD value</span>
                <span className="font-semibold text-primary">${usdValue.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-brand/20 bg-brand/5 px-4 py-3">
                <span className="text-sm text-muted">Estimated to receive</span>
                <span className="font-semibold text-brand">{solToReceive.toFixed(6)} SOL</span>
              </div>

              <div className="flex items-center justify-between border-t border-default pt-4">
                <span className="text-xs uppercase tracking-[0.14em] text-muted">
                  Destination
                </span>
                <span className="font-mono text-xs text-secondary">
                  {destination}
                </span>
              </div>
            </div>

            <div className="flex gap-3 border-t border-default px-6 py-5 md:px-7">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-xl border border-default bg-surface-elevated px-4 py-3 text-sm font-semibold text-secondary transition hover:text-primary"
              >
                Go back
              </button>

              <button
                type="button"
                onClick={handleConfirmWithdraw}
                disabled={loading}
                className="flex-1 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-background transition hover:bg-brand-hover disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Confirm & send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
