'use client';

import { createContext, useContext } from 'react';

export interface UserData {
  id: number;
  wallet_address: string;
  balance: number;
}

export const UserContext = createContext<UserData | null>(null);

// This is a custom hook that makes it easy to get the user in any component
export function useUser() {
  const user = useContext(UserContext);
  if (!user) throw new Error('useUser must be used within a UserContext Provider');
  return user;
}