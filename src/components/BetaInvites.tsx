'use client';

import { useEffect, useState } from 'react';

type Invite = { id: string; code?: string; redeemed_at?: string | null; revoked_at?: string | null; expires_at: string };

export function BetaInvites({ referralCode }: { referralCode: string }) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [newCodes, setNewCodes] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  async function load() {
    const response = await fetch('/api/invites', { cache: 'no-store' });
    if (response.ok) setInvites((await response.json()).invites);
  }
  useEffect(() => { void load(); }, []);
  async function create() {
    const response = await fetch('/api/invites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ count: 1 }) });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || 'Unable to create invitation');
    const codes = data.invites.map((invite: Invite) => invite.code);
    setNewCodes(codes); setMessage('Copy this code now. For security, it is shown only once.'); await load();
  }
  async function copy(code: string) {
    const link = `${window.location.origin}/?invite=${encodeURIComponent(code)}&ref=${encodeURIComponent(referralCode)}`;
    await navigator.clipboard.writeText(link); setMessage('Invitation link copied.');
  }
  const activeCount = invites.filter((invite) => !invite.revoked_at).length;
  return <section className="mt-8 rounded-2xl border border-default bg-surface p-7">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Controlled beta</p>
    <h2 className="mt-2 text-2xl font-semibold text-primary">Your beta invitations</h2>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-secondary">You can issue up to two single-use invitations. A referral is attributed only after the invited wallet creates its account.</p>
    <button onClick={create} disabled={activeCount >= 2} className="mt-5 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-background disabled:opacity-40">Create invitation</button>
    {newCodes.map((code) => <div key={code} className="mt-4 flex flex-col gap-2 rounded-xl border border-brand/20 bg-brand/5 p-4 sm:flex-row sm:items-center sm:justify-between"><code className="text-sm text-primary">{code}</code><button onClick={() => copy(code)} className="text-sm font-semibold text-brand">Copy invite link</button></div>)}
    {message && <p className="mt-3 text-sm text-secondary" role="status">{message}</p>}
    <p className="mt-4 text-xs text-muted">{activeCount} of 2 invitations issued.</p>
  </section>;
}
