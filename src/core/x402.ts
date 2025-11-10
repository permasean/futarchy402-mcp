/**
 * x402 Payment-Gated Voting Implementation
 * This is the CRITICAL component for voting on polls
 */

import { Connection, Transaction } from '@solana/web3.js';
import fetch from 'node-fetch';
import { VoteResult, X402PaymentRequirements, VoteSide } from './types.js';
import { decodeWalletPrivateKey, getSolanaRpcUrl } from './wallet.js';

export interface VoteParams {
  pollId: string;
  side: VoteSide;
  walletPrivateKey: string; // base58 encoded
  slippage?: number;
  apiBaseUrl?: string;
  facilitatorUrl?: string;
}

/**
 * Execute a vote using x402 payment-gated protocol
 *
 * This implements the 2-step x402 payment flow:
 * 1. Request without payment → Get 402 response with payment requirements
 * 2. Pay via facilitator → Submit signed transaction with X-Payment header
 */
export async function executeVote(params: VoteParams): Promise<VoteResult> {
  const {
    pollId,
    side,
    walletPrivateKey,
    slippage = 0.05,
    apiBaseUrl = process.env.FUTARCHY_API_URL || 'https://futarchy402-api-385498168887.us-central1.run.app',
    facilitatorUrl = process.env.FACILITATOR_URL || 'https://x402.org/facilitator',
  } = params;

  try {
    // Step 1: Decode wallet keypair
    const walletKeypair = decodeWalletPrivateKey(walletPrivateKey);

    // Step 2: Request vote (expect 402 Payment Required response)
    const voteUrl = `${apiBaseUrl}/poll/${pollId}/vote?side=${side}&slippage=${slippage}`;
    const voteResponse = await fetch(voteUrl, { method: 'POST' });

    // Validate we got a 402 response
    if (voteResponse.status !== 402) {
      // Handle other error responses
      if (voteResponse.status === 400) {
        const error = await voteResponse.json();
        throw new Error(`Invalid vote request: ${JSON.stringify(error)}`);
      }
      if (voteResponse.status === 403) {
        throw new Error('Duplicate vote: You have already voted on this poll');
      }
      if (voteResponse.status === 404) {
        throw new Error(`Poll not found: ${pollId}`);
      }
      throw new Error(`Expected 402 Payment Required, got ${voteResponse.status}`);
    }

    // Step 3: Parse payment requirements from X-Payment-Required header
    const paymentHeader = voteResponse.headers.get('x-payment-required');
    if (!paymentHeader) {
      throw new Error('Missing X-Payment-Required header in 402 response');
    }

    const paymentRequirements: X402PaymentRequirements = JSON.parse(paymentHeader);

    // Step 4: Request transaction from facilitator
    const facilitatorResponse = await fetch(`${facilitatorUrl}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resourceUrl: voteUrl,
        paymentRequirements,
        walletPublicKey: walletKeypair.publicKey.toBase58(),
      }),
    });

    if (!facilitatorResponse.ok) {
      const error = await facilitatorResponse.json();
      throw new Error(
        `Facilitator error: ${(error as any).message || (error as any).error || 'Unknown error'}`
      );
    }

    const { transaction: txBase64 } = (await facilitatorResponse.json()) as { transaction: string };

    // Step 5: Deserialize and sign the transaction
    const transaction = Transaction.from(Buffer.from(txBase64, 'base64'));
    transaction.partialSign(walletKeypair);

    // Step 6: Submit the signed transaction with X-Payment header
    const signedTxBase64 = transaction.serialize().toString('base64');
    const paymentResponse = await fetch(voteUrl, {
      method: 'POST',
      headers: {
        'X-Payment': signedTxBase64,
      },
    });

    if (!paymentResponse.ok) {
      if (paymentResponse.status === 409) {
        throw new Error('Slippage exceeded: Entry fee changed too much. Try again with higher slippage.');
      }
      const error = await paymentResponse.json();
      throw new Error(`Vote failed: ${JSON.stringify(error)}`);
    }

    // Step 7: Parse and return success response
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
  const {
    pollId,
    side,
    walletPrivateKey,
    slippage = 0.05,
    apiBaseUrl = process.env.FUTARCHY_API_URL || 'https://futarchy402-api-385498168887.us-central1.run.app',
    facilitatorUrl = process.env.FACILITATOR_URL || 'https://x402.org/facilitator',
  } = params;

  try {
    const walletKeypair = decodeWalletPrivateKey(walletPrivateKey);
    const voteUrl = `${apiBaseUrl}/poll/${pollId}/vote?side=${side}&slippage=${slippage}`;
    const voteResponse = await fetch(voteUrl, { method: 'POST' });

    if (voteResponse.status !== 402) {
      throw new Error(`Expected 402 Payment Required, got ${voteResponse.status}`);
    }

    const paymentHeader = voteResponse.headers.get('x-payment-required');
    if (!paymentHeader) {
      throw new Error('Missing X-Payment-Required header');
    }

    const paymentRequirements: X402PaymentRequirements = JSON.parse(paymentHeader);

    const facilitatorResponse = await fetch(`${facilitatorUrl}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resourceUrl: voteUrl,
        paymentRequirements,
        walletPublicKey: walletKeypair.publicKey.toBase58(),
      }),
    });

    if (!facilitatorResponse.ok) {
      throw new Error('Facilitator request failed');
    }

    const { transaction: txBase64 } = (await facilitatorResponse.json()) as { transaction: string };
    const transaction = Transaction.from(Buffer.from(txBase64, 'base64'));
    transaction.partialSign(walletKeypair);

    // Get connection for confirmation
    const connection = new Connection(getSolanaRpcUrl(paymentRequirements.network), 'confirmed');

    // Send raw transaction and wait for confirmation
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
    });

    await connection.confirmTransaction(signature, 'confirmed');

    // Now submit the vote with the confirmed transaction
    const signedTxBase64 = transaction.serialize().toString('base64');
    const paymentResponse = await fetch(voteUrl, {
      method: 'POST',
      headers: {
        'X-Payment': signedTxBase64,
      },
    });

    if (!paymentResponse.ok) {
      throw new Error(`Vote submission failed: ${paymentResponse.status}`);
    }

    const result = (await paymentResponse.json()) as VoteResult;

    return {
      success: true,
      ...result,
      transaction_signature: signature,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error during vote execution with confirmation',
    };
  }
}
