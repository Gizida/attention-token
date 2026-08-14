'use client';

import { useState } from 'react';
import { useUser } from '@/context/UserContext';

export default function WithdrawPage() {
  const user = useUser();
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleWithdraw = async () => {
    setLoading(true);
    setStatus('');
    try {
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credits: parseFloat(amount) })
      });

      const data = await res.json();

      if (res.ok) {
        setStatus(`Success! ${data.solAmount} SOL is being sent to your wallet.`);
        setAmount('');
        // Force refresh to update the sidebar balance
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

  const usdValue = (parseFloat(amount) || 0) / 100;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-primary mb-8">Withdraw Funds</h1>
      
      <div className="p-6 bg-surface rounded-lg border border-default mb-6">
        <h2 className="text-sm text-muted uppercase tracking-wider mb-2">Available Balance</h2>
        <p className="text-4xl font-bold text-brand">
          {Number(user.balance).toFixed(2)} <span className="text-lg text-secondary">credits</span>
        </p>
      </div>

      <div className="p-6 bg-surface rounded-lg border border-default">
        <h2 className="text-xl font-bold text-primary mb-4">Convert to SOL</h2>
        
        <label className="block text-sm font-medium text-secondary mb-2">
          Amount (in credits)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter credit amount (min 100)"
          className="w-full bg-surface-elevated text-primary px-4 py-3 rounded-lg border border-default focus:outline-none focus:border-brand mb-2"
        />
        
        <p className="text-sm text-muted mb-6">
          USD Value: <span className="text-primary font-bold">${usdValue.toFixed(2)}</span>
        </p>

        <button
          onClick={handleWithdraw}
          disabled={loading || !amount}
          className="w-full py-3 bg-brand text-background font-bold rounded-lg hover:bg-brand-hover transition disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Withdraw to Solana Wallet'}
        </button>

        {status && (
          <div className="mt-4 p-4 bg-surface-elevated rounded-lg text-sm text-primary">
            {status}
          </div>
        )}

        <p className="text-xs text-muted mt-6 text-center">
          Minimum withdrawal: 100 credits ($1.00). Withdrawals are processed instantly.
        </p>
      </div>
    </div>
  );
}