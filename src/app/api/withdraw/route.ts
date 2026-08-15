import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramAlert } from '@/lib/telegram';
import { verifySession } from '@/lib/auth';
import db from '@/lib/db';
import { Connection, Keypair, SystemProgram, Transaction, PublicKey, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';

export async function POST(req: NextRequest) {
  let client;
  try {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = await verifySession(token);
    if (!userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const { credits } = await req.json();

    // 1. Validate the amount
    if (!credits || isNaN(credits)) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const creditAmount = parseFloat(credits);
    const MIN_WITHDRAWAL = 100; // $1.00

    if (creditAmount < MIN_WITHDRAWAL) {
      return NextResponse.json({ error: `Minimum withdrawal is ${MIN_WITHDRAWAL} credits ($1.00)` }, { status: 400 });
    }

    // 2. Fetch Live SOL Price from CoinGecko
    const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', {
      cache: 'no-store'
    });
    const priceData = await priceRes.json();
    const solPriceUsd = priceData.solana.usd;

    // 3. Calculate the SOL to send
    const usdValue = creditAmount / 100; 
    const solToSend = usdValue / solPriceUsd;

    // Convert SOL to Lamports (1 SOL = 1,000,000,000 Lamports)
    const lamportsToSend = Math.floor(solToSend * LAMPORTS_PER_SOL);

    // 4. Database Transaction (Get user balance AND wallet address)
    await db.query('BEGIN');
    
    // Get the user's wallet address so we know where to send the SOL!
    const userRes = await db.query('SELECT balance, wallet_address FROM users WHERE id = $1 FOR UPDATE', [userId]);
    
    if (userRes.rows.length === 0) {
      await db.query('ROLLBACK');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentBalance = parseFloat(userRes.rows[0].balance);
    const userWalletAddress = userRes.rows[0].wallet_address;

    if (currentBalance < creditAmount) {
      await db.query('ROLLBACK');
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Deduct the credits
    await db.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [creditAmount, userId]);

    // Record the withdrawal in the ledger as 'pending'
    const txRes = await db.query(
      'INSERT INTO transactions (user_id, type, amount, sol_amount, provider, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [userId, 'withdraw', creditAmount, solToSend, 'solana', 'pending']
    );
    const dbTxId = txRes.rows[0].id;

    // 5. Execute the Solana Transfer
    const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!, 'confirmed');
    
    // Load Treasury Keypair from .env.local
    const treasurySecretKey = bs58.decode(process.env.TREASURY_WALLET_SECRET_KEY!);
    const treasuryKeypair = Keypair.fromSecretKey(treasurySecretKey);
    
    const recipientPubKey = new PublicKey(userWalletAddress);

    // Create the transfer instruction
    const transferIx = SystemProgram.transfer({
      fromPubkey: treasuryKeypair.publicKey,
      toPubkey: recipientPubKey,
      lamports: lamportsToSend,
    });

    // Build and send transaction
    const tx = new Transaction().add(transferIx);
    const signature = await sendAndConfirmTransaction(connection, tx, [treasuryKeypair]);

    // 6. Update Database to 'completed' and save the transaction signature
    await db.query(
      'UPDATE transactions SET status = $1, offer_id = $2 WHERE id = $3',
      ['completed', signature, dbTxId]
    );

    const treasuryBalanceLamports = await connection.getBalance(treasuryKeypair.publicKey);
    const treasuryBalanceSol = treasuryBalanceLamports / LAMPORTS_PER_SOL;
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

    await db.query('COMMIT');

    return NextResponse.json({ 
      success: true, 
      message: `Success! ${solToSend.toFixed(6)} SOL has been sent to your wallet.`,
      signature: signature
    });

  } catch (error) {
    // If the Solana transaction fails, roll back the database deduction!
    await db.query('ROLLBACK');
    console.error('Withdrawal error:', error);
    return NextResponse.json({ error: 'Server error during withdrawal' }, { status: 500 });
  }
}