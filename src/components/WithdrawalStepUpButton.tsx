'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';

export function WithdrawalStepUpButton({ withdrawalId, onVerified }: { withdrawalId: string; onVerified: () => Promise<void> }) {
  const { signMessage } = useWallet(); const [working,setWorking]=useState(false); const [message,setMessage]=useState('');
  async function verify(){ if(!signMessage)return setMessage('Reconnect a wallet that supports message signing.'); setWorking(true); setMessage(''); try { const challengeResponse=await fetch(`/api/withdrawals/${withdrawalId}/step-up/challenge`,{method:'POST'}); const challenge=await challengeResponse.json(); if(!challengeResponse.ok)throw new Error(challenge.error); const signature=await signMessage(new TextEncoder().encode(challenge.message)); const response=await fetch(`/api/withdrawals/${withdrawalId}/step-up/verify`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nonce:challenge.nonce,signature:bs58.encode(signature)})}); const data=await response.json(); if(!response.ok)throw new Error(data.error); setMessage('Wallet verified. An administrator can now review this request.'); await onVerified(); } catch(error){setMessage(error instanceof Error?error.message:'Verification failed');} finally{setWorking(false);} }
  return <div className="mt-3"><button onClick={verify} disabled={working} className="rounded-lg border border-brand/30 bg-brand/5 px-4 py-2 text-sm font-semibold text-brand disabled:opacity-50">{working?'Verifying…':'Verify wallet for review'}</button>{message&&<p className="mt-2 text-xs leading-5 text-secondary">{message}</p>}</div>;
}
