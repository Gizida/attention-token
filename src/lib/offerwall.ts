import 'server-only';

import { createHmac, timingSafeEqual } from 'crypto';

const OFFERWALL_BASE_URL = 'https://offerwall.gg';

export type OfferwallSession = {
  mode: 'live' | 'preview';
  url: string;
};

function getPublicKey() {
  return process.env.OFFERWALL_GG_PUBLIC_KEY?.trim() ?? '';
}

function getSecretKey() {
  return process.env.OFFERWALL_GG_SECRET_KEY?.trim() ?? '';
}

export function createOfferwallSession(userId: number): OfferwallSession {
  const publicKey = getPublicKey();
  const secretKey = getSecretKey();

  if (!publicKey) {
    throw new Error('OFFERWALL_GG_PUBLIC_KEY is not configured.');
  }

  const wallUrl = new URL(`/wall/${encodeURIComponent(publicKey)}`, OFFERWALL_BASE_URL);

  if (!secretKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('OFFERWALL_GG_SECRET_KEY is not configured.');
    }

    return { mode: 'preview', url: wallUrl.toString() };
  }

  const signedParams = new URLSearchParams({
    appId: publicKey,
    userId: String(userId),
  });

  if (process.env.OFFERWALL_GG_EXPIRING_LINKS === 'true') {
    signedParams.set('ts', String(Math.floor(Date.now() / 1000)));
  }

  signedParams.sort();

  const signature = createHmac('sha256', secretKey)
    .update(signedParams.toString())
    .digest('hex');

  wallUrl.searchParams.set('userId', String(userId));
  const timestamp = signedParams.get('ts');
  if (timestamp) wallUrl.searchParams.set('ts', timestamp);
  wallUrl.searchParams.set('signature', signature);

  return { mode: 'live', url: wallUrl.toString() };
}

export function verifyOfferwallPostbackSignature(
  userId: string,
  transactionId: string,
  currencyAmount: string,
  signature: string,
) {
  const secretKey = getSecretKey();
  if (!secretKey || !/^[a-f0-9]{64}$/i.test(signature)) return false;

  const expected = createHmac('sha256', secretKey)
    .update(`${userId}:${transactionId}:${currencyAmount}`)
    .digest();
  const received = Buffer.from(signature, 'hex');

  return received.length === expected.length && timingSafeEqual(received, expected);
}
