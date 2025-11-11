#!/usr/bin/env tsx
/**
 * SDK Position Tracker Example
 *
 * Demonstrates how to track all positions for a wallet across all polls.
 * Shows profit/loss, ROI, and actual results for resolved polls.
 *
 * Usage:
 *   tsx examples/sdk-position-tracker.ts <wallet-pubkey>
 *
 *   # Or use configured wallet
 *   WALLET_PRIVATE_KEY=your-key tsx examples/sdk-position-tracker.ts
 */

import { Futarchy402Client } from '../src/index.js';
import { decodeWalletPrivateKey } from '../src/core/wallet.js';

async function main() {
  console.log('💼 Futarchy402 Position Tracker\n');

  // Get wallet pubkey from args or derive from private key
  const args = process.argv.slice(2);
  let walletPubkey: string;

  if (args[0]) {
    walletPubkey = args[0];
    console.log(`👤 Checking wallet: ${walletPubkey}\n`);
  } else if (process.env.WALLET_PRIVATE_KEY) {
    const wallet = decodeWalletPrivateKey(process.env.WALLET_PRIVATE_KEY);
    walletPubkey = wallet.publicKey.toBase58();
    console.log(`👤 Using configured wallet: ${walletPubkey}\n`);
  } else {
    console.error('❌ Error: Wallet public key required');
    console.error('   Usage: tsx examples/sdk-position-tracker.ts <wallet-pubkey>');
    console.error('   Or set WALLET_PRIVATE_KEY environment variable');
    process.exit(1);
  }

  const network = (process.env.FUTARCHY_NETWORK as 'mainnet' | 'devnet') || 'mainnet';
  const client = new Futarchy402Client({ network });
  console.log(`🌐 Network: ${network}\n`);

  try {
    // Get all polls
    console.log('📋 Fetching all polls...\n');
    const allPolls = [];
    let offset = 0;
    const limit = 50;

    // Fetch all polls with pagination
    while (true) {
      const { polls, pagination } = await client.listPolls({ limit, offset });
      allPolls.push(...polls);

      if (offset + limit >= pagination.total) {
        break;
      }
      offset += limit;
    }

    console.log(`Found ${allPolls.length} total poll(s)\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Track positions
    const openPositions = [];
    const resolvedPositions = [];
    let totalInvested = 0;
    let totalValue = 0;
    let totalProfit = 0;

    // Check position on each poll
    for (const poll of allPolls) {
      try {
        const position = await client.getPosition(poll.id, walletPubkey);

        totalInvested += position.amount_paid_usdc;

        if (position.poll_status === 'open') {
          openPositions.push({ poll, position });
          // For open positions, use projected value if side wins
          totalValue += position.if_side_wins_payout_usdc;
          totalProfit += position.if_side_wins_profit_usdc;
        } else if (position.poll_status === 'resolved') {
          resolvedPositions.push({ poll, position });
          if (position.actual_results) {
            totalValue += position.actual_results.actual_payout_usdc;
            totalProfit += position.actual_results.actual_profit_usdc;
          }
        }
      } catch (error: any) {
        // No position on this poll, skip
        if (!error.message?.includes('404')) {
          console.error(`⚠️  Error checking poll ${poll.id}: ${error.message}`);
        }
      }
    }

    // Display summary
    console.log('📊 PORTFOLIO SUMMARY\n');
    console.log(`Total positions: ${openPositions.length + resolvedPositions.length}`);
    console.log(`  Open: ${openPositions.length}`);
    console.log(`  Resolved: ${resolvedPositions.length}`);
    console.log(`\nTotal invested: $${totalInvested.toFixed(2)} USDC`);
    console.log(`Current/Final value: $${totalValue.toFixed(2)} USDC`);
    console.log(`Total profit/loss: $${totalProfit.toFixed(2)} USDC`);
    if (totalInvested > 0) {
      const totalROI = (totalProfit / totalInvested) * 100;
      console.log(`Overall ROI: ${totalROI.toFixed(2)}%`);
    }

    // Display open positions
    if (openPositions.length > 0) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📈 OPEN POSITIONS\n');

      openPositions.forEach(({ poll, position }, i) => {
        console.log(`${i + 1}. ${poll.proposal_name}`);
        console.log(`   Poll ID: ${poll.id}`);
        console.log(`   Voted: ${position.vote_side.toUpperCase()}`);
        console.log(`   Amount paid: $${position.amount_paid_usdc.toFixed(4)} USDC`);
        console.log(`   Share of ${position.vote_side} side: ${(position.user_share_of_side * 100).toFixed(4)}%`);
        console.log(`   Current market: YES ${(poll.implied_probability_yes * 100).toFixed(1)}% | NO ${(poll.implied_probability_no * 100).toFixed(1)}%`);
        console.log(`\n   If ${position.vote_side.toUpperCase()} wins:`);
        console.log(`     Payout: $${position.if_side_wins_payout_usdc.toFixed(4)} USDC`);
        console.log(`     Profit: $${position.if_side_wins_profit_usdc.toFixed(4)} USDC`);
        console.log(`     ROI: ${position.if_side_wins_roi_percent.toFixed(2)}%`);
        console.log(`\n   If ${position.vote_side.toUpperCase()} loses:`);
        console.log(`     Loss: $${Math.abs(position.if_side_loses_profit_usdc).toFixed(4)} USDC`);
        console.log(`     ROI: ${position.if_side_loses_roi_percent.toFixed(2)}%`);
        console.log(`\n   Closes: ${poll.closes_at}`);
        console.log('');
      });
    }

    // Display resolved positions
    if (resolvedPositions.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 RESOLVED POSITIONS\n');

      let wins = 0;
      let losses = 0;
      let resolvedProfit = 0;

      resolvedPositions.forEach(({ poll, position }, i) => {
        const won = position.actual_results?.result === 'won';
        if (won) wins++;
        else losses++;

        if (position.actual_results) {
          resolvedProfit += position.actual_results.actual_profit_usdc;
        }

        console.log(`${i + 1}. ${poll.proposal_name}`);
        console.log(`   Poll ID: ${poll.id}`);
        console.log(`   Voted: ${position.vote_side.toUpperCase()}`);
        console.log(`   Amount paid: $${position.amount_paid_usdc.toFixed(4)} USDC`);
        console.log(`   Outcome: ${position.poll_outcome?.toUpperCase()}`);
        console.log(`   Result: ${won ? '🎉 WON' : '😔 LOST'}`);

        if (position.actual_results) {
          console.log(`   Payout: $${position.actual_results.actual_payout_usdc.toFixed(4)} USDC`);
          console.log(`   Profit/Loss: $${position.actual_results.actual_profit_usdc.toFixed(4)} USDC`);
          console.log(`   ROI: ${position.actual_results.actual_roi_percent.toFixed(2)}%`);
        }
        console.log('');
      });

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🏆 RESOLVED PERFORMANCE\n');
      console.log(`Wins: ${wins}`);
      console.log(`Losses: ${losses}`);
      if (wins + losses > 0) {
        console.log(`Win rate: ${((wins / (wins + losses)) * 100).toFixed(1)}%`);
      }
      console.log(`Total profit/loss: $${resolvedProfit.toFixed(2)} USDC`);
    }

    if (openPositions.length === 0 && resolvedPositions.length === 0) {
      console.log('📭 No positions found for this wallet.');
      console.log('   This wallet has not voted on any polls yet.\n');
    }

    console.log('\n✅ Analysis complete!\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message || error);
    process.exit(1);
  }
}

// Run the example
main();
