import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramAlert } from '@/lib/telegram';
import { verifySession } from '@/lib/auth';
import db from '@/lib/db';
import { lamportsToSol, sendSolPayout } from '@/lib/payout';

const LAMPORTS_PER_SOL = 1_000_000_000;

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let client: Awaited<ReturnType<typeof db.getClient>> | undefined;
  let transactionStarted = false;

  try {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = await verifySession(token);
    if (!userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const { credits } = await req.json();

    // 1. Validate the amount
    const creditAmount = Number(credits);

    if (!Number.isFinite(creditAmount) || creditAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const MIN_WITHDRAWAL = 100; // $1.00

    if (creditAmount < MIN_WITHDRAWAL) {
      return NextResponse.json({ error: `Minimum withdrawal is ${MIN_WITHDRAWAL} credits ($1.00)` }, { status: 400 });
    }

    // 2. Fetch Live SOL Price from CoinGecko
    const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', {
      cache: 'no-store'
    });
    if (!priceRes.ok) {
      throw new Error(`SOL price request failed with status ${priceRes.status}`);
    }

    const priceData = await priceRes.json();
    const solPriceUsd = Number(priceData?.solana?.usd);

    if (!Number.isFinite(solPriceUsd) || solPriceUsd <= 0) {
      throw new Error('SOL price response was invalid');
    }

    // 3. Calculate the SOL to send
    const usdValue = creditAmount / 100; 
    const solToSend = usdValue / solPriceUsd;

    // Convert SOL to Lamports (1 SOL = 1,000,000,000 Lamports)
    const lamportsToSend = Math.floor(solToSend * LAMPORTS_PER_SOL);

    // 4. Database Transaction (Get user balance AND wallet address)
    client = await db.getClient();
    await client.query('BEGIN');
    transactionStarted = true;
    
    // Get the user's wallet address so we know where to send the SOL!
    const userRes = await client.query('SELECT balance, wallet_address FROM users WHERE id = $1 FOR UPDATE', [userId]);
    
    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentBalance = parseFloat(userRes.rows[0].balance);
    const userWalletAddress = userRes.rows[0].wallet_address;

    if (currentBalance < creditAmount) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Deduct the credits
    await client.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [creditAmount, userId]);

    // Record the withdrawal in the ledger as 'pending'
    const txRes = await client.query(
      'INSERT INTO transactions (user_id, type, amount, sol_amount, provider, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [userId, 'withdraw', creditAmount, solToSend, 'solana', 'pending']
    );
    const dbTxId = txRes.rows[0].id;

    // 5. Execute the Solana transfer through the server-only Turnkey signer.
    const payout = await sendSolPayout({
      recipientAddress: userWalletAddress,
      lamports: BigInt(lamportsToSend),
    });
    const signature = payout.signature;

    // 6. Update Database to 'completed' and save the transaction signature
    await client.query(
      'UPDATE transactions SET status = $1, offer_id = $2 WHERE id = $3',
      ['completed', signature, dbTxId]
    );

    const treasuryBalanceSol = lamportsToSol(payout.remainingBalanceLamports);
    const threshold = parseFloat(process.env.LOW_BALANCE_THRESHOLD || '1');

    if (treasuryBalanceSol < threshold) {
      const alertMsg = `🚨 *Treasury Alert* 🚨\n\n` +
                       `The SOL Hot Wallet is running low!\n` +
                       `*Current Balance:* ${treasuryBalanceSol.toFixed(4)} SOL\n` +
                       `*Threshold:* ${threshold} SOL\n\n` +
                       `Please replenish the hot wallet from the cold storage.`;
      
      // Send the alert (fire and forget, no need to await)
      sendTelegramAlert(alertMsg);
    }

    await client.query('COMMIT');
    transactionStarted = false;

    await db.query('REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_view');

    return NextResponse.json({ 
      success: true, 
      message: `Success! ${solToSend.toFixed(6)} SOL has been sent to your wallet.`,
      signature,
      solAmount: solToSend,
    });

  } catch (error) {
    if (client && transactionStarted) {
      await client.query('ROLLBACK').catch((rollbackError) => {
        console.error('Withdrawal rollback error:', rollbackError);
      });
    }

    console.error('Withdrawal error:', error);
    return NextResponse.json({ error: 'Server error during withdrawal' }, { status: 500 });
  } finally {
    client?.release();
  }
}
