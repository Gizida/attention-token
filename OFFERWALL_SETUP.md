# Offerwall.gg setup

## Placement

- Public key: `05985907f4dd93999df0455beb337ae5`
- Colour scheme: Dark
- Accent: `#7CFFB2`
- Page background: `#0B0D10`
- Card background: `#111419`
- Card border: `#252A32`
- Primary text: `#F1F3F5`
- Currency name: `Credits`
- Heading: `Earn Credits`

Set the production currency rate deliberately. AttentionToken values 100 credits at $1.00, so awarding 100 credits per publisher dollar leaves no room for referral rewards, transfer costs, or reversals. A starting rate of 70–75 credits per publisher dollar preserves a buffer.

## Security

1. Add the placement secret as `OFFERWALL_GG_SECRET_KEY` in the production environment.
2. Keep `OFFERWALL_GG_PUBLIC_KEY` set to the public key above.
3. Turn on **Require signature** for the placement.
4. Add `attentiontoken.net` to the placement's allowed domains before taking real traffic.
5. Leave `OFFERWALL_GG_EXPIRING_LINKS=false` unless expiring links are also enabled in Offerwall.gg.

The offers page requests a signed wall URL from `/api/offerwall/session`. The secret never reaches browser code.

## Postback

- URL: `https://attentiontoken.net/api/offerwall/postback`
- Method: `POST`
- Body type: `application/x-www-form-urlencoded`

The endpoint accepts Offerwall.gg's standard fields, verifies the HMAC signature, ignores tests and duplicates, records credits and reversals, updates referral commissions, and returns `OK` only after the database transaction commits.

Apply `migrations/001_offerwall_conversions.sql` to every deployed database before enabling the placement.

Use the placement's test-postback button before enabling live traffic. A valid test should receive `200 OK` without changing a user's balance. Then change one signed field and verify that the endpoint responds with `403 FORBIDDEN`.
