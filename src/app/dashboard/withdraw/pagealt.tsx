'use client';

import { useState, useEffect } from 'react';
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
        console.error('Failed to fetch SOL price', err);
      }
    };

    fetchPrice();
  }, []);

  const numericAmount = parseFloat(amount) || 0;
  const usdValue = numericAmount / 100;
  const solToReceive = solPrice > 0 ? usdValue / solPrice : 0;
  const balance = Number(user.balance);
  const remainingBalance = Math.max(balance - numericAmount, 0);

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
      console.error(error);
      setStatus('Network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const selectAmount = (value: number) => {
    setStatus('');
    setAmount(value.toFixed(0));
  };

  return (
    <div className="mx-auto w-full max-w-5xl pb-16">
      {/* Header */}
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">
          Withdraw
        </p>
        <div className="mt-3 max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight text-primary md:text-5xl">
            Turn credits
            <br />
            <span className="text-secondary">into SOL.</span>
          </h1>
          <p className="mt-4 text-base leading-7 text-secondary">
            Convert your earned credits into SOL and send the proceeds directly
            to the wallet connected to your AttentionToken account.
          </p>
        </div>
      </header>

      {/* Balance banner */}
      <section className="relative mb-8 overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_8%_10%,rgba(124,255,178,0.15),transparent_34%),radial-gradient(circle_at_92%_15%,rgba(151,108,255,0.14),transparent_36%),linear-gradient(135deg,#0d1513_0%,#0d1117_52%,#141022_100%)] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.22)] md:p-8">
        <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-brand/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-[-2rem] h-52 w-52 rounded-full bg-purple-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
              Available balance
            </p>
            <div className="mt-3 flex items-end gap-3">
              <span className="text-5xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
                {balance.toFixed(2)}
              </span>
              <span className="pb-2 text-sm font-medium text-white/45">
                credits
              </span>
            </div>
          </div>

          <div className="max-w-xs text-sm leading-6 text-white/50 md:text-right">
            100 credits = $1.00 USD. Your withdrawal is sent to your connected
            Solana wallet.
          </div>
        </div>
      </section>

      {/* Main conversion workspace */}
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-default bg-surface p-7 md:p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                01 · Choose amount
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary">
                How much would you like to withdraw?
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-secondary">
                Enter the number of credits you want to convert. The estimated
                SOL amount updates automatically using the current SOL price.
              </p>
            </div>

            <div className="hidden h-10 w-10 items-center justify-center rounded-xl border border-default bg-surface-elevated text-brand sm:flex">
              ↘
            </div>
          </div>

          <form onSubmit={handleReview} className="mt-8">
            <label
              htmlFor="withdraw-amount"
              className="mb-2 block text-sm font-medium text-secondary"
            >
              Credits
            </label>

            <div className="relative">
              <input
                id="withdraw-amount"
                type="number"
                min="100"
                step="1"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setStatus('');
                }}
                placeholder="Enter amount"
                className="w-full rounded-2xl border border-default bg-surface-elevated px-5 py-5 pr-24 text-2xl font-semibold tracking-tight text-primary outline-none transition placeholder:text-muted focus:border-brand/60 focus:ring-2 focus:ring-brand/10"
              />
              <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted">
                credits
              </span>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => selectAmount(balance)}
                className="rounded-xl border border-default bg-surface-elevated py-2.5 text-xs font-medium text-secondary transition hover:border-brand/35 hover:text-primary"
              >
                All
              </button>
              <button
                type="button"
                onClick={() => selectAmount(balance * 0.5)}
                className="rounded-xl border border-default bg-surface-elevated py-2.5 text-xs font-medium text-secondary transition hover:border-brand/35 hover:text-primary"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => selectAmount(balance * 0.25)}
                className="rounded-xl border border-default bg-surface-elevated py-2.5 text-xs font-medium text-secondary transition hover:border-brand/35 hover:text-primary"
              >
                25%
              </button>
              <button
                type="button"
                onClick={() => selectAmount(100)}
                className="rounded-xl border border-default bg-surface-elevated py-2.5 text-xs font-medium text-secondary transition hover:border-brand/35 hover:text-primary"
              >
                100 cr
              </button>
            </div>

            {status && (
              <div
                className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
                  status.startsWith('Success!')
                    ? 'border-success/20 bg-success/5 text-success'
                    : 'border-danger/20 bg-danger/5 text-danger'
                }`}
              >
                {status}
              </div>
            )}

            <div className="mt-8">
              <button
                type="submit"
                disabled={loading || !amount}
                className="w-full rounded-xl bg-brand px-5 py-3.5 text-sm font-semibold text-background transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                Review withdrawal
              </button>
            </div>

            <p className="mt-4 text-center text-xs text-muted">
              Minimum withdrawal: 100 credits ($1.00)
            </p>
          </form>
        </div>

        {/* Conversion preview */}
        <aside className="rounded-2xl border border-default bg-surface p-7 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            02 · Preview
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary">
            What you'll receive
          </h2>

          <div className="mt-10 rounded-2xl border border-default bg-surface-elevated p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Estimated SOL
            </p>

            <div className="mt-4">
              <span className="text-4xl font-semibold tracking-[-0.04em] text-brand">
                {solToReceive.toFixed(6)}
              </span>
              <span className="ml-2 text-sm font-medium text-secondary">SOL</span>
            </div>

            <div className="mt-6 space-y-3 border-t border-default pt-5">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted">Credit amount</span>
                <span className="font-medium text-primary">
                  {numericAmount.toFixed(2)} cr
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted">USD value</span>
                <span className="font-medium text-primary">
                  ${usdValue.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted">SOL price</span>
                <span className="font-medium text-primary">
                  {solPrice > 0 ? `$${solPrice.toFixed(2)}` : 'Loading…'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted">After withdrawal</span>
                <span className="font-medium text-secondary">
                  {remainingBalance.toFixed(2)} cr
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-brand/10 bg-brand/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
              Destination
            </p>
            <p className="mt-2 truncate font-mono text-sm text-secondary">
              {user.wallet_address}
            </p>
          </div>

          <p className="mt-5 text-xs leading-5 text-muted">
            The displayed SOL amount is an estimate based on the current market
            price. Your final settlement is handled when the withdrawal is sent.
          </p>
        </aside>
      </section>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[24px] border border-white/10 bg-surface p-6 shadow-[0_30px_100px_rgba(0,0,0,0.55)] md:p-7">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                Final review
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-primary">
                Confirm withdrawal
              </h3>
              <p className="mt-2 text-sm leading-6 text-secondary">
                Check the amount and destination before sending.
              </p>
            </div>

            <div className="rounded-2xl border border-default bg-surface-elevated p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">
                    You'll receive
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-brand">
                    {solToReceive.toFixed(6)} SOL
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-muted">For</p>
                  <p className="mt-1 text-sm font-semibold text-primary">
                    {numericAmount.toFixed(2)} credits
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3 border-t border-default pt-4">
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-muted">USD value</span>
                  <span className="font-medium text-primary">
                    ${usdValue.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-muted">Destination</span>
                  <span className="font-mono text-secondary">
                    {user.wallet_address.slice(0, 4)}...{user.wallet_address.slice(-4)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-xl border border-default px-4 py-3 text-sm font-medium text-secondary transition hover:bg-surface-elevated hover:text-primary"
              >
                Go back
              </button>
              <button
                type="button"
                onClick={handleConfirmWithdraw}
                disabled={loading}
                className="rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-background transition hover:bg-brand-hover disabled:opacity-50"
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
