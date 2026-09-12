'use client';

import { Ticker } from '@/components/Ticker';
import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { UserContext, UserContextValue, UserData } from '@/context/UserContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { connected } = useWallet();
  const isAdmin = Boolean(user?.isAdmin);

  const refreshUser = useCallback(async () => {
    const res = await fetch('/api/auth/verify', { cache: 'no-store' });
    if (!res.ok) throw new Error('Unable to refresh the account.');

    const data = await res.json();
    setUser(data.user);
  }, []);

  useEffect(() => {
    // If the user data has loaded, but the wallet is disconnected, 
    // trigger the backend logout automatically.
    if (user && !connected) {
      const autoLogout = async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch (error) {
          console.error('Auto-logout failed:', error);
        } finally {
          router.push('/');
        }
      };
      autoLogout();
    }
  }, [user, connected, router]);
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        await refreshUser();
      } catch {
        router.push('/');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [refreshUser, router]);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-primary">Loading...</div>;
  }

  if (!user) return null;

  // Ensure balance is treated as a number
  const userData: UserContextValue = {
    ...user,
    balance: Number(user.balance),
    balances: {
      available: Number(user.balances?.available ?? user.balance),
      pending: Number(user.balances?.pending ?? 0),
      reserved: Number(user.balances?.reserved ?? 0),
      total: Number(user.balances?.total ?? user.balance),
    },
    refreshUser,
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/offers', label: 'Offers & Tasks' },
    { href: '/dashboard/leaderboard', label: 'Leaderboard' },
    { href: '/dashboard/affiliates', label: 'Affiliates' },
    { href: '/dashboard/withdraw', label: 'Withdraw' },
    { href: '/dashboard/support', label: 'Support' },
    ...(isAdmin ? [{ href: '/dashboard/admin', label: 'Admin Panel' }] : []),
  ];

    return (
    <UserContext.Provider value={userData}>
      <div className="min-h-screen bg-background md:flex">
        {/* SIDEBAR */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-default bg-surface p-6 md:flex">
          
          {/* LOGO */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-brand">
              <span className="text-background font-bold">A</span>
            </div>
            <span className="font-bold text-lg text-primary">AttentionToken</span>
          </div>

          {/* WALLET CONNECTOR MOVED HERE */}
          <div className="mb-8">
            {mounted ? (
              <WalletMultiButton className="!w-full !bg-surface-elevated !border !border-default !text-primary !rounded-lg !py-2 !px-4 hover:!bg-surface !text-sm" />
            ) : (
              <div className="h-[40px] w-full rounded-lg animate-pulse bg-surface-elevated"></div>
            )}
          </div>

          {/* NAV LINKS */}
          <nav className="flex flex-col gap-2 flex-1">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className={`px-4 py-3 rounded-lg transition text-sm font-medium ${
                  pathname === link.href 
                    ? 'bg-surface-elevated text-brand' 
                    : 'text-secondary hover:text-primary hover:bg-surface-elevated'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* BALANCE IN THE CORNER */}
          <div className="mt-auto pt-6 border-t border-default">
            <div className="px-4 py-3 bg-surface-elevated rounded-lg">
              <p className="text-xs text-muted uppercase tracking-wider mb-1">Available</p>
              <p className="text-2xl font-bold text-brand">
                {Number(user.balance).toFixed(2)} <span className="text-sm text-secondary font-normal">credits</span>
              </p>
              {(userData.balances.pending > 0 || userData.balances.reserved > 0) && (
                <p className="mt-1 text-xs text-muted">
                  {userData.balances.pending.toFixed(2)} pending · {userData.balances.reserved.toFixed(2)} reserved
                </p>
              )}
            </div>
          </div>
        </aside>

        <div className="sticky top-0 z-40 border-b border-default bg-surface/95 backdrop-blur md:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand">
                <span className="font-bold text-background">A</span>
              </div>
              <span className="truncate font-bold text-primary">AttentionToken</span>
            </Link>

            {mounted ? (
              <WalletMultiButton className="!h-9 !bg-surface-elevated !px-3 !text-xs !text-primary" />
            ) : (
              <div className="h-9 w-24 animate-pulse rounded-lg bg-surface-elevated" />
            )}
          </div>

          <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition ${
                  pathname === link.href
                    ? 'bg-surface-elevated text-brand'
                    : 'text-secondary hover:bg-surface-elevated hover:text-primary'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* MAIN CONTENT AREA */}
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <Ticker />
         <div className="p-4 sm:p-6 lg:p-8">
          {children}
         </div>
        </main>
      </div>
    </UserContext.Provider>
  );
}
