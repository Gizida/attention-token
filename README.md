# Attention Token

## Safe payout rollout

1. Run `npm run db:migrate` to apply the tracked migrations in order. Migrations 003 and 004 add provider accounting, settlement records, beta invitations, rate limits, and withdrawal step-up verification.
2. Configure the server-only variables in `.env.example`; keep `PAYOUTS_ENABLED=false` during deployment.
3. Use Vercel Pro. `vercel.json` runs payout processing and reconciliation every minute and Offerwall accounting reconciliation hourly using `CRON_SECRET`.
4. Restrict the Turnkey API user to the treasury private key, treasury source address, Solana transaction signing, and the System Program. Set its launch transfer ceiling to `ceilTo0.01(110 / SOL_USD)` SOL.
5. Configure two private mainnet RPC endpoints, CoinGecko, and at least one operations alert channel: Telegram or Resend. Verify cron requests receive HTTP 200.
6. Set `PAYOUTS_ENABLED=true` and leave `AUTO_PAYOUTS_ENABLED=false`. Submit and verify a $1 admin-wallet mainnet canary.
7. After the canary reconciles to `confirmed`, set `AUTO_PAYOUTS_ENABLED=true`.

Emergency stop: set `AUTO_PAYOUTS_ENABLED=false` to require review, or `PAYOUTS_ENABLED=false` to pause processing. Never remove or refund a submitted request until reconciliation proves its Solana transaction failed or expired without landing.

## Controlled rewards beta

New production accounts require a single-use invitation, an 18+ attestation, and acceptance of the current terms. Every member can issue up to two invitation links from the Affiliates page. First and risk-flagged withdrawals require a fresh wallet signature before an administrator may approve them.

Offerwall rewards mature for seven days. The signed callback controls credits and reversals; the authenticated Offerwall API supplies authoritative revenue for reconciliation. The placement must award 75 credits per USD of provider payout. Payout creation stops without reserving credits when confirmed payouts plus active reservations and fees, less cash settlements received, would exceed $250.

See `DEPLOYMENT_CHECKLIST.md` for Neon preview, Vercel, Offerwall, email, and mainnet canary steps.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
