import 'server-only';

import { getTransferSolInstruction } from '@solana-program/system';
import { createTurnkeySigner } from '@solana/keychain-turnkey';
import { address, createClient } from '@solana/kit';
import { solanaRpc } from '@solana/kit-plugin-rpc';
import { signer as signerPlugin } from '@solana/kit-plugin-signer';
import bs58 from 'bs58';

const LAMPORTS_PER_SOL = BigInt(1_000_000_000);

type PayoutClient = ReturnType<typeof createPayoutClient>;

export type SolPayoutResult = {
  signature: string;
  treasuryAddress: string;
  remainingBalanceLamports: bigint;
};

let payoutClient: PayoutClient | undefined;

function requireServerEnv(name: string, fallback?: string): string {
  const value = process.env[name]?.trim() || fallback?.trim();

  if (!value) {
    throw new Error(`Missing required server environment variable: ${name}`);
  }

  return value;
}

function normalizeTurnkeySolanaPublicKey(value: string): string {
  const hexValue = value.startsWith('0x') ? value.slice(2) : value;

  if (/^[0-9a-fA-F]{64}$/.test(hexValue)) {
    return bs58.encode(Buffer.from(hexValue, 'hex'));
  }

  return value;
}

function createPayoutClient() {
  const treasurySigner = createTurnkeySigner({
    organizationId: requireServerEnv('TURNKEY_ORGANIZATION_ID'),
    privateKeyId: requireServerEnv('TURNKEY_PRIVATE_KEY_ID'),
    publicKey: normalizeTurnkeySolanaPublicKey(
      requireServerEnv('TURNKEY_SOLANA_PUBLIC_KEY'),
    ),
    apiPublicKey: requireServerEnv('TURNKEY_API_PUBLIC_KEY'),
    apiPrivateKey: requireServerEnv('TURNKEY_API_PRIVATE_KEY'),
    apiBaseUrl: process.env.TURNKEY_API_BASE_URL?.trim() || undefined,
  });

  const rpcUrl = requireServerEnv(
    'SOLANA_RPC_URL',
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
  );
  const rpcSubscriptionsUrl = process.env.SOLANA_RPC_SUBSCRIPTIONS_URL?.trim();

  const client = createClient()
    .use(signerPlugin(treasurySigner))
    .use(
      solanaRpc({
        rpcUrl,
        ...(rpcSubscriptionsUrl ? { rpcSubscriptionsUrl } : {}),
      }),
    );

  return { client, treasurySigner };
}

function getPayoutClient(): PayoutClient {
  payoutClient ??= createPayoutClient();
  return payoutClient;
}

export function getPayoutTreasuryAddress(): string {
  return getPayoutClient().treasurySigner.address;
}

export async function isPayoutSignerAvailable(): Promise<boolean> {
  return getPayoutClient().treasurySigner.isAvailable();
}

export async function sendSolPayout(input: {
  recipientAddress: string;
  lamports: bigint;
}): Promise<SolPayoutResult> {
  if (input.lamports <= BigInt(0)) {
    throw new Error('Payout amount must be greater than zero lamports');
  }

  const recipientAddress = address(input.recipientAddress);
  const { client, treasurySigner } = getPayoutClient();
  const transferInstruction = getTransferSolInstruction({
    source: treasurySigner,
    destination: recipientAddress,
    amount: input.lamports,
  });

  const result = await client.sendTransaction([transferInstruction]);
  const balance = await client.rpc
    .getBalance(treasurySigner.address, { commitment: 'confirmed' })
    .send();

  return {
    signature: result.context.signature,
    treasuryAddress: treasurySigner.address,
    remainingBalanceLamports: balance.value,
  };
}

export function lamportsToSol(lamports: bigint): number {
  return Number(lamports) / Number(LAMPORTS_PER_SOL);
}
