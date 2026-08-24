"use client";

import { useEffect, useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

function LogoMark() {
  return (
    <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-brand/30 bg-brand shadow-[0_8px_26px_rgba(124,245,170,0.16)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.7),transparent_30%)]" />
      <span className="relative text-sm font-black tracking-[-0.08em] text-background">
        AT
      </span>
    </div>
  );
}

export function LandingHeader({ visible }: { visible: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!visible) setSettled(false);
  }, [visible]);

  return (
    <header
      aria-hidden={!visible}
      className={[
        "fixed inset-x-0 top-0 z-40 bg-[#070a0f]/45 shadow-[0_12px_32px_rgba(0,0,0,0.16)]",
        "backdrop-blur-sm backdrop-saturate-125 [-webkit-backdrop-filter:blur(8px)_saturate(125%)]",
        "after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-12 after:content-['']",
        "after:bg-gradient-to-b after:from-[#070a0f]/25 after:via-[#070a0f]/10 after:to-transparent after:backdrop-blur-[4px]",
        "transition-[opacity,transform] duration-700 ease-out",
        visible
          ? settled
            ? "pointer-events-auto opacity-100 transform-none"
            : "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-2 opacity-0",
      ].join(" ")}
      onTransitionEnd={(event) => {
        if (visible && event.propertyName === "transform") setSettled(true);
      }}
    >
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <a href="#" className="flex items-center gap-3" tabIndex={visible ? 0 : -1}>
          <LogoMark />
          <div>
            <div className="text-[15px] font-bold tracking-[-0.02em] text-primary">
              AttentionToken
            </div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted">
              Earn attention
            </div>
          </div>
        </a>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-4 sm:flex">
            <a href="#" className="text-muted transition hover:text-primary" aria-label="Telegram" tabIndex={visible ? 0 : -1}>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.174-.18 3.073-2.817 3.151-3.056.008-.028.012-.13-.05-.184-.06-.055-.148-.036-.212-.022-.09.022-1.508.96-4.246 2.81-.402.276-.767.41-1.093.4-.36-.01-1.054-.203-1.568-.372-.63-.205-1.13-.313-1.088-.662.023-.18.27-.364.743-.558 2.92-1.273 4.864-2.113 5.832-2.52 2.77-1.153 3.35-1.355 3.73-1.362z" /></svg>
            </a>
            <a href="#" className="text-muted transition hover:text-primary" aria-label="Twitter" tabIndex={visible ? 0 : -1}>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            </a>
            <a href="#" className="text-muted transition hover:text-primary" aria-label="GitHub" tabIndex={visible ? 0 : -1}>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" clipRule="evenodd" d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" /></svg>
            </a>
          </div>

          <div className="wallet-cta-header w-fit">
            {mounted ? (
              <WalletMultiButton />
            ) : (
              <div className="h-9 w-24 animate-pulse rounded-lg bg-surface-elevated" />
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
