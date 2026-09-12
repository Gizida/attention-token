'use client';

import { useCallback, useEffect, useState } from 'react';

type Stats = { totalUsers: number; totalEntitlements: number; totalEarned: number; totalWithdrawn: number; awaitingReview: number };
type AdminWithdrawal = {
  id: string; user_id: string; destination_wallet: string; credits: string; usd_amount: string;
  sol_lamports: string; status: string; quote_expires_at: string; review_reason?: string;
  tx_signature?: string; last_error?: string; created_at: string;
};

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const [statsResponse, withdrawalsResponse] = await Promise.all([
      fetch('/api/admin/stats', { cache: 'no-store' }),
      fetch('/api/admin/withdrawals', { cache: 'no-store' }),
    ]);
    if (!statsResponse.ok || !withdrawalsResponse.ok) throw new Error('Unable to load admin data');
    setStats(await statsResponse.json());
    setWithdrawals((await withdrawalsResponse.json()).withdrawals);
  }, []);

  useEffect(() => { void load().catch((error) => setMessage(error.message)); }, [load]);

  async function act(id: string, action: 'approve' | 'reject') {
    const reason = action === 'reject' ? window.prompt('Why is this request being rejected?') : null;
    if (action === 'reject' && !reason) return;
    const response = await fetch(`/api/admin/withdrawals/${id}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reason ? { reason } : {}),
    });
    const data = await response.json();
    setMessage(response.ok ? `Request ${action}d.` : data.error || `${action} failed`);
    if (response.ok) await load();
  }

  if (!stats) return <div className="text-primary">{message || 'Loading admin data…'}</div>;
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-bold text-primary">Admin overview</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Users', stats.totalUsers], ['Entitlements', `${stats.totalEntitlements.toFixed(2)} cr`],
          ['Earned', `${stats.totalEarned.toFixed(2)} cr`], ['Withdrawn', `${stats.totalWithdrawn.toFixed(2)} cr`],
          ['Awaiting review', stats.awaitingReview],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-default bg-surface p-5">
            <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-2 text-2xl font-bold text-primary">{value}</p>
          </div>
        ))}
      </div>
      {message && <p className="mt-5 text-sm text-secondary" role="status">{message}</p>}
      <section className="mt-8 rounded-[28px] border border-default bg-surface p-6">
        <h2 className="text-xl font-semibold text-primary">Withdrawal queue</h2>
        <div className="mt-5 space-y-3">
          {withdrawals.map((item) => (
            <article key={item.id} className="rounded-xl border border-default bg-surface-elevated p-4">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <p className="font-semibold text-primary">${Number(item.usd_amount).toFixed(2)} · {item.credits} cr · {item.status}</p>
                  <p className="mt-1 break-all font-mono text-xs text-muted">{item.destination_wallet}</p>
                  <p className="mt-1 text-xs text-muted">Quote expires {new Date(item.quote_expires_at).toLocaleString()}</p>
                  {item.last_error && <p className="mt-2 text-sm text-danger">{item.last_error}</p>}
                </div>
                {item.status === 'awaiting_review' && (
                  <div className="flex gap-2">
                    <button onClick={() => act(item.id, 'approve')} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-background">Approve</button>
                    <button onClick={() => act(item.id, 'reject')} className="rounded-lg border border-default px-4 py-2 text-sm text-secondary">Reject</button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
