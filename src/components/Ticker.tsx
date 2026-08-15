'use client';

import { useEffect, useState } from 'react';

export function Ticker() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTicker = async () => {
      try {
        const res = await fetch('/api/ticker', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setItems(data.ticker);
        }
      } catch (error) {
        console.error('Failed to fetch ticker data');
      } finally {
        setLoading(false);
      }
    };
    fetchTicker();
  }, []);

  if (loading || items.length === 0) {
    return null; 
  }

  // Duplicate the array so the animation loops seamlessly
  const displayItems = [...items, ...items];

  return (
    // Added overflow-hidden and relative positioning here to strictly contain the scroll
    <div className="w-full bg-surface border-b border-default py-3 overflow-hidden whitespace-nowrap relative">
      <div className="inline-block animate-ticker">
        {displayItems.map((item, index) => (
          <span key={index} className="inline-flex items-center mx-8 text-lg">
            <span className="font-mono text-secondary">
              {item.wallet_address.slice(0, 4)}...{item.wallet_address.slice(-4)}
            </span>
            <span className="mx-3 text-muted">—</span>
            <span className="font-bold text-brand">
              {Number(item.sol_amount).toFixed(4)} SOL
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}