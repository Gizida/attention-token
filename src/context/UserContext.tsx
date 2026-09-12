'use client';

import { createContext, useContext } from 'react';

export interface CreditBalances {
  available: number;
  pending: number;
  reserved: number;
  total: number;
}

export interface UserData {
  id: number;
  wallet_address: string;
  balance: number;
  balances: CreditBalances;
  isAdmin: boolean;
}

export interface UserContextValue extends UserData {
  refreshUser: () => Promise<void>;
}

export const UserContext = createContext<UserContextValue | null>(null);

export function useUser() {
  const user = useContext(UserContext);
  if (!user) throw new Error('useUser must be used within a UserContext Provider');
  return user;
}
