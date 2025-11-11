#!/usr/bin/env tsx
/**
 * Basic SDK Example
 *
 * Demonstrates direct usage of the Futarchy402 SDK without AI adapters.
 * This shows how to use the core client and x402 voting functionality.
 */

import { Futarchy402Client, executeVote } from '../src/index.js';

async function main() {
  console.log('🗳️  Futarchy402 SDK Basic Example\n');

  // Create client (defaults to mainnet)
  const client = new Futarchy402Client();

  // Or specify network
  // const client = new Futarchy402Client({ network: 'devnet' });

  try {
    // 1. List open polls
    console.log('📋 Listing open polls...\n');
    const { polls, pagination } = await client.listPolls({
      status: 'open',
      limit: 5,
    });

    console.log(`Found ${pagination.total} open poll(s):\n`);
    polls.forEach((poll, i) => {
      console.log(`${i + 1}. ${poll.proposal_name}`);
      console.log(`   ID: ${poll.id}`);
      console.log(`   Project: ${poll.project_name}`);
      console.log(`   Yes votes: ${poll.yes_votes} | No votes: ${poll.no_votes}`);
      console.log(`   Entry fee YES: $${poll.entry_fee_yes_usdc.toFixed(2)} | NO: $${poll.entry_fee_no_usdc.toFixed(2)}`);
      console.log(`   Closes: ${poll.closes_at}\n`);
    });

    if (polls.length === 0) {
      console.log('No open polls found. Checking resolved polls...\n');
      const resolved = await client.listPolls({ status: 'resolved', limit: 3 });
      console.log(`Found ${resolved.pagination.total} resolved poll(s)\n`);
    }

    // 2. Get detailed poll information
    if (polls.length > 0) {
      const pollId = polls[0].id;
      console.log(`\n📊 Getting details for poll: ${pollId}\n`);

      const pollDetails = await client.getPoll(pollId);

      console.log('Proposal Details:');
      console.log(`  Name: ${pollDetails.proposal.name}`);
      console.log(`  Description: ${pollDetails.proposal.description}`);
      console.log(`  Amount: $${pollDetails.proposal.amount_usdc} USDC`);
      console.log(`  Project: ${pollDetails.proposal.project_name}`);

      console.log('\nLiquidity:');
      console.log(`  Total: $${pollDetails.liquidity.total_usdc} USDC`);
      console.log(`  YES side: $${pollDetails.liquidity.yes_usdc} USDC`);
      console.log(`  NO side: $${pollDetails.liquidity.no_usdc} USDC`);

      console.log('\nCurrent Prices:');
      console.log(`  Entry fee YES: $${pollDetails.current_prices.entry_fee_yes_usdc.toFixed(6)} USDC`);
      console.log(`  Entry fee NO: $${pollDetails.current_prices.entry_fee_no_usdc.toFixed(6)} USDC`);
      console.log(`  Implied probability YES: ${(pollDetails.current_prices.implied_probability_yes * 100).toFixed(2)}%`);
      console.log(`  Implied probability NO: ${(pollDetails.current_prices.implied_probability_no * 100).toFixed(2)}%`);

      console.log('\nVotes:');
      console.log(`  Total votes: ${pollDetails.vote_counts.total}`);
      console.log(`  YES: ${pollDetails.vote_counts.yes} | NO: ${pollDetails.vote_counts.no}`);

      if (pollDetails.votes.length > 0) {
        console.log('\nRecent votes:');
        pollDetails.votes.slice(0, 3).forEach((vote) => {
          console.log(`  - ${vote.voter_pubkey.slice(0, 8)}... voted ${vote.side.toUpperCase()} ($${vote.amount_paid_usdc.toFixed(4)} USDC)`);
        });
      }
    }

    // 3. Get position (example - requires valid wallet pubkey)
    const exampleWalletPubkey = 'BFLRBYeuPA1svoo9FEhRMDr1LtoPfxZCAKxqqrHfLRWP';
    if (polls.length > 0) {
      console.log(`\n\n💼 Checking position for wallet: ${exampleWalletPubkey.slice(0, 8)}...`);
      try {
        const position = await client.getPosition(polls[0].id, exampleWalletPubkey);

        console.log('\nPosition Details:');
        console.log(`  Voted: ${position.vote_side.toUpperCase()}`);
        console.log(`  Amount paid: $${position.amount_paid_usdc} USDC`);
        console.log(`  Vote time: ${position.vote_timestamp}`);

        console.log('\nPool Stats:');
        console.log(`  Total pot: $${position.total_pot_usdc} USDC`);
        console.log(`  Your side total: $${position.same_side_total_usdc} USDC`);
        console.log(`  Your share of side: ${(position.user_share_of_side * 100).toFixed(2)}%`);

        if (position.poll_status === 'open') {
          console.log('\nProjections:');
          console.log(`  If ${position.vote_side} wins:`);
          console.log(`    Payout: $${position.if_side_wins_payout_usdc} USDC`);
          console.log(`    Profit: $${position.if_side_wins_profit_usdc} USDC`);
          console.log(`    ROI: ${position.if_side_wins_roi_percent.toFixed(2)}%`);
          console.log(`  If ${position.vote_side} loses:`);
          console.log(`    Loss: $${position.if_side_loses_profit_usdc} USDC`);
          console.log(`    ROI: ${position.if_side_loses_roi_percent.toFixed(2)}%`);
        } else if (position.poll_status === 'resolved') {
          console.log('\nActual Results:');
          console.log(`  Poll outcome: ${position.poll_outcome?.toUpperCase()}`);
          console.log(`  Result: ${position.actual_results?.result}`);
          console.log(`  Payout: $${position.actual_results?.actual_payout_usdc} USDC`);
          console.log(`  Profit: $${position.actual_results?.actual_profit_usdc} USDC`);
          console.log(`  ROI: ${position.actual_results?.actual_roi_percent.toFixed(2)}%`);
        }
      } catch (error: any) {
        if (error.message.includes('404')) {
          console.log('  No position found for this wallet on this poll.');
        } else {
          throw error;
        }
      }
    }

    // 4. Get platform stats
    console.log('\n\n📈 Platform Statistics:\n');
    const stats = await client.getStats();
    console.log(`  Active polls: ${stats.active_polls}`);
    console.log(`  Total projects: ${stats.total_projects}`);
    console.log(`  Total proposals: ${stats.total_proposals}`);

    // 5. Voting example (commented out - requires private key)
    console.log('\n\n🗳️  Voting Example (commented out):\n');
    console.log('To vote, uncomment the code below and provide your wallet private key.\n');
    console.log('⚠️  WARNING: This executes a REAL transaction that costs USDC!\n');

    /*
    // UNCOMMENT TO VOTE (USE WITH CAUTION!)
    if (polls.length > 0) {
      const voteResult = await executeVote({
        pollId: polls[0].id,
        side: 'yes',  // or 'no'
        walletPrivateKey: 'YOUR_BASE58_PRIVATE_KEY_HERE',
        slippage: 0.05,  // 5% slippage tolerance
        apiBaseUrl: client.getBaseUrl(),
        network: client.getNetwork(),
      });

      if (voteResult.success) {
        console.log('✅ Vote successful!');
        console.log(`   Transaction: ${voteResult.transaction_signature}`);
        console.log(`   Amount paid: $${voteResult.amount_paid_usdc_base_units / 1_000_000} USDC`);
        console.log(`   Voted: ${voteResult.side.toUpperCase()}`);
      } else {
        console.error('❌ Vote failed:', voteResult.error);
      }
    }
    */

    console.log('\n✅ Example completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run the example
main();
