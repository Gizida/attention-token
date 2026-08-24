'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';

export function CookieConsent() {
  const [showConsent, setShowConsent] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setShowConsent(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'true');
    setShowConsent(false);
  };

  if (!mounted || !showConsent) {
    return null; 
  }

  return createPortal(
    <div className="fixed bottom-0 inset-x-0 z-[9998] p-4 pointer-events-none">
      <div className="max-w-3xl mx-auto pointer-events-auto bg-surface border border-default rounded-xl shadow-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-secondary text-center sm:text-left">
          We use essential cookies to enable wallet login and secure your session. By using AttentionToken, you agree to our{' '}
          <Link href="/privacy" className="text-brand underline hover:text-brand-hover">
            Privacy Policy
          </Link>.
        </p>
        <button 
          onClick={handleAccept}
          className="px-4 py-2 bg-brand text-background text-xs font-bold rounded-lg hover:bg-brand-hover transition whitespace-nowrap"
        >
          Got it
        </button>
      </div>
    </div>,
    document.body
  );
}