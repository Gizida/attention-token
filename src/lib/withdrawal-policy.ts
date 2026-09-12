export const CREDITS_PER_USD = 100;
export const MIN_WITHDRAWAL_CREDITS = 100;
export const AUTO_DAILY_USER_CREDITS = 2_500;
export const MAX_WITHDRAWAL_CREDITS = 10_000;
export const PLATFORM_DAILY_CREDITS = 10_000;
export const QUOTE_TTL_MS = 15 * 60 * 1_000;
export const EARNING_MATURITY_DAYS = 7;
const PRICE_SCALE = 100_000_000n;

function priceToScaledUnits(solPriceUsd: number): bigint {
  if (!Number.isFinite(solPriceUsd) || solPriceUsd <= 0) throw new Error('SOL price must be positive');
  return BigInt(solPriceUsd.toFixed(8).replace('.', ''));
}

export function creditsToUsd(credits: number): number {
  return credits / CREDITS_PER_USD;
}

export function creditsToLamports(credits: number, solPriceUsd: number): bigint {
  if (!Number.isFinite(credits) || credits <= 0) throw new Error('Credits must be positive');
  const priceUnits = priceToScaledUnits(solPriceUsd);
  return BigInt(Math.trunc(credits)) * 1_000_000_000n * PRICE_SCALE
    / (BigInt(CREDITS_PER_USD) * priceUnits);
}

export function calculateTurnkeyPolicySolCeiling(solPriceUsd: number): number {
  const priceUnits = priceToScaledUnits(solPriceUsd);
  const ceilingInHundredths = (110n * 100n * PRICE_SCALE + priceUnits - 1n) / priceUnits;
  return Number(ceilingInHundredths) / 100;
}

export function validateWithdrawalCredits(value: unknown): number {
  const credits = Number(value);
  if (!Number.isSafeInteger(credits)) throw new Error('Withdrawal credits must be a whole number');
  if (credits < MIN_WITHDRAWAL_CREDITS) throw new Error('Minimum withdrawal is 100 credits ($1.00)');
  if (credits > MAX_WITHDRAWAL_CREDITS) throw new Error('Maximum withdrawal is 10,000 credits ($100.00)');
  return credits;
}
