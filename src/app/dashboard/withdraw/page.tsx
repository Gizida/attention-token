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

  // Fetch live SOL price when the page loads
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', { cache: 'no-store' });
        const data = await res.json();
        setSolPrice(data.solana.usd);
      } catch (err) {
        console.error("Failed to fetch SOL price");
      }
    };
    fetchPrice();
  }, []);

  const usdValue = (parseFloat(amount) || 0) / 100;
  const solToReceive = solPrice > 0 ? (usdValue / solPrice) : 0;

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) < 100) {
      setStatus('Minimum withdrawal is 100 credits ($1.00).');
      return;
    }
    if (parseFloat(amount) > Number(user.balance)) {
      setStatus('Insufficient balance.');
      return;
    }
    setStatus('');
    setShowConfirm(true); // Open the confirmation window
  };

  const handleConfirmWithdraw = async () => {
    setLoading(true);
    setShowConfirm(false);
    try {
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credits: parseFloat(amount) })
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
        
        <form onSubmit={handleReview}>
          <label className="block text-sm font-medium text-secondary mb-2">
            Amount (in credits)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter credit amount (min 100)"
            className="w-full bg-surface-elevated text-primary px-4 py-3 rounded-lg border border-default focus:outline-none focus:border-brand mb-3"
          />

          {/* QUICK-SELECT BUTTONS */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            <button 
              type="button" 
              onClick={() => setAmount(Number(user.balance).toFixed(0))}
              className="py-2 text-xs rounded-lg bg-surface-elevated border border-default text-secondary hover:border-brand hover:text-primary transition"
            >
              All
            </button>
            <button 
              type="button" 
              onClick={() => setAmount((Number(user.balance) * 0.50).toFixed(0))}
              className="py-2 text-xs rounded-lg bg-surface-elevated border border-default text-secondary hover:border-brand hover:text-primary transition"
            >
              50%
            </button>
            <button 
              type="button" 
              onClick={() => setAmount((Number(user.balance) * 0.25).toFixed(0))}
              className="py-2 text-xs rounded-lg bg-surface-elevated border border-default text-secondary hover:border-brand hover:text-primary transition"
            >
              25%
            </button>
            <button 
              type="button" 
              onClick={() => setAmount('100')}
              className="py-2 text-xs rounded-lg bg-surface-elevated border border-default text-secondary hover:border-brand hover:text-primary transition"
            >
              100 cr
            </button>
          </div>
          
          <div className="flex justify-between items-center text-sm text-muted mb-6">
            <span>USD Value: <span className="text-primary font-bold">${usdValue.toFixed(2)}</span></span>
            {solPrice > 0 && (
              <span>You receive: <span className="text-info font-bold">{solToReceive.toFixed(6)} SOL</span></span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !amount}
            className="w-full py-3 bg-info text-background font-bold rounded-lg hover:bg-info/80 transition disabled:opacity-50"
          >
            Review Withdrawal
          </button>
        </form>

        {status && (
          <div className="mt-4 p-4 bg-surface-elevated rounded-lg text-sm text-primary">
            {status}
          </div>
        )}

        <p className="text-xs text-muted mt-6 text-center">
          Minimum withdrawal: 100 credits ($1.00). Withdrawals are processed instantly.
        </p>
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-default rounded-xl p-6 max-w-sm w-full text-center">
            <h3 className="text-xl font-bold text-primary mb-4">Confirm Withdrawal</h3>
            
            <div className="bg-surface-elevated p-4 rounded-lg mb-6 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Credits to Deduct:</span>
                <span className="text-primary font-bold">{amount} cr</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">USD Value:</span>
                <span className="text-primary font-bold">${usdValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">SOL to Receive:</span>
                <span className="text-info font-bold">{solToReceive.toFixed(6)} SOL</span>
              </div>
              <div className="flex justify-between text-xs pt-2 border-t border-default mt-2">
                <span className="text-muted">Destination:</span>
                <span className="text-secondary font-mono">{user.wallet_address.slice(0,4)}...{user.wallet_address.slice(-4)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 rounded-lg border border-default text-secondary hover:bg-surface-elevated transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmWithdraw}
                className="flex-1 py-2 rounded-lg bg-brand text-background font-bold hover:bg-brand-hover transition"
              >
                Confirm & Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}