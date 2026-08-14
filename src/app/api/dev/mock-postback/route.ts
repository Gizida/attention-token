import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    const userId = searchParams.get('user_id');
    const amount = searchParams.get('amount');
    const offerId = searchParams.get('offer_id');

    if (!userId || !amount || !offerId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Check if this offer was already completed (fraud prevention)
    const existingTx = await db.query(
      'SELECT * FROM transactions WHERE offer_id = $1 AND type = $2',
      [offerId, 'earn']
    );

    if (existingTx.rows.length > 0) {
      // Return 400 so the frontend knows it failed
      return NextResponse.json({ error: 'Offer already completed' }, { status: 400 });
    }

    // 2. Force the types to be numbers so PostgreSQL doesn't complain
    const numericAmount = parseFloat(amount);
    const numericUserId = parseInt(userId, 10);

    // 3. Record the transaction in the ledger
    await db.query(
      'INSERT INTO transactions (user_id, type, amount, provider, offer_id, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [numericUserId, 'earn', numericAmount, 'mock_adgate', offerId, 'completed']
    );

    // 4. Update the user's balance
    await db.query(
      'UPDATE users SET balance = balance + $1 WHERE id = $2',
      [numericAmount, numericUserId]
    );

    return NextResponse.json({ 
      success: true, 
      message: `Added ${numericAmount} credits to user ${numericUserId}`,
    });

  } catch (error) {
    console.error('Mock postback error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}