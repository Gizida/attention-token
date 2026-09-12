# Rewards beta deployment checklist

## Database

- The local database and the isolated Neon `rewards-beta` branch have migrations 000–004 applied.
- Run `npm run db:migrate` with the target `DATABASE_URL` before deploying application code.
- Use the Neon schema diff against `production` before the production cutover.
- Leave Neon production unchanged until the preview deployment passes its smoke test.

## Vercel preview

- Link the Git release branch `release/rewards-beta` to a preview deployment.
- Set its `DATABASE_URL` to the Neon `rewards-beta` branch, never the production database.
- Add all variables from `.env.example` to Preview with `PAYOUTS_ENABLED=false` and `AUTO_PAYOUTS_ENABLED=false`.
- Manually call all three cron routes with `Authorization: Bearer $CRON_SECRET`; preview cron schedules do not run automatically.
- Confirm Web Analytics and Speed Insights receive events without wallet or transaction identifiers.

## Offerwall.GG

- Set the placement currency rate to 75 credits per USD.
- Require signed wall links and allow `attentiontoken.net` plus the Vercel preview domain used for testing.
- Keep the existing signed postback URL and run the provider test callback.
- Confirm `/api/cron/offerwall/reconcile` completes and the admin economics page shows no conflicts.

## Support and alerts

- Preserve inbound forwarding for `support@attentiontoken.net`.
- Verify the domain in Resend, configure DKIM, and merge rather than duplicate SPF records.
- Configure a mail client to send as `support@attentiontoken.net` through Resend SMTP.
- Send a Telegram test alert before enabling payouts.

## Production canary

- Deploy with both payout switches disabled, then apply migrations to Neon production.
- Enable payouts for the allowlisted administrator while automatic payouts remain disabled.
- Complete one $1 mainnet withdrawal and verify the request, signed bytes, on-chain transfer, treasury log, fee, explorer link, and final reconciliation.
- Expand to 5, 20, and 50 invited users. Keep the $250 unreimbursed exposure ceiling.

## Acquisition gate

Do not buy traffic until the administrator dashboard confirms 50 beta users, 100 credited conversions, 20 confirmed payouts, 30 stable days, less than 5% reversals by value, positive realized contribution, accounting within 1%, and no incorrect or duplicate payout.
