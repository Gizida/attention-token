'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminInviteManager } from '@/components/AdminInviteManager';
import { AdminSettlementManager } from '@/components/AdminSettlementManager';
import { AdminSupportSearch } from '@/components/AdminSupportSearch';

type Stats = { totalUsers: number; totalEntitlements: number; totalEarned: number; totalWithdrawn: number; awaitingReview: number };
type Economics = { reconciledRevenueUsd: number; accruedMarginUsd: number; realizedMarginUsd: number; exposureUsd: number; availableCapacityUsd: number; reversalRate: number; conflicts: number; unreconciled: number };
type Withdrawal = { id: string; destination_wallet: string; credits: string; usd_amount: string; status: string; quote_expires_at: string; requires_step_up: boolean; step_up_verified_at?: string; risk_reasons?: string[]; last_error?: string };
type Conversion = { public_id: string; wallet_address: string; offer_name: string; credits: number; status: string; reconciliation_state: string; provider_payout_usd: number | null };

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null); const [economics, setEconomics] = useState<Economics | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]); const [conversions, setConversions] = useState<Conversion[]>([]);
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    const responses = await Promise.all(['/api/admin/stats','/api/admin/economics','/api/admin/withdrawals','/api/admin/conversions?conflicts=true'].map((url) => fetch(url,{cache:'no-store'})));
    if (responses.some((response) => !response.ok)) throw new Error('Unable to load admin data');
    const [statsData,economicsData,withdrawalData,conversionData] = await Promise.all(responses.map((response) => response.json()));
    setStats(statsData); setEconomics(economicsData); setWithdrawals(withdrawalData.withdrawals); setConversions(conversionData.conversions);
  }, []);
  useEffect(() => { void load().catch((error) => setMessage(error.message)); }, [load]);
  async function act(id:string, action:'approve'|'reject') { const reason=action==='reject'?window.prompt('Rejection reason'):null; if(action==='reject'&&!reason)return; const response=await fetch(`/api/admin/withdrawals/${id}/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(reason?{reason}:{})}); const data=await response.json(); setMessage(response.ok?`Request ${action}d.`:data.error||'Action failed'); if(response.ok)await load(); }

  if(!stats||!economics)return <div className="text-primary">{message||'Loading admin data…'}</div>;
  const cards=[['Users',stats.totalUsers],['Earned',`${stats.totalEarned.toFixed(2)} cr`],['Withdrawn',`${stats.totalWithdrawn.toFixed(2)} cr`],['Revenue',`$${economics.reconciledRevenueUsd.toFixed(2)}`],['Accrued margin',`$${economics.accruedMarginUsd.toFixed(2)}`],['Cash margin',`$${economics.realizedMarginUsd.toFixed(2)}`],['Payout exposure',`$${economics.exposureUsd.toFixed(2)}`],['Capacity left',`$${economics.availableCapacityUsd.toFixed(2)}`],['Reversal rate',`${(economics.reversalRate*100).toFixed(2)}%`],['Conflicts',economics.conflicts]];
  return <div className="mx-auto max-w-6xl pb-16"><h1 className="text-3xl font-bold text-primary">Rewards operations</h1><p className="mt-2 text-sm text-secondary">Accounting, review, reconciliation, and controlled beta access.</p>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{cards.map(([label,value])=><div key={String(label)} className="rounded-2xl border border-default bg-surface p-5"><p className="text-xs uppercase tracking-wide text-muted">{label}</p><p className="mt-2 text-2xl font-bold text-primary">{value}</p></div>)}</div>
    {message&&<p className="mt-5 text-sm text-secondary" role="status">{message}</p>}
    <AdminInviteManager />
    <section className="mt-8 rounded-2xl border border-default bg-surface p-6"><h2 className="text-xl font-semibold text-primary">Withdrawal queue</h2><div className="mt-5 space-y-3">{withdrawals.map((item)=><article key={item.id} className="rounded-xl border border-default bg-surface-elevated p-4"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div><p className="font-semibold text-primary">${Number(item.usd_amount).toFixed(2)} · {item.credits} cr · {item.status}</p><p className="mt-1 break-all font-mono text-xs text-muted">{item.destination_wallet}</p>{item.requires_step_up&&<p className={`mt-2 text-xs ${item.step_up_verified_at?'text-success':'text-warning'}`}>{item.step_up_verified_at?'Fresh wallet signature verified':'Waiting for fresh wallet signature'}</p>}{item.last_error&&<p className="mt-2 text-sm text-danger">{item.last_error}</p>}</div>{item.status==='awaiting_review'&&<div className="flex gap-2"><button disabled={item.requires_step_up&&!item.step_up_verified_at} onClick={()=>act(item.id,'approve')} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-background disabled:opacity-40">Approve</button><button onClick={()=>act(item.id,'reject')} className="rounded-lg border border-default px-4 py-2 text-sm text-secondary">Reject</button></div>}</div></article>)}</div></section>
    <AdminSettlementManager onChanged={load} />
    <AdminSupportSearch />
    <section className="mt-8 rounded-2xl border border-default bg-surface p-6"><h2 className="text-xl font-semibold text-primary">Reconciliation conflicts</h2><div className="mt-4 space-y-2">{conversions.length===0?<p className="text-sm text-muted">No conflicts.</p>:conversions.map((item)=><div key={item.public_id} className="rounded-xl bg-surface-elevated p-4 text-sm"><p className="font-medium text-primary">{item.offer_name||'Offer'} · {item.credits} credits</p><p className="mt-1 text-xs text-muted">{item.wallet_address} · {item.public_id}</p></div>)}</div></section>
  </div>;
}
