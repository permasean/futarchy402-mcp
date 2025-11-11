#!/usr/bin/env tsx
/**
 * SDK Voting Example
 *
 * Demonstrates the complete x402 voting flow using the SDK directly.
 * Shows how to:
 * 1. Find an open poll
 * 2. Check entry fees and probabilities
 * 3. Execute a vote
 * 4. Check your position after voting
 *
 * ⚠️  WARNING: This executes REAL transactions that cost USDC!
 *
 * Usage:
 *   # Using environment variable (recommended for devnet)
 *   WALLET_PRIVATE_KEY=your-key tsx examples/sdk-voting-example.ts
 *
 *   # Or pass as command line argument
 *   tsx examples/sdk-voting-example.ts <poll-id> <side> <private-key>
 */

import { Futarchy402Client, executeVote } from '../src/index.js';
import { decodeWalletPrivateKey } from '../src/core/wallet.js';

async function main() {
  console.log('🗳️  Futarchy402 SDK Voting Example\n');

  // Get parameters
  const args = process.argv.slice(2);
  let pollId: string | undefined = args[0];
  let side: 'yes' | 'no' | undefined = args[1] as 'yes' | 'no';
  let privateKey: string | undefined = args[2] || process.env.WALLET_PRIVATE_KEY;

  // Validate private key
  if (!privateKey) {
    console.error('❌ Error: Wallet private key required');
    console.error('   Set WALLET_PRIVATE_KEY environment variable or pass as 3rd argument');
    console.error('   Usage: tsx examples/sdk-voting-example.ts [poll-id] [yes|no] [private-key]');
    process.exit(1);
  }

  // Decode wallet to get public key
  const wallet = decodeWalletPrivateKey(privateKey);
  const walletPubkey = wallet.publicKey.toBase58();
  console.log(`👤 Using wallet: ${walletPubkey}\n`);

  // Create client (check FUTARCHY_NETWORK env var for network)
  const network = (process.env.FUTARCHY_NETWORK as 'mainnet' | 'devnet') || 'mainnet';
  const client = new Futarchy402Client({ network });
  console.log(`🌐 Network: ${network}`);
  console.log(`📡 API URL: ${client.getBaseUrl()}\n`);

  try {
    // If poll ID not provided, let user select from open polls
    if (!pollId) {
      console.log('📋 Fetching open polls...\n');
      const { polls } = await client.listPolls({
        status: 'open',
        limit: 10,
      });

      if (polls.length === 0) {
        console.error('❌ No open polls found');
        process.exit(1);
      }

      console.log('Available polls:\n');
      polls.forEach((poll, i) => {
        console.log(`${i + 1}. ${poll.proposals.name}`);
        console.log(`   ID: ${poll.id}`);
        console.log(`   Entry fee YES: $${poll.current_entry_fee_yes_usdc.toFixed(4)} | NO: $${poll.current_entry_fee_no_usdc.toFixed(4)}`);
        console.log(`   Probability YES: ${(poll.implied_probability_yes * 100).toFixed(1)}% | NO: ${(poll.implied_probability_no * 100).toFixed(1)}%`);
        console.log(`   Votes: ${poll.yes_votes} YES, ${poll.no_votes} NO\n`);
      });

      console.error('❌ Please provide poll ID as first argument');
      console.error('   Usage: tsx examples/sdk-voting-example.ts <poll-id> <yes|no>');
      process.exit(1);
    }

    // If side not provided, show poll details and ask user to specify
    if (!side) {
      console.log(`📊 Fetching poll details: ${pollId}\n`);
      const poll = await client.getPoll(pollId);

      console.log('Poll Details:');
      console.log(`  Name: ${poll.proposals.name}`);
      console.log(`  Description: ${poll.proposals.description}`);
      console.log(`  Amount: $${(parseFloat(poll.proposals.amount_usdc_base_units) / 1_000_000).toFixed(2)} USDC`);
      console.log(`  Project: ${poll.proposals.treasuries.projects.name}`);

      console.log('\nCurrent Market:');
      console.log(`  Entry fee YES: $${poll.current_entry_fee_yes_usdc.toFixed(6)} USDC`);
      console.log(`  Entry fee NO: $${poll.current_entry_fee_no_usdc.toFixed(6)} USDC`);
      console.log(`  Implied probability YES: ${(poll.implied_probability_yes * 100).toFixed(2)}%`);
      console.log(`  Implied probability NO: ${(poll.implied_probability_no * 100).toFixed(2)}%`);

      console.log('\nVotes:');
      console.log(`  YES: ${poll.yes_votes} | NO: ${poll.no_votes}`);

      console.log('\nLiquidity:');
      console.log(`  Total: $${(parseFloat(poll.poll_pool_usdc_base_units) / 1_000_000).toFixed(2)} USDC`);
      console.log(`  YES side: $${(parseFloat(poll.yes_liquidity_usdc_base_units) / 1_000_000).toFixed(2)} USDC`);
      console.log(`  NO side: $${(parseFloat(poll.no_liquidity_usdc_base_units) / 1_000_000).toFixed(2)} USDC`);

      console.error('\n❌ Please provide vote side (yes or no) as second argument');
      console.error('   Usage: tsx examples/sdk-voting-example.ts <poll-id> <yes|no>');
      process.exit(1);
    }

    // Validate side
    if (side !== 'yes' && side !== 'no') {
      console.error('❌ Error: Side must be "yes" or "no"');
      process.exit(1);
    }

    // Check if already voted
    console.log(`🔍 Checking if wallet has already voted on this poll...\n`);
    try {
      const existingPosition = await client.getPosition(pollId, walletPubkey);
      console.log(`⚠️  You have already voted ${existingPosition.vote_side.toUpperCase()} on this poll!`);
      console.log(`   Amount paid: $${existingPosition.amount_paid_usdc} USDC`);
      console.log(`   Vote time: ${existingPosition.vote_timestamp}`);

      console.log('\n❌ Cannot vote twice on the same poll. Exiting.');
      process.exit(1);
    } catch (error: any) {
      if (error.message?.includes('No position found')) {
        console.log('✅ No existing vote found. Ready to vote!\n');
      } else {
        throw error;
      }
    }

    // Get poll details for display
    const poll = await client.getPoll(pollId);
    const entryFee = side === 'yes'
      ? poll.current_entry_fee_yes_usdc
      : poll.current_entry_fee_no_usdc;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Vote Summary:');
    console.log(`   Poll: ${poll.proposals.name}`);
    console.log(`   Voting: ${side.toUpperCase()}`);
    console.log(`   Entry fee: ~$${entryFee.toFixed(6)} USDC`);
    console.log(`   Slippage tolerance: 5%`);
    console.log(`   Wallet: ${walletPubkey}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🔐 Executing vote transaction...\n');

    // Execute the vote
    const voteResult = await executeVote({
      pollId,
      side,
      walletPrivateKey: privateKey,
      slippage: 0.05,  // 5% slippage tolerance
      apiBaseUrl: client.getBaseUrl(),
      network: client.getNetwork(),
    });

    if (!voteResult.success) {
      console.error(`\n❌ Vote failed: ${voteResult.error}`);
      process.exit(1);
    }

    console.log('✅ Vote successful!\n');
    console.log('Transaction Details:');
    console.log(`  Signature: ${voteResult.transaction_signature ?? 'N/A'}`);
    console.log(`  Vote ID: ${voteResult.vote_id ?? 'N/A'}`);
    console.log(`  Side: ${voteResult.side?.toUpperCase() ?? 'N/A'}`);
    console.log(`  Amount paid: $${(voteResult.amount_paid_usdc_base_units ? parseFloat(voteResult.amount_paid_usdc_base_units) / 1_000_000 : 0).toFixed(6)} USDC`);
    console.log(`  Quoted amount: $${(voteResult.quoted_amount_usdc_base_units ? parseFloat(voteResult.quoted_amount_usdc_base_units) / 1_000_000 : 0).toFixed(6)} USDC`);
    if (voteResult.actual_slippage !== undefined) {
      console.log(`  Actual slippage: ${(voteResult.actual_slippage * 100).toFixed(2)}%`);
    }
    console.log(`  Timestamp: ${voteResult.timestamp ?? 'N/A'}`);

    // Get position after voting
    console.log('\n📊 Fetching your position...\n');
    const position = await client.getPosition(pollId, walletPubkey);

    console.log('Your Position:');
    console.log(`  Voted: ${position.vote_side.toUpperCase()}`);
    console.log(`  Amount paid: $${position.amount_paid_usdc} USDC`);
    console.log(`  Your share of ${position.vote_side} side: ${(position.user_share_of_side * 100).toFixed(4)}%`);

    console.log('\nPool Stats:');
    console.log(`  Total pot: $${position.total_pot_usdc} USDC`);
    console.log(`  ${position.vote_side.toUpperCase()} side total: $${position.same_side_total_usdc} USDC`);
    console.log(`  YES votes: ${position.yes_votes} | NO votes: ${position.no_votes}`);

    console.log('\n🎉 Vote complete! Good luck!\n');

    // Show transaction link
    if (voteResult.transaction_signature) {
      const explorerUrl = network === 'devnet'
        ? `https://explorer.solana.com/tx/${voteResult.transaction_signature}?cluster=devnet`
        : `https://explorer.solana.com/tx/${voteResult.transaction_signature}`;
      console.log(`🔗 View transaction: ${explorerUrl}\n`);
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message || error);

    if (error.message?.includes('Duplicate vote')) {
      console.error('   You have already voted on this poll.');
    } else if (error.message?.includes('Slippage exceeded')) {
      console.error('   Price moved too much. Try again with higher slippage.');
    } else if (error.message?.includes('Insufficient funds')) {
      console.error('   Not enough USDC in wallet.');
    } else if (error.message?.includes('Poll not found')) {
      console.error('   Invalid poll ID.');
    }

    process.exit(1);
  }
}

// Run the example
main();
