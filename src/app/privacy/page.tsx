import Link from 'next/link';

export default function PrivacyPage() {
  return <main className="min-h-screen bg-background px-6 py-16 text-primary"><article className="mx-auto max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Privacy notice · 12 September 2026</p><h1 className="mt-3 text-4xl font-bold">How the beta uses data</h1><div className="mt-8 space-y-7 text-sm leading-7 text-secondary">
    <section><h2 className="text-xl font-semibold text-primary">Account data</h2><p className="mt-2">Your public Solana wallet address identifies your account. We store signed login challenges, sessions, reward entries, referrals, withdrawal records, acceptance of the current terms, and operational audit records.</p></section>
    <section><h2 className="text-xl font-semibold text-primary">Offers</h2><p className="mt-2">We send Offerwall.GG a stable internal user identifier. The provider processes device, network, country, click, and conversion information to target offers, prevent abuse, attribute rewards, and handle support claims.</p></section>
    <section><h2 className="text-xl font-semibold text-primary">Fraud prevention</h2><p className="mt-2">We temporarily store a keyed, irreversible network fingerprint for rate limiting and risk review. We do not place raw network addresses in product analytics.</p></section>
    <section><h2 className="text-xl font-semibold text-primary">Analytics and service providers</h2><p className="mt-2">We use Vercel for hosting and anonymous product analytics, Neon for PostgreSQL, Turnkey for transaction signing, private Solana RPC providers, CoinGecko for price quotes, Telegram for operator alerts, and Resend for support email sending.</p></section>
    <section><h2 className="text-xl font-semibold text-primary">Contact</h2><p className="mt-2">Privacy questions can be sent to <a className="text-brand" href="mailto:support@attentiontoken.net">support@attentiontoken.net</a>. Never send a wallet seed phrase or private key.</p></section>
  </div><Link href="/" className="mt-10 inline-flex text-sm font-semibold text-brand">← Return home</Link></article></main>;
}
