import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// Generate a new random Solana keypair
const keypair = Keypair.generate();

// Get the public address
const publicKey = keypair.publicKey.toString();

// Get the private key (secret key) and encode it in Base58 format
// Base58 is the standard format for Solana private keys
const secretKey = bs58.encode(keypair.secretKey);

console.log('=========================================');
console.log('🚨 KEEP YOUR SECRET KEY SAFE AND NEVER COMMIT IT TO GITHUB! 🚨');
console.log('=========================================');
console.log('Public Address:', publicKey);
console.log('Secret Key (Base58):', secretKey);
console.log('=========================================');