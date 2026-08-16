'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/context/UserContext';

export default function LeaderboardPage() {
  const user = useUser();
  const [leaders, setLeaders] = useState<any[]>([]);
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
        console.error('Failed to fetch leaderboard');
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  // Helper function to apply the special themed backgrounds and text colors
  const getRowTheme = (rank: number) => {
    if (rank === 1) {
      return {
        rowClass: "border-l-2 border-amber-400 relative",
        textClass: "text-amber-400",
        // Strong gold on the left, subtle silver shimmer on the right
        style: {
          backgroundImage: `
            linear-gradient(to right, rgba(255, 215, 0, 0.3), transparent 60%),
            linear-gradient(to left, rgba(192, 192, 192, 0.15), transparent 60%)
          `
        }
      };
    }
    if (rank === 2) {
      return {
        rowClass: "bg-gradient-to-r from-slate-400/30 via-slate-400/10 to-transparent border-l-2 border-slate-400",
        textClass: "text-slate-300",
        style: {}
      };
    }
    if (rank === 3) {
      return {
        rowClass: "bg-gradient-to-r from-orange-800/30 via-orange-800/10 to-transparent border-l-2 border-orange-600",
        textClass: "text-orange-500",
        style: {}
      };
    }
    return {
      rowClass: "hover:bg-surface-elevated",
      textClass: "text-muted",
      style: {}
    };
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-primary mb-2">Top Earners</h1>
      <p className="text-secondary mb-8">Compete with other users to reach the #1 spot!</p>
      
      {/* 
        Container updated: 
        rounded-t-xl makes the top corners soft.
        rounded-b-none makes the bottom corners sharp like a table.
      */}
      <div className="bg-surface rounded-t-xl rounded-b-none border border-default overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-default bg-surface-elevated text-xs text-muted uppercase tracking-wider">
          <div className="col-span-1">Rank</div>
          <div className="col-span-7">Wallet</div>
          <div className="col-span-4 text-right">Total Earned</div>
        </div>

        {loading ? (
          <div className="p-6 text-center text-muted">Loading rankings...</div>
        ) : leaders.length === 0 ? (
          <div className="p-6 text-center text-muted">No earnings yet. Be the first!</div>
        ) : (
          <div className="divide-y divide-default">
            {leaders.map((leader, index) => {
              const rank = index + 1;
              const isCurrentUser = leader.wallet_address === user.wallet_address;
              const theme = getRowTheme(rank);
              
              return (
                <div 
                  key={leader.wallet_address} 
                  style={theme.style}
                  className={`grid grid-cols-12 gap-4 px-6 py-4 items-center transition relative ${theme.rowClass} ${isCurrentUser ? 'ring-1 ring-inset ring-brand' : ''}`}
                >
                  <div className={`col-span-1 font-bold ${theme.textClass}`}>
                    {rank}
                  </div>
                  <div className="col-span-7 font-mono text-sm text-primary">
                    {truncateAddress(leader.wallet_address)}
                    {isCurrentUser && <span className="ml-2 text-xs text-brand">(You)</span>}
                  </div>
                  <div className={`col-span-4 text-right font-bold ${rank <= 3 ? theme.textClass : 'text-success'}`}>
                    {Number(leader.total_earned).toFixed(0)} <span className="text-muted text-xs font-normal">cr</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}