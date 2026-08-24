"use client";

import { CookieConsent } from './CookieConsent';
import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { BackgroundBeams } from "./BackgroundBeams";

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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="section-eyebrow inline-flex items-center gap-2 text-[11px] font-semibold uppercase text-brand/80">
      <span className="h-px w-6 bg-brand/50" />
      {children}
    </div>
  );
}

export function LandingContent() {
  const { connected, publicKey } = useWallet();
  const { authenticate } = useWalletAuth();
  const router = useRouter();
  const [stats, setStats] = useState<{ totalSol: string; recentWallet: string | null; recentAmount: string | null }>({
    totalSol: "0.0000",
    recentWallet: null,
    recentAmount: null
  });

  // Fetch public stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/public-stats', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch public stats');
      }
    };
    fetchStats();
  }, []);
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState("");
  const hasAttemptedAuth = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (connected && publicKey && !hasAttemptedAuth.current) {
      hasAttemptedAuth.current = true;

      const handleAuth = async () => {
        try {
          setStatus("Please sign the message in your wallet...");

          const urlParams = new URLSearchParams(window.location.search);
          const urlRef = urlParams.get('ref');

          if (urlRef) {
            localStorage.setItem('refCode', urlRef);
          }

          const localRef = localStorage.getItem('refCode');
          const refCode: string | undefined = (urlRef || localRef || undefined) as string | undefined;

          await authenticate(refCode);

          setStatus("Success! Redirecting to offers...");
          router.push("/dashboard/offers");
        } catch (err) {
          setStatus("Authentication failed or rejected. Please try again.");
          hasAttemptedAuth.current = false;
          console.error(err);
        }
      };

      handleAuth();
    }
  }, [connected, publicKey, authenticate, router]);

  // The wallet adapter emits the same trigger class everywhere.
  // These wrappers let globals.css give the header and page CTAs different treatments.
  const WalletCTA = ({
    variant = "page",
    fullWidth = false,
  }: {
    variant?: "page" | "header";
    fullWidth?: boolean;
  }) => {
    const wrapperClass =
      variant === "header"
        ? "wallet-cta-header w-fit"
        : `wallet-cta-page ${fullWidth ? "w-full" : "w-fit"}`;

    return (
      <div className={wrapperClass}>
        {mounted ? (
          <WalletMultiButton />
        ) : (
          <div
            className={[
              "animate-pulse rounded-xl bg-surface-elevated",
              variant === "header"
                ? "h-9 w-28"
                : fullWidth
                  ? "h-14 w-full"
                  : "h-14 w-48",
            ].join(" ")}
          />
        )}
      </div>
    );
  };

    return (
    // Removed overflow-x-hidden from here so it doesn't break the fixed header
    <div className="landing-shell min-h-screen bg-background text-primary">
      <div className="pointer-events-none fixed inset-0 -z-10 site-grid opacity-70" />
      
            {/* Hero */}
      <main className="pt-[64px]">
        <section className="hero-section relative mx-auto max-w-7xl px-5 pb-24 pt-16 sm:px-8 sm:pt-24 lg:pb-28 lg:pt-28">
          <div className="absolute left-1/2 top-0 -z-10 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-white/[0.018] blur-3xl" />
          <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-0 overflow-hidden" />
          <BackgroundBeams className="z-[1] opacity-80" />

          {/* Main Hero Text - Now takes up the full width space */}
          <div className="relative z-10 max-w-4xl lg:ml-[3%] lg:-translate-y-6">
            <h1 className="hero-word text-6xl font-semibold leading-[0.91] text-primary sm:text-7xl lg:text-[104px]">
              Your time has{" "}
              <span className="hero-gem">
                value.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-7 text-secondary sm:text-lg">
              Complete offers, answer surveys, watch sponsored content, and
              turn your attention into credits you can redeem for SOL or the
              AttentionToken ecosystem.
            </p>

            <div className="mt-11 flex flex-col gap-3 sm:flex-row sm:items-center">
              <WalletCTA variant="page" />
              <a
                href="#how-it-works"
                className="inline-flex h-12 items-center rounded-xl border border-transparent px-5 text-sm font-semibold text-secondary transition hover:bg-white/[0.08] hover:text-primary"
              >
                See how it works
              </a>
            </div>
          </div>

          {/* Bottom Stats Bar: Indicators on left, Live Stats on right */}
          <div className="relative z-10 mt-16 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            
            {/* Left side: Indicators */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                Solana-native
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                Wallet-based account
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                Earn on your schedule
              </span>
            </div>

            {/* Right side: Platform Stats (Numbers above Titles) */}
            <div className="flex gap-8 sm:gap-12">
              <div className="flex flex-col gap-1">
                {stats.recentWallet ? (
                  <span className="text-base font-bold text-primary font-mono">
                    {stats.recentWallet.slice(0, 4)}...{stats.recentWallet.slice(-4)} redeemed {stats.recentAmount} SOL
                  </span>
                ) : (
                  <span className="text-base font-bold text-muted font-mono">Awaiting first withdrawal...</span>
                )}
                <span className="text-xs text-muted uppercase tracking-wider">
                  Most recent
                </span>
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="text-base font-bold text-brand font-mono">
                  {stats.totalSol} SOL
                </span>
                <span className="text-xs text-muted uppercase tracking-wider">
                  Awarded so far
                </span>
              </div>
            </div>

          </div>
        </section>

        {/* Value strip */}
        <section className="border-y border-white/[0.05] bg-white/[0.015]">
          <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-white/[0.06] px-5 sm:px-8 md:grid-cols-3 md:divide-x md:divide-y-0">
            {[
              ["01", "Complete", "Choose from surveys, offers, videos, and other tasks."],
              ["02", "Earn", "Your completed activity is converted into platform credits."],
              ["03", "Redeem", "Use your balance toward SOL or ecosystem rewards."],
            ].map(([number, title, description]) => (
              <div key={number} className="px-0 py-9 md:px-8 md:py-10">
                <div className="flex items-start gap-4">
                  <span className="pt-0.5 text-xs font-semibold text-brand/70">
                    {number}
                  </span>
                  <div>
                    <div className="font-semibold">{title}</div>
                    <p className="mt-1 text-sm leading-6 text-secondary">{description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-32 sm:px-8 lg:py-36">
          <div className="max-w-2xl">
            <SectionLabel>Simple by design</SectionLabel>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
              A cleaner way to monetize the time you already spend online.
            </h2>
            <p className="mt-7 text-base leading-7 text-secondary">
              No complicated account setup. Your Solana wallet is the gateway
              to your account, activity, and eventual withdrawals.
            </p>
          </div>

          <div className="mt-16 grid gap-5 md:grid-cols-3">
            {[
              {
                title: "Connect your wallet",
                text: "Use your Solana wallet to create and authenticate your account.",
                icon: "01",
              },
              {
                title: "Pick what you want to do",
                text: "Browse available tasks and complete the ones that fit your time and interests.",
                icon: "02",
              },
              {
                title: "Turn credits into value",
                text: "Build your balance and redeem it for SOL or the platform's token ecosystem.",
                icon: "03",
              },
            ].map((step) => (
              <div
                key={step.icon}
                className="group rounded-2xl border border-white/[0.07] bg-surface p-6 transition duration-300 hover:-translate-y-1 hover:border-brand/20 hover:bg-surface-elevated"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-brand">{step.icon}</span>
                  <span className="h-8 w-8 rounded-full border border-white/[0.07] bg-white/[0.02]" />
                </div>
                <h3 className="mt-12 text-xl font-semibold tracking-[-0.025em]">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-secondary">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Rewards */}
        <section id="rewards" className="border-y border-white/[0.05] bg-[#080c12]">
          <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 py-32 sm:px-8 lg:grid-cols-[0.84fr_1.16fr] lg:gap-20 lg:py-36">
            <div>
              <SectionLabel>Your attention, your choice</SectionLabel>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Earn in credits. Redeem in crypto.
              </h2>
              <p className="mt-7 max-w-lg text-base leading-7 text-secondary">
                Keep the earning experience simple on the front end while
                keeping redemption flexible on the back end.
              </p>

              <div className="mt-10 flex items-center gap-3 text-sm">
                <div className="rounded-xl border border-white/[0.07] bg-surface px-4 py-3 font-semibold">
                  Credits
                </div>
                <span className="text-brand">→</span>
                <div className="rounded-xl border border-brand/20 bg-brand/[0.06] px-4 py-3 font-semibold text-brand">
                  SOL
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-surface px-4 py-3 font-semibold">
                  Token
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Surveys",
                  text: "Share opinions and complete research tasks in exchange for rewards.",
                  tag: "Quick tasks",
                },
                {
                  title: "Offerwalls",
                  text: "Explore sponsored offers and longer-form opportunities when they make sense.",
                  tag: "Higher value",
                },
                {
                  title: "Sponsored video",
                  text: "Watch eligible content and earn from attention that would otherwise go uncompensated.",
                  tag: "Passive",
                },
                {
                  title: "Platform rewards",
                  text: "Use your credits toward SOL or future ecosystem-native rewards.",
                  tag: "On-chain",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/[0.07] bg-surface p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold">{item.title}</h3>
                    <span className="rounded-full bg-white/[0.035] px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-muted">
                      {item.tag}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-secondary">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why */}
        <section
          id="why-attention"
          className="paper-editorial relative mb-24 overflow-hidden border-y border-[#d7d3c9] bg-[#f3f1eb] text-[#17191d] sm:mb-28 lg:mb-36"
        >
          <div className="paper-grid pointer-events-none absolute inset-0" />
          <div className="paper-texture pointer-events-none absolute inset-0 opacity-70" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/80" />

          <div className="relative mx-auto max-w-7xl px-5 py-28 sm:px-8 sm:py-32 lg:py-40">
            <div className="max-w-3xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#657069]">
                Built for the long term
              </div>
              <h2 className="mt-6 max-w-2xl text-4xl font-semibold leading-[1.0] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
                Make the reward flow feel like a product, not a gimmick.
              </h2>
            </div>

            <div className="mt-20 lg:mt-24">
              {[
                {
                  number: "01",
                  title: "Wallet-first",
                  text: "A Solana wallet is all you need. A simple signature gets you started and keeps your account tied to you.",
                },
                {
                  number: "02",
                  title: "Flexible",
                  text: "Pick your favorite from a variety of tasks, surveys, offers, and other ways to put your attention to work.",
                },
                {
                  number: "03",
                  title: "Transparent",
                  text: "Our clean interface makes the exact value of your activity and every transaction easy to understand.",
                },
                {
                  number: "04",
                  title: "Solana-native",
                  text: "Fast, low-cost on-chain settlement gives the reward layer a natural home on Solana.",
                },
              ].map((item) => (
                <div
                  key={item.number}
                  className="group grid gap-4 py-9 sm:grid-cols-[42px_minmax(0,1fr)] sm:gap-5 lg:grid-cols-[48px_auto_minmax(36px,1fr)_300px] lg:items-center lg:gap-x-6 lg:py-11"
                >
                  <div className="text-[11px] font-semibold tracking-[0.14em] text-[#59c987]">
                    {item.number}
                  </div>

                  <h3 className="max-w-[330px] text-[34px] font-bold leading-[0.88] tracking-[-0.055em] sm:text-[40px] lg:text-[45px]">
                    {item.title}
                  </h3>

                  <div className="hidden h-px w-full bg-[#b9b6af] lg:block" />

                  <p className="max-w-[280px] text-[15px] leading-[1.45] text-[#666970] lg:text-[15px]">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-5 pb-32 sm:px-8 lg:pb-36">
          <div className="glow-brand relative mx-auto max-w-5xl overflow-hidden rounded-[28px] border border-white/[0.08] 
           bg-[#0d1219] px-6 py-16 text-center sm:px-10 sm:py-20">
            <div className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-brand/20 to-transparent" />
            <div className="pointer-events-none absolute bottom-0 left-1/2 h-40 w-2/3 -translate-x-1/2 bg-brand/[0.035] blur-3xl" />
            <div className="relative">
              <SectionLabel>Start earning</SectionLabel>
              <h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
                Put your attention to work.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-secondary sm:text-base">
                Connect your Solana wallet and enter the platform. Your next
                reward can start with a few minutes.
              </p>
              <div className="mx-auto mt-8 max-w-xs">
                <WalletCTA variant="page" fullWidth />
              </div>
              <p className="mt-4 text-xs text-muted">
                No password required. Sign with your wallet to continue.
              </p>
            </div>
          </div>
        </section>
      </main>
            
      {/* Footer */}
      <footer className="border-t border-white/[0.05] bg-background">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
          {/* Using flex to push brand to the left, and link columns to the right */}
          <div className="flex flex-col md:flex-row justify-between gap-12">
            
            {/* Left side: Brand */}
            <div className="flex flex-col gap-4 max-w-xs">
              <div className="flex items-center gap-3">
                <LogoMark />
                <div>
                  <div className="text-sm font-semibold text-primary">AttentionToken</div>
                  <div className="text-xs text-muted">Turn attention into on-chain value.</div>
                </div>
              </div>
              <p className="text-xs text-muted">
                The Web3 rewards platform that pays you for your time.
              </p>
            </div>

            <div className="w-full max-w-xs">
              <div className="text-sm font-semibold text-primary">Need help?</div>
              <p className="mt-2 text-sm leading-6 text-secondary">
                Questions about offers, withdrawals, or your account? We are here to help.
              </p>
              <a
                href="mailto:support@attentiontoken.net"
                className="mt-4 inline-flex text-sm font-semibold text-brand transition hover:text-brand-hover"
              >
                Contact support →
              </a>
            </div>

            {/* Right side: Columns grouped together */}
            <div className="grid grid-cols-2 gap-8 md:gap-16">
              
              {/* Column 1: Policies */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-secondary mb-1">Policies</h4>
                <a href="/terms" className="text-sm text-muted hover:text-primary transition w-fit">Terms of Service</a>
                <a href="/privacy" className="text-sm text-muted hover:text-primary transition w-fit">Privacy Policy</a>
                <a href="/cookies" className="text-sm text-muted hover:text-primary transition w-fit">Cookie Policy</a>
              </div>

              {/* Column 2: Elsewhere (with icons) */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-secondary mb-1">Elsewhere</h4>
                <a href="#" className="flex items-center gap-1.5 text-sm text-muted hover:text-primary transition w-fit">
                  Telegram
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
                <a href="#" className="flex items-center gap-1.5 text-sm text-muted hover:text-primary transition w-fit">
                  Twitter
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
                <a href="#" className="flex items-center gap-1.5 text-sm text-muted hover:text-primary transition w-fit">
                  Github
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              </div>

            </div>
          </div>
          
          {/* Copyright Bar */}
          <div className="mt-12">
            <p className="text-xs text-muted text-center md:text-left">
              © {new Date().getFullYear()} AttentionToken. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Cookie Consent Bar */}
      <CookieConsent />

      {/* 
        TOAST PORTAL: 
        Using createPortal to teleport the toast to the <body> tag.
        This escapes the CSS transform on the parent wrapper, making fixed positioning work properly!
      */}
      {typeof document !== "undefined" && status && createPortal(
        <div 
          className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-3 rounded-lg shadow-lg z-[9999]" 
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-default)' }}
        >
          <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
          <p className="text-sm text-primary">{status}</p>
        </div>,
        document.body
      )}
    </div>
  );
}
