/**
 * Solana wallet utilities
 */

import { Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * Decode a base58 encoded private key to a Keypair
 */
export function decodeWalletPrivateKey(privateKey: string): Keypair {
  try {
    const decoded = bs58.decode(privateKey);
    return Keypair.fromSecretKey(decoded);
  } catch (error) {
    throw new Error(`Invalid wallet private key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate a Solana public key
 */
export function validatePublicKey(pubkey: string): boolean {
  try {
    new PublicKey(pubkey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Solana RPC URL for a given network
 */
export function getSolanaRpcUrl(network: string): string {
  if (network === 'solana-devnet') {
    return process.env.SOLANA_RPC_DEVNET || 'https://api.devnet.solana.com';
  }
  if (network === 'solana-mainnet') {
    return process.env.SOLANA_RPC_MAINNET || 'https://api.mainnet-beta.solana.com';
  }
  throw new Error(`Unsupported network: ${network}`);
}
