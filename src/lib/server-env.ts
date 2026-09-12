import 'server-only';

export function requireServerEnv(name: string, fallback?: string): string {
  const value = process.env[name]?.trim() || fallback?.trim();
  if (!value) throw new Error(`Missing required server environment variable: ${name}`);
  return value;
}

export function envFlag(name: string, defaultValue = false): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return defaultValue;
  return value === '1' || value === 'true' || value === 'yes';
}

export function validatePayoutEnvironment(): void {
  if (!envFlag('PAYOUTS_ENABLED')) return;
  [
    'TURNKEY_ORGANIZATION_ID',
    'TURNKEY_PRIVATE_KEY_ID',
    'TURNKEY_SOLANA_PUBLIC_KEY',
    'TURNKEY_API_PUBLIC_KEY',
    'TURNKEY_API_PRIVATE_KEY',
    'SOLANA_RPC_URL',
    'CRON_SECRET',
  ].forEach((name) => requireServerEnv(name));

  if (process.env.VERCEL_ENV === 'production') {
    requireServerEnv('SOLANA_RPC_FALLBACK_URL');
  }
}

export function validateProductionEnvironment(): void {
  if (process.env.VERCEL_ENV !== 'production') return;
  [
    'DATABASE_URL',
    'JWT_SECRET',
    'AUTH_DOMAIN',
    'AUTH_ORIGIN',
    'OFFERWALL_GG_SECRET_KEY',
    'TURNKEY_ORGANIZATION_ID',
    'TURNKEY_PRIVATE_KEY_ID',
    'TURNKEY_SOLANA_PUBLIC_KEY',
    'TURNKEY_API_PUBLIC_KEY',
    'TURNKEY_API_PRIVATE_KEY',
    'SOLANA_RPC_URL',
    'SOLANA_RPC_FALLBACK_URL',
    'CRON_SECRET',
    'COINGECKO_API_KEY',
    'RESEND_API_KEY',
    'OPERATIONS_ALERT_EMAIL',
  ].forEach((name) => requireServerEnv(name));
}
