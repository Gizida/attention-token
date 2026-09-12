'use client';

import { useCallback, useEffect, useState } from 'react';

type Activity = {
  id: string; offerName: string; goalId: string | null; credits: number; status: string;
  availability: 'pending' | 'available' | 'reversed' | 'under_review'; availableAt: string | null; createdAt: string;
};

const labels = { pending: 'Pending', available: 'Available', reversed: 'Reversed', under_review: 'Under review' };

export function OfferActivity() {
  const [activity, setActivity] = useState<Activity[]>([]);
  const [supportUrl, setSupportUrl] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/offers/activity?page=${page}&limit=10`, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      setActivity(data.activity); setSupportUrl(data.supportUrl); setTotal(data.pagination.total);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  return (
    <section className="mt-8 rounded-2xl border border-default bg-surface p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Offer activity</p>
          <h2 className="mt-2 text-2xl font-semibold text-primary">Rewards and reversals</h2>
          <p className="mt-2 text-sm text-secondary">Confirmed rewards mature for seven days before becoming withdrawable.</p>
        </div>
        {supportUrl && <a href={supportUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand hover:underline">Open Offerwall support ↗</a>}
      </div>
      <div className="mt-5 divide-y divide-default overflow-hidden rounded-xl border border-default">
        {loading && <p className="p-5 text-sm text-muted">Loading activity…</p>}
        {!loading && activity.length === 0 && <p className="p-5 text-sm text-muted">Completed offers will appear here.</p>}
        {activity.map((item) => (
          <article key={item.id} className="flex flex-col gap-3 bg-surface-elevated p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-primary">{item.offerName}</p>
              <p className="mt-1 text-xs text-muted">Reference {item.id.slice(0, 8)} · {new Date(item.createdAt).toLocaleString()}</p>
              {item.availability === 'pending' && item.availableAt && <p className="mt-1 text-xs text-secondary">Available {new Date(item.availableAt).toLocaleString()}</p>}
            </div>
            <div className="text-left sm:text-right">
              <p className={item.status === 'reversed' ? 'font-semibold text-danger' : 'font-semibold text-success'}>
                {item.credits > 0 ? '+' : ''}{item.credits.toFixed(2)} credits
              </p>
              <p className="mt-1 text-xs text-muted">{labels[item.availability]}</p>
            </div>
          </article>
        ))}
      </div>
      {total > 10 && <div className="mt-4 flex items-center justify-end gap-2">
        <button disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-default px-3 py-2 text-xs text-secondary disabled:opacity-40">Previous</button>
        <span className="text-xs text-muted">Page {page}</span>
        <button disabled={page * 10 >= total} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-default px-3 py-2 text-xs text-secondary disabled:opacity-40">Next</button>
      </div>}
    </section>
  );
}
