'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { UserContext, UserData } from '@/context/UserContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = user?.wallet_address === process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/verify', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          router.push('/');
        }
      } catch (error) {
        router.push('/');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-primary">Loading...</div>;
  }

  if (!user) return null;

  // Ensure balance is treated as a number
  const userData: UserData = {
    ...user,
    balance: Number(user.balance)
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/offers', label: 'Offers & Tasks' },
    { href: '/dashboard/withdraw', label: 'Withdraw' },
    ...(isAdmin ? [{ href: '/dashboard/admin', label: 'Admin Panel' }] : []),
  ];

    return (
    <UserContext.Provider value={userData}>
      <div className="min-h-screen flex bg-background">
        {/* SIDEBAR */}
        <aside className="sticky top-0 h-screen w-64 border-r border-default bg-surface flex flex-col p-6">
          
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
              <p className="text-xs text-muted uppercase tracking-wider mb-1">Balance</p>
              <p className="text-2xl font-bold text-brand">
                {Number(user.balance).toFixed(2)} <span className="text-sm text-secondary font-normal">credits</span>
              </p>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </UserContext.Provider>
  );
}