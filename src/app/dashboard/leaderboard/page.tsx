'use client';

import { useEffect, useState } from 'react';

type Leader = {
  wallet_address: string;
  total_earned: number | string;
  is_current_user: boolean;
};

const formatNumber = (value: number | string) =>
  Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch('/api/leaderboard', { cache: 'no-store' });

        if (res.ok) {
          const data = await res.json();
          setLeaders(data.leaderboard);
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const topThree = leaders.slice(0, 3);
  const remainingLeaders = leaders.slice(3);

  const podium = {
    1: {
      label: '1st',
      title: 'Gold',
      accent: '#ffffff',
      text: '#fffdf5',
      surface:
        'linear-gradient(145deg, rgba(211, 166, 53, 0.97) 0%, rgba(158, 105, 19, 0.95) 48%, rgba(91, 58, 10, 0.99) 100%)',
      glow: 'rgba(245, 193, 67, 0.18)',
      border: 'rgba(255,255,255,0.82)',
      softBorder: 'rgba(255,255,255,0.18)',
    },
    2: {
      label: '2nd',
      title: 'Silver',
      accent: '#cfd3d6',
      text: '#f4f6f7',
      surface:
        'linear-gradient(145deg, rgba(92, 102, 111, 0.96) 0%, rgba(63, 70, 77, 0.94) 48%, rgba(35, 40, 45, 0.98) 100%)',
      glow: 'rgba(212, 219, 224, 0.10)',
      border: 'rgba(195,202,208,0.82)',
      softBorder: 'rgba(195,202,208,0.16)',
    },
    3: {
      label: '3rd',
      title: 'Bronze',
      accent: '#d48648',
      text: '#fff3e9',
      surface:
        'linear-gradient(145deg, rgba(142, 75, 35, 0.97) 0%, rgba(98, 46, 22, 0.95) 48%, rgba(53, 27, 16, 0.99) 100%)',
      glow: 'rgba(212, 115, 58, 0.14)',
      border: 'rgba(214,134,72,0.86)',
      softBorder: 'rgba(214,134,72,0.18)',
    },
  } as const;

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl animate-pulse pb-16">
        <div className="h-10 w-56 rounded bg-surface-elevated" />
        <div className="mt-3 h-5 w-80 rounded bg-surface-elevated" />

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <div className="h-56 rounded-3xl bg-surface" />
          <div className="h-56 rounded-3xl bg-surface" />
          <div className="h-56 rounded-3xl bg-surface" />
        </div>

        <div className="mt-8 h-96 rounded-2xl bg-surface" />
      </div>
    );
  }

  if (leaders.length === 0) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <div className="rounded-2xl border border-default bg-surface p-10 text-center">
          <p className="text-sm font-medium text-primary">
            No earnings yet.
          </p>
          <p className="mt-2 text-sm text-secondary">
            Be the first person to take the top spot.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl pb-16">
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">
          Leaderboard
        </p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-primary md:text-5xl">
              Top earners.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-secondary">
              The people who have earned the most credits through AttentionToken.
              Keep completing offers and climb the board.
            </p>
          </div>

          <div className="text-sm text-muted">
            {leaders.length} ranked {leaders.length === 1 ? 'wallet' : 'wallets'}
          </div>
        </div>
      </header>

      {/* Top three podium */}
      <section className="grid gap-5 md:grid-cols-3 md:items-end">
        {topThree.map((leader, index) => {
          const rank = index + 1 as 1 | 2 | 3;
          const theme = podium[rank];
          const isCurrentUser = leader.is_current_user;

          return (
            <article
              key={leader.wallet_address}
              className={`group relative overflow-hidden rounded-[28px] border p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)] transition duration-300 hover:-translate-y-1 ${
                rank === 1 ? 'md:pb-8' : ''
              }`}
              style={{
                background: theme.surface,
                borderColor: isCurrentUser ? '#7cffb2' : theme.softBorder,
                boxShadow: isCurrentUser
                  ? `0 0 0 1px rgba(124,255,178,0.85), 0 24px 70px ${theme.glow}`
                  : `0 24px 70px ${theme.glow}`,
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-45"
                style={{
                  background: `
                    radial-gradient(circle at 50% -8%, ${theme.border}, transparent 42%),
                    linear-gradient(180deg, rgba(255,255,255,0.10) 0%, transparent 32%, transparent 100%)
                  `,
                }}
              />
              <div
                className="pointer-events-none absolute inset-x-10 bottom-0 h-20 rounded-full blur-3xl opacity-20"
                style={{
                  backgroundColor: theme.accent,
                }}
              />

              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p
                      className="text-[11px] font-bold uppercase tracking-[0.22em]"
                      style={{ color: theme.accent }}
                    >
                      {theme.title}
                    </p>
                    <p
                      className="mt-3 text-5xl font-black tracking-[-0.05em]"
                      style={{ color: theme.accent }}
                    >
                      {rank}
                    </p>
                  </div>

                  <span
                    className="rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]"
                    style={{
                      color: theme.text,
                      borderColor: theme.softBorder,
                      backgroundColor: 'rgba(0,0,0,0.12)',
                    }}
                  >
                    {theme.label}
                  </span>
                </div>

                <div className="mt-10">
                  <p className="font-mono text-sm tracking-tight" style={{ color: theme.text }}>
                    {leader.wallet_address}
                  </p>
                  {isCurrentUser && (
                    <p
                      className="mt-2 text-xs font-semibold"
                      style={{ color: '#7cffb2' }}
                    >
                      This is you
                    </p>
                  )}
                </div>

                <div
                  className="mt-7 flex items-end justify-between border-t pt-5"
                  style={{ borderColor: theme.softBorder }}
                >
                  <span
                    className="text-xs font-medium uppercase tracking-[0.15em]"
                    style={{ color: 'rgba(255,255,255,0.52)' }}
                  >
                    Total earned
                  </span>

                  <div className="text-right">
                    <span
                      className="text-2xl font-bold tracking-tight"
                      style={{ color: theme.text }}
                    >
                      {formatNumber(leader.total_earned)}
                    </span>
                    <span
                      className="ml-1 text-xs"
                      style={{ color: 'rgba(255,255,255,0.48)' }}
                    >
                      cr
                    </span>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* Remaining leaderboard */}
      {remainingLeaders.length > 0 && (
        <section className="mt-10 overflow-hidden rounded-t-md rounded-b-none border border-default bg-surface">
          <div className="grid grid-cols-12 gap-4 border-b border-default bg-surface-elevated px-6 py-3 text-xs uppercase tracking-[0.16em] text-muted md:px-7">
            <div className="col-span-2 md:col-span-1">Rank</div>
            <div className="col-span-6 md:col-span-7">Wallet</div>
            <div className="col-span-4 text-right">Total earned</div>
          </div>

          <div className="divide-y divide-default">
            {remainingLeaders.map((leader, index) => {
              const rank = index + 4;
              const isCurrentUser = leader.is_current_user;

              return (
                <div
                  key={leader.wallet_address}
                  className={`grid grid-cols-12 items-center gap-4 px-6 py-4 transition md:px-7 ${
                    isCurrentUser
                      ? 'bg-brand/5 ring-1 ring-inset ring-brand/70'
                      : 'hover:bg-surface-elevated'
                  }`}
                >
                  <div className="col-span-2 md:col-span-1">
                    <span className="font-mono text-sm font-semibold text-muted">
                      {String(rank).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="col-span-6 md:col-span-7">
                    <div className="font-mono text-sm text-primary">
                      {leader.wallet_address}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs font-semibold text-brand">
                          You
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="col-span-4 text-right">
                    <span className="font-semibold text-success">
                      {formatNumber(leader.total_earned)}
                    </span>
                    <span className="ml-1 text-xs text-muted">cr</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <p className="mt-6 text-center text-xs leading-5 text-muted">
        Rankings are based on total credits earned.
      </p>
    </div>
  );
}
