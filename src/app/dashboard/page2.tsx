'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';

export default function DashboardHome() {
  const user = useUser(); // Get user from layout context
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTx = async () => {
      try {
        // cache: 'no-store' ensures we always get the latest transactions
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

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-primary mb-8">Account Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* FIXED: Linked user.balance here */}
        <div className="p-6 bg-surface rounded-lg border border-default">
          <h2 className="text-sm text-muted uppercase tracking-wider mb-2">Account Balance</h2>
          <p className="text-4xl font-bold text-brand">
            {Number(user.balance).toFixed(2)} <span className="text-lg text-secondary">credits</span>
          </p>
          <Link href="/dashboard/offers" className="mt-4 inline-block text-sm text-info hover:text-primary transition">
            Earn more →
          </Link>
        </div>
        
        <div className="p-6 bg-surface rounded-lg border border-default">
          <h2 className="text-sm text-muted uppercase tracking-wider mb-2">Connected Wallet</h2>
          <p className="text-sm text-primary font-mono break-all">{user.wallet_address}</p>
          <Link href="/dashboard/withdraw" className="mt-4 inline-block text-sm text-info hover:text-primary transition">
            Withdraw to Solana →
          </Link>
        </div>
      </div>

      {/* TRANSACTION LIST */}
      <div className="p-6 bg-surface rounded-lg border border-default">
        <h2 className="text-xl font-bold text-primary mb-4">Recent Transactions</h2>
        
        {loading ? (
          <p className="text-muted text-sm">Loading...</p>
        ) : transactions.length === 0 ? (
          <p className="text-muted text-sm">No transactions yet. Complete an offer to earn credits!</p>
        ) : (
          <div className="flex flex-col gap-2">
            {transactions.map((tx, i) => (
              <div key={i} className="flex justify-between items-center py-3 border-b border-default last:border-0">
                <div>
                  <p className="text-sm text-primary capitalize">{tx.type}</p>
                  <p className="text-xs text-muted">{new Date(tx.created_at).toLocaleString()}</p>
                  {tx.type === 'withdraw' && tx.sol_amount && (
                    <p className="text-xs text-brand">Received {Number(tx.sol_amount).toFixed(6)} SOL</p>
                  )}
                </div>
                <p className={`text-sm font-bold ${tx.type === 'earn' ? 'text-success' : 'text-danger'}`}>
                  {tx.type === 'earn' ? '+' : '-'}{Number(tx.amount).toFixed(2)} credits
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}