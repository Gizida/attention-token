import 'server-only';

import { requireServerEnv } from './server-env';

export type SolPriceQuote = { priceUsd: number; observedAt: Date };

let cachedQuote: SolPriceQuote | undefined;

export async function getSolPriceQuote(): Promise<SolPriceQuote> {
  validatePriceEnvironment();
  if (cachedQuote && Date.now() - cachedQuote.observedAt.getTime() < 30_000) return cachedQuote;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const apiUrl = process.env.COINGECKO_API_URL?.trim() || 'https://api.coingecko.com/api/v3';
    const apiKey = process.env.COINGECKO_API_KEY?.trim();
    const response = await fetch(`${apiUrl}/simple/price?ids=solana&vs_currencies=usd`, {
      cache: 'no-store',
      headers: apiKey ? { 'x-cg-demo-api-key': apiKey } : undefined,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`SOL price request failed with status ${response.status}`);
    const data = await response.json();
    const priceUsd = Number(data?.solana?.usd);
    if (!Number.isFinite(priceUsd) || priceUsd <= 0) throw new Error('SOL price response was invalid');
    cachedQuote = { priceUsd, observedAt: new Date() };
    return cachedQuote;
  } finally {
    clearTimeout(timeout);
  }
}

export function validatePriceEnvironment(): void {
  if (process.env.VERCEL_ENV === 'production') requireServerEnv('COINGECKO_API_KEY');
}
