'use client';

import { useEffect, useState } from 'react';

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState('');
  
  // Treasury logging state
  const [txType, setTxType] = useState('replenish');
  const [fromWallet, setFromWallet] = useState('');
  const [toWallet, setToWallet] = useState('');
  const [amount, setAmount] = useState('');
  const [signature, setSignature] = useState('');
  const [logStatus, setLogStatus] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      const res = await fetch('/api/admin/stats', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setStats(data);
      else setError(data.error);
    };
    fetchStats();
  }, []);

  const handleLogTreasury = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogStatus('Logging...');
    try {
      const res = await fetch('/api/admin/log-treasury', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: txType,
          fromWallet,
          toWallet,
          amountToken: amount,
          txSignature: signature
        })
      });
      const data = await res.json();
      if (res.ok) {
        setLogStatus(`Success! Recorded at swap rate of $${data.swapRate}. Fee: ${data.networkFee} SOL.`);
        setAmount(''); setSignature(''); setFromWallet(''); setToWallet('');
      } else {
        setLogStatus(data.error || 'Failed to log.');
      }
    } catch (err) {
      setLogStatus('Network error.');
    }
  };

  if (error) return <div className="text-danger text-xl">{error}</div>;
  if (!stats) return <div className="text-primary">Loading admin data...</div>;

  const statCards = [
    { label: 'Total Users', value: stats.totalusers, color: 'text-info' },
    { label: 'Total Credit Entitlements', value: `${Number(stats.totalentitlements).toFixed(2)} cr`, color: 'text-brand' },
    { label: 'Total Earned (All Time)', value: `${Number(stats.totalearned).toFixed(2)} cr`, color: 'text-success' },
    { label: 'Total Withdrawn (All Time)', value: `${Number(stats.totalwithdrawn).toFixed(2)} cr`, color: 'text-warning' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-primary mb-8">Admin Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {statCards.map((stat, i) => (
          <div key={i} className="p-6 bg-surface rounded-lg border border-default">
            <h2 className="text-sm text-muted uppercase tracking-wider mb-2">{stat.label}</h2>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>
      
      {/* TREASURY LOGGING FORM */}
      <div className="p-6 bg-surface rounded-lg border border-default mb-10">
        <h2 className="text-xl font-bold text-primary mb-4">Log Treasury Movement</h2>
        <p className="text-xs text-muted mb-6">Record manual replenishments or swaps to keep financial logs accurate. Swap rate is fetched live.</p>
        
        <form onSubmit={handleLogTreasury} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select 
              value={txType} 
              onChange={(e) => setTxType(e.target.value)}
              className="bg-surface-elevated text-primary px-4 py-2 rounded-lg border border-default focus:outline-none focus:border-brand"
            >
              <option value="replenish">Replenish (Cold to Hot)</option>
              <option value="swap_usdc_to_sol">Swap (USDC to SOL)</option>
            </select>

            <input
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount (in SOL)"
              required
              className="bg-surface-elevated text-primary px-4 py-2 rounded-lg border border-default focus:outline-none focus:border-brand"
            />
          </div>

          <input
            type="text"
            value={fromWallet}
            onChange={(e) => setFromWallet(e.target.value)}
            placeholder="From Wallet Address"
            required
            className="bg-surface-elevated text-primary px-4 py-2 rounded-lg border border-default focus:outline-none focus:border-brand"
          />
          
          <input
            type="text"
            value={toWallet}
            onChange={(e) => setToWallet(e.target.value)}
            placeholder="To Wallet Address"
            required
            className="bg-surface-elevated text-primary px-4 py-2 rounded-lg border border-default focus:outline-none focus:border-brand"
          />

          <input
            type="text"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Solana Transaction Signature"
            required
            className="bg-surface-elevated text-primary px-4 py-2 rounded-lg border border-default focus:outline-none focus:border-brand"
          />

          <button
            type="submit"
            className="bg-info text-background font-bold py-2 px-4 rounded-lg hover:bg-info/80 transition"
          >
            Log Transaction
          </button>
        </form>

        {logStatus && (
          <div className="mt-4 p-4 bg-surface-elevated rounded-lg text-sm text-primary">
            {logStatus}
          </div>
        )}
      </div>
    </div>
  );
}