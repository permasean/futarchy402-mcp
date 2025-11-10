/**
 * x402 Payment-Gated Voting Implementation
 * This is the CRITICAL component for voting on polls
 *
 * This implementation builds Solana SPL token transfer transactions directly
 * without using a facilitator service.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  TOKEN_PROGRAM_ID,
  getMint,
} from '@solana/spl-token';
import fetch from 'node-fetch';
import { VoteResult, VoteSide } from './types.js';
import { decodeWalletPrivateKey, getSolanaRpcUrl } from './wallet.js';

export interface VoteParams {
  pollId: string;
  side: VoteSide;
  walletPrivateKey: string; // base58 encoded
  slippage?: number;
  apiBaseUrl?: string;
  network?: 'mainnet' | 'devnet';
}

interface X402Response {
  x402Version: string;
  resource: string;
  accepts: Array<{
    scheme: string;
    network: string;
    payTo: string;
    asset: string; // SPL token mint address
    maxAmountRequired: string;
    resource?: string;
    description?: string;
    mimeType?: string;
    maxTimeoutSeconds?: number;
    extra?: Record<string, any>;
  }>;
}

/**
 * Execute a vote using x402 payment-gated protocol
 *
 * This implements the x402 payment flow by building SPL token transfers directly:
 * 1. Request without payment → Get 402 response with payment requirements
 * 2. Build SPL token transfer transaction using @solana/spl-token
 * 3. Sign transaction with user wallet
 * 4. Submit signed transaction with X-Payment header containing the full payload
 */
export async function executeVote(params: VoteParams): Promise<VoteResult> {
  const {
    pollId,
    side,
    walletPrivateKey,
    slippage = 0.05,
    network = (process.env.FUTARCHY_NETWORK as 'mainnet' | 'devnet') || 'mainnet',
  } = params;

  // Determine API URL
  const apiBaseUrl = params.apiBaseUrl ||
    process.env.FUTARCHY_API_URL ||
    'https://futarchy402-api-385498168887.us-central1.run.app';

  try {
    // Step 1: Decode wallet keypair
    const voterKeypair = decodeWalletPrivateKey(walletPrivateKey);
    const voterPubkey = voterKeypair.publicKey;

    // Step 2: Request vote (expect 402 Payment Required response)
    const voteUrl = `${apiBaseUrl}/poll/${pollId}/vote?side=${side}&slippage=${slippage}`;
    const initialResponse = await fetch(voteUrl, { method: 'POST' });

    // Validate we got a 402 response
    if (initialResponse.status !== 402) {
      // Handle other error responses
      if (initialResponse.status === 400) {
        const error = await initialResponse.json();
        throw new Error(`Invalid vote request: ${JSON.stringify(error)}`);
      }
      if (initialResponse.status === 403) {
        throw new Error('Duplicate vote: You have already voted on this poll');
      }
      if (initialResponse.status === 404) {
        throw new Error(`Poll not found: ${pollId}`);
      }
      throw new Error(`Expected 402 Payment Required, got ${initialResponse.status}`);
    }

    // Step 3: Parse x402 response from body (not header)
    const x402Response: X402Response = await initialResponse.json() as X402Response;

    if (!x402Response.accepts || x402Response.accepts.length === 0) {
      throw new Error('No payment methods accepted in x402 response');
    }

    // Use the first accepted payment method
    const requirement = x402Response.accepts[0];

    // Validate it's a Solana payment (scheme can be "solana" or "exact")
    const isSolanaPayment = requirement.scheme === 'solana' ||
                            requirement.scheme === 'exact' ||
                            requirement.network?.includes('solana');

    if (!isSolanaPayment) {
      throw new Error(`Unsupported payment scheme: ${requirement.scheme}. Full requirement: ${JSON.stringify(requirement)}`);
    }

    // Validate we have the SPL token address (can be in 'asset' or 'splToken' field)
    const tokenMint = requirement.asset;
    if (!tokenMint) {
      throw new Error(`Missing token mint address in payment requirement: ${JSON.stringify(requirement)}`);
    }

    // Step 4: Setup Solana connection
    // Use the network from the API response (e.g., "solana-devnet")
    const rpcUrl = getSolanaRpcUrl(requirement.network);
    const connection = new Connection(rpcUrl, 'confirmed');

    // Step 5: Get mint info for the SPL token
    const mintPubkey = new PublicKey(tokenMint);
    const mint = await getMint(connection, mintPubkey);

    // Step 6: Get fee payer from payment requirements (facilitator pays transaction fees)
    const feePayer = requirement.extra?.feePayer;
    if (!feePayer) {
      throw new Error('Payment requirements do not include a fee payer');
    }
    const feePayerPubkey = new PublicKey(feePayer);

    // Step 7: Get or create associated token accounts
    const destPubkey = new PublicKey(requirement.payTo);
    const userAta = await getAssociatedTokenAddress(
      mintPubkey,
      voterPubkey,
      false,
      TOKEN_PROGRAM_ID
    );
    const destAta = await getAssociatedTokenAddress(
      mintPubkey,
      destPubkey,
      false,
      TOKEN_PROGRAM_ID
    );

    // Step 8: Build transaction instructions
    const instructions = [
      // Set compute budget
      ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }),
    ];

    // Check if destination ATA exists, create if needed
    const destAtaInfo = await connection.getAccountInfo(destAta);
    if (!destAtaInfo) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          feePayerPubkey, // fee payer pays for account creation
          destAta, // ata
          destPubkey, // owner
          mintPubkey, // mint
          TOKEN_PROGRAM_ID
        )
      );
    }

    // Add transfer instruction
    instructions.push(
      createTransferCheckedInstruction(
        userAta, // from
        mintPubkey, // mint
        destAta, // to
        voterPubkey, // owner (voter signs the transfer)
        BigInt(requirement.maxAmountRequired), // amount
        mint.decimals, // decimals
        [], // multiSigners
        TOKEN_PROGRAM_ID
      )
    );

    // Step 9: Get recent blockhash and build transaction
    const { blockhash } = await connection.getLatestBlockhash('confirmed');

    const message = new TransactionMessage({
      payerKey: feePayerPubkey, // Fee payer (facilitator) pays transaction fees
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();

    const transaction = new VersionedTransaction(message);

    // Step 9: Sign the transaction
    transaction.sign([voterKeypair]);

    // Step 10: Create X-Payment header payload
    const paymentPayload = {
      x402Version: x402Response.x402Version,
      scheme: requirement.scheme,
      network: requirement.network,
      payload: {
        transaction: Buffer.from(transaction.serialize()).toString('base64'),
      },
    };

    // Encode the entire payload as base64
    const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

    // Step 11: Submit vote with X-Payment header
    const paymentResponse = await fetch(voteUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payment': paymentHeader,
      },
      body: JSON.stringify({}), // Empty body required by API
    });

    if (!paymentResponse.ok) {
      if (paymentResponse.status === 409) {
        throw new Error('Slippage exceeded: Entry fee changed too much. Try again with higher slippage.');
      }
      const error = await paymentResponse.json();
      throw new Error(`Vote failed: ${JSON.stringify(error)}`);
    }

    // Step 12: Parse and return success response
    const result = (await paymentResponse.json()) as VoteResult;

    return {
      success: true,
      vote_id: result.vote_id,
      transaction_signature: result.transaction_signature,
      amount_paid_usdc_base_units: result.amount_paid_usdc_base_units,
      quoted_amount_usdc_base_units: result.quoted_amount_usdc_base_units,
      actual_slippage: result.actual_slippage,
      voter_pubkey: result.voter_pubkey,
      side: result.side,
      poll_id: result.poll_id,
      timestamp: result.timestamp,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error during vote execution',
    };
  }
}

/**
 * Alternative implementation that waits for transaction confirmation
 * Use this if you need to ensure the transaction is confirmed on-chain
 */
export async function executeVoteWithConfirmation(params: VoteParams): Promise<VoteResult> {
  const result = await executeVote(params);

  if (!result.success || !result.transaction_signature) {
    return result;
  }

  try {
    // Connect to Solana and wait for confirmation
    const network = params.network ||
      (process.env.FUTARCHY_NETWORK as 'mainnet' | 'devnet') ||
      'mainnet';
    const rpcUrl = getSolanaRpcUrl(network);
    const connection = new Connection(rpcUrl, 'confirmed');

    await connection.confirmTransaction(result.transaction_signature, 'confirmed');

    return result;
  } catch (error: any) {
    return {
      ...result,
      error: `Vote submitted but confirmation failed: ${error.message}`,
    };
  }
}
