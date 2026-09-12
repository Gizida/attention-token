# Attention Token

## Safe payout rollout

1. Apply `migrations/001_offerwall_conversions.sql`, then `migrations/002_mainnet_readiness.sql` to local and Neon PostgreSQL.
2. Configure the server-only variables in `.env.example`; keep `PAYOUTS_ENABLED=false` during deployment.
3. Upgrade the Vercel project to Pro. `vercel.json` runs the payout processor and reconciler every minute using `CRON_SECRET`.
4. Restrict the Turnkey API user to the treasury private key, treasury source address, Solana transaction signing, and the System Program. Set its launch transfer ceiling to `ceilTo0.01(110 / SOL_USD)` SOL.
5. Configure two private mainnet RPC endpoints, CoinGecko, and Resend. Verify cron requests receive HTTP 200.
6. Set `PAYOUTS_ENABLED=true` and leave `AUTO_PAYOUTS_ENABLED=false`. Submit and verify a $1 admin-wallet mainnet canary.
7. After the canary reconciles to `confirmed`, set `AUTO_PAYOUTS_ENABLED=true`.

Emergency stop: set `AUTO_PAYOUTS_ENABLED=false` to require review, or `PAYOUTS_ENABLED=false` to pause processing. Never remove or refund a submitted request until reconciliation proves its Solana transaction failed or expired without landing.

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
