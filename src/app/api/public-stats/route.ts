import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    // 1. Fetch Total SOL awarded
    const totalSolRes = await db.query(`
      SELECT COALESCE(SUM(sol_amount), 0) as total_sol 
      FROM transactions 
      WHERE type = 'withdraw' AND status = 'completed' AND sol_amount IS NOT NULL
    `);
    
    // 2. Fetch Most Recent Transaction
    const recentTxRes = await db.query(`
      SELECT t.sol_amount,
             LEFT(u.wallet_address, 4) || '…' || RIGHT(u.wallet_address, 4) AS wallet_address
      FROM transactions t 
      JOIN users u ON t.user_id = u.id 
      WHERE t.type = 'withdraw' AND t.status = 'completed' AND t.sol_amount IS NOT NULL 
      ORDER BY t.created_at DESC LIMIT 1
    `);

    const totalSol = Number(totalSolRes.rows[0].total_sol);
    const recentTx = recentTxRes.rows[0] || null;

    return NextResponse.json({
      totalSol: totalSol.toFixed(4),
      recentWallet: recentTx ? recentTx.wallet_address : null,
      recentAmount: recentTx ? Number(recentTx.sol_amount).toFixed(4) : null
    });
  } catch (error) {
    console.error('Public stats error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
