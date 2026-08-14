import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import db from '@/lib/db';
import { Connection, PublicKey } from '@solana/web3.js';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = await verifySession(token);
    if (!userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    // Verify user is admin
    const userRes = await db.query('SELECT wallet_address FROM users WHERE id = $1', [userId]);
    if (userRes.rows[0].wallet_address !== process.env.ADMIN_WALLET_ADDRESS) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { type, fromWallet, toWallet, amountToken, txSignature } = await req.json();

    // Fetch live SOL price to lock in the swap rate
    const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', { cache: 'no-store' });
    const priceData = await priceRes.json();
    const solPriceUsd = priceData.solana.usd;

    const amountTokenNum = parseFloat(amountToken);
    const amountUsd = amountTokenNum * solPriceUsd;

    // Fetch the transaction fee from the Solana blockchain
    const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!, 'confirmed');
    let networkFee = 0;
    try {
      const txInfo = await connection.getTransaction(txSignature, { maxSupportedTransactionVersion: 0 });
      if (txInfo && txInfo.meta) {
        networkFee = (txInfo.meta.fee / 1000000000); // Convert lamports to SOL
      }
    } catch (e) {
      console.warn("Could not fetch tx fee, might be localnet or unconfirmed.");
    }

    // Insert into treasury_logs
    await db.query(
      `INSERT INTO treasury_logs 
        (type, from_wallet, to_wallet, amount_usd, amount_token, swap_rate, network_fee, tx_signature, status) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [type, fromWallet, toWallet, amountUsd, amountTokenNum, solPriceUsd, networkFee, txSignature, 'completed']
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Treasury movement logged successfully.',
      swapRate: solPriceUsd,
      networkFee: networkFee
    });

  } catch (error) {
    console.error('Treasury log error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}