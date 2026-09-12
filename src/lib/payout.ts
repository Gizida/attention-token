import 'server-only';

import { getTransferSolInstruction } from '@solana-program/system';
import { createTurnkeySigner } from '@solana/keychain-turnkey';
import { address, createClient } from '@solana/kit';
import { solanaRpc } from '@solana/kit-plugin-rpc';
import { signer as signerPlugin } from '@solana/kit-plugin-signer';
import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

import { requireServerEnv, validatePayoutEnvironment } from './server-env';

const LAMPORTS_PER_SOL = 1_000_000_000n;

type PayoutClient = ReturnType<typeof createPayoutClient>;

export type PreparedSolPayout = {
  signedTransactionBase64: string;
  signature: string;
  treasuryAddress: string;
  recentBlockhash: string;
  lastValidBlockHeight: bigint;
};

export type PayoutObservation = {
  confirmed: boolean;
  failed: boolean;
  absentEverywhere: boolean;
  currentBlockHeight: bigint;
  networkFeeLamports?: bigint;
  error?: string;
};

let payoutClient: PayoutClient | undefined;

function normalizeTurnkeySolanaPublicKey(value: string): string {
  const hexValue = value.startsWith('0x') ? value.slice(2) : value;
  return /^[0-9a-fA-F]{64}$/.test(hexValue)
    ? bs58.encode(Buffer.from(hexValue, 'hex'))
    : value;
}

function createPayoutClient() {
  validatePayoutEnvironment();
  const treasurySigner = createTurnkeySigner({
    organizationId: requireServerEnv('TURNKEY_ORGANIZATION_ID'),
    privateKeyId: requireServerEnv('TURNKEY_PRIVATE_KEY_ID'),
    publicKey: normalizeTurnkeySolanaPublicKey(requireServerEnv('TURNKEY_SOLANA_PUBLIC_KEY')),
    apiPublicKey: requireServerEnv('TURNKEY_API_PUBLIC_KEY'),
    apiPrivateKey: requireServerEnv('TURNKEY_API_PRIVATE_KEY'),
    apiBaseUrl: process.env.TURNKEY_API_BASE_URL?.trim() || undefined,
  });
  const rpcUrl = requireServerEnv('SOLANA_RPC_URL', process.env.NEXT_PUBLIC_SOLANA_RPC_URL);
  const rpcSubscriptionsUrl = process.env.SOLANA_RPC_SUBSCRIPTIONS_URL?.trim();
  const client = createClient()
    .use(signerPlugin(treasurySigner))
    .use(solanaRpc({ rpcUrl, ...(rpcSubscriptionsUrl ? { rpcSubscriptionsUrl } : {}) }));
  return { client, treasurySigner };
}

function getPayoutClient(): PayoutClient {
  payoutClient ??= createPayoutClient();
  return payoutClient;
}

function getRpcConnections(): Connection[] {
  const urls = [
    requireServerEnv('SOLANA_RPC_URL', process.env.NEXT_PUBLIC_SOLANA_RPC_URL),
    process.env.SOLANA_RPC_FALLBACK_URL?.trim(),
  ].filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index);
  return urls.map((url) => new Connection(url, 'confirmed'));
}

export function getPayoutTreasuryAddress(): string {
  return getPayoutClient().treasurySigner.address;
}

export async function isPayoutSignerAvailable(): Promise<boolean> {
  return getPayoutClient().treasurySigner.isAvailable();
}

export async function prepareSolPayout(input: {
  recipientAddress: string;
  lamports: bigint;
}): Promise<PreparedSolPayout> {
  if (input.lamports <= 0n) throw new Error('Payout amount must be greater than zero lamports');
  const { client, treasurySigner } = getPayoutClient();
  const instruction = getTransferSolInstruction({
    source: treasurySigner,
    destination: address(input.recipientAddress),
    amount: input.lamports,
  });
  const result = await client.signTransaction([instruction]);
  const signature = result.context.signature;
  if (!signature) throw new Error('Turnkey signed the transaction without a fee-payer signature');
  const lifetime = result.context.message.lifetimeConstraint;
  if (!('blockhash' in lifetime) || !('lastValidBlockHeight' in lifetime)) {
    throw new Error('Payout transaction did not use a recent blockhash');
  }
  return {
    signedTransactionBase64: result.context.transactionBase64,
    signature,
    treasuryAddress: treasurySigner.address,
    recentBlockhash: lifetime.blockhash,
    lastValidBlockHeight: BigInt(lifetime.lastValidBlockHeight),
  };
}

export async function submitSignedPayout(signedTransactionBase64: string): Promise<string> {
  const [connection] = getRpcConnections();
  return connection.sendRawTransaction(Buffer.from(signedTransactionBase64, 'base64'), {
    maxRetries: 3,
    preflightCommitment: 'confirmed',
    skipPreflight: false,
  });
}

function transferMatches(
  transaction: Awaited<ReturnType<Connection['getParsedTransaction']>>,
  expected: { treasuryAddress: string; destinationAddress: string; lamports: bigint },
): boolean {
  if (!transaction || transaction.meta?.err) return false;
  return transaction.transaction.message.instructions.some((instruction) => {
    if (!('parsed' in instruction) || instruction.program !== 'system') return false;
    const parsed = instruction.parsed as { type?: string; info?: Record<string, unknown> };
    const info = parsed.info ?? {};
    return parsed.type === 'transfer'
      && info.source === expected.treasuryAddress
      && info.destination === expected.destinationAddress
      && BigInt(String(info.lamports ?? -1)) === expected.lamports;
  });
}

export async function observePayout(input: {
  signature: string;
  treasuryAddress: string;
  destinationAddress: string;
  lamports: bigint;
}): Promise<PayoutObservation> {
  const connections = getRpcConnections();
  const observations = await Promise.allSettled(connections.map(async (connection) => {
    const [statuses, blockHeight] = await Promise.all([
      connection.getSignatureStatuses([input.signature], { searchTransactionHistory: true }),
      connection.getBlockHeight('confirmed'),
    ]);
    const status = statuses.value[0];
    if (!status) return { found: false, confirmed: false, failed: false, blockHeight: BigInt(blockHeight) };
    if (status.err) return { found: true, confirmed: false, failed: true, blockHeight: BigInt(blockHeight) };
    const isConfirmed = status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized';
    if (!isConfirmed) return { found: true, confirmed: false, failed: false, blockHeight: BigInt(blockHeight) };
    const transaction = await connection.getParsedTransaction(input.signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    return {
      found: true,
      confirmed: transferMatches(transaction, input),
      failed: Boolean(transaction && !transferMatches(transaction, input)),
      blockHeight: BigInt(blockHeight),
      networkFeeLamports: transaction?.meta ? BigInt(transaction.meta.fee) : undefined,
    };
  }));

  const successful = observations
    .filter((result): result is PromiseFulfilledResult<{ found: boolean; confirmed: boolean; failed: boolean; blockHeight: bigint; networkFeeLamports?: bigint }> => result.status === 'fulfilled')
    .map((result) => result.value);
  if (successful.length === 0) {
    return { confirmed: false, failed: false, absentEverywhere: false, currentBlockHeight: 0n, error: 'All Solana RPC endpoints failed' };
  }
  return {
    confirmed: successful.some((item) => item.confirmed),
    failed: successful.some((item) => item.failed),
    absentEverywhere: successful.length === connections.length && successful.every((item) => !item.found),
    currentBlockHeight: successful.reduce((max, item) => item.blockHeight > max ? item.blockHeight : max, 0n),
    networkFeeLamports: successful.find((item) => item.confirmed)?.networkFeeLamports,
  };
}

export async function getTreasuryBalanceLamports(): Promise<bigint> {
  const [connection] = getRpcConnections();
  return BigInt(await connection.getBalance(new PublicKey(getPayoutTreasuryAddress()), 'confirmed'));
}

export async function sendSolPayout(input: { recipientAddress: string; lamports: bigint }) {
  const prepared = await prepareSolPayout(input);
  const signature = await submitSignedPayout(prepared.signedTransactionBase64);
  const [connection] = getRpcConnections();
  await connection.confirmTransaction({
    signature,
    blockhash: prepared.recentBlockhash,
    lastValidBlockHeight: Number(prepared.lastValidBlockHeight),
  }, 'confirmed');
  return {
    signature,
    treasuryAddress: prepared.treasuryAddress,
    remainingBalanceLamports: await getTreasuryBalanceLamports(),
  };
}

export function lamportsToSol(lamports: bigint): number {
  return Number(lamports) / Number(LAMPORTS_PER_SOL);
}
