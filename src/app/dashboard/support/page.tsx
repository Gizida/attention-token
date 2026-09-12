'use client';

import { useEffect, useState } from 'react';

export default function SupportPage() {
  const [supportUrl, setSupportUrl] = useState<string | null>(null);
  useEffect(() => { void fetch('/api/offers/activity?limit=1', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then((data) => setSupportUrl(data?.supportUrl || null)); }, []);
  return <div className="mx-auto max-w-4xl pb-16">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Support</p>
    <h1 className="mt-3 text-4xl font-bold text-primary">Get the right issue resolved.</h1>
    <p className="mt-4 max-w-2xl leading-7 text-secondary">Use Offerwall support for missing or rejected offer rewards. Use Attention Token support for account balances, referrals, and SOL withdrawals.</p>
    <div className="mt-8 grid gap-5 md:grid-cols-2">
      <section className="rounded-2xl border border-default bg-surface p-6"><h2 className="text-xl font-semibold text-primary">Missing offer reward</h2><p className="mt-3 text-sm leading-6 text-secondary">Open the provider’s support screen so the team can inspect the exact click and offer record.</p>{supportUrl ? <a href={supportUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-background">Open Offerwall support</a> : <p className="mt-5 text-sm text-muted">Offerwall support is unavailable until the placement is configured.</p>}</section>
      <section className="rounded-2xl border border-default bg-surface p-6"><h2 className="text-xl font-semibold text-primary">Account or payout issue</h2><p className="mt-3 text-sm leading-6 text-secondary">Include the public reference shown in your activity or withdrawal history. Never send a seed phrase or private key.</p><a href="mailto:support@attentiontoken.net?subject=Attention%20Token%20support" className="mt-5 inline-flex rounded-xl border border-default px-4 py-3 text-sm font-semibold text-primary">Email support@attentiontoken.net</a></section>
    </div>
  </div>;
}
