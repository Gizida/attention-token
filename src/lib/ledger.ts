import 'server-only';

export type QueryClient = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount?: number | null }>;
};

export type CreditBalances = {
  available: number;
  pending: number;
  reserved: number;
  total: number;
};

export async function getCreditBalances(client: QueryClient, userId: number): Promise<CreditBalances> {
  const result = await client.query(
    `SELECT
       COALESCE(SUM(CASE WHEN available_at <= NOW() THEN amount_credits ELSE 0 END), 0) AS available,
       COALESCE(SUM(CASE WHEN available_at > NOW() THEN amount_credits ELSE 0 END), 0) AS pending,
       COALESCE((
         SELECT SUM(credits) FROM withdrawal_requests
         WHERE user_id = $1 AND status IN ('awaiting_review','queued','signing','signed','submitted','retryable')
       ), 0) AS reserved
     FROM credit_ledger_entries
     WHERE user_id = $1`,
    [userId],
  );
  const available = Number(result.rows[0]?.available ?? 0);
  const pending = Number(result.rows[0]?.pending ?? 0);
  const reserved = Number(result.rows[0]?.reserved ?? 0);
  return { available, pending, reserved, total: available + pending + reserved };
}

export async function insertLedgerEntry(
  client: QueryClient,
  input: {
    userId: number;
    kind: string;
    amountCredits: number;
    availableAt: Date;
    sourceType: string;
    sourceId: string;
    metadata?: Record<string, unknown>;
  },
): Promise<boolean> {
  const result = await client.query(
    `INSERT INTO credit_ledger_entries
       (user_id, kind, amount_credits, available_at, source_type, source_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [input.userId, input.kind, input.amountCredits, input.availableAt, input.sourceType, input.sourceId, JSON.stringify(input.metadata ?? {})],
  );
  return result.rows.length > 0;
}
