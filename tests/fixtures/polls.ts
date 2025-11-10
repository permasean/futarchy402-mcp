/**
 * Mock data fixtures for tests
 */

import type { Poll, PollDetails, Position, Stats } from '../../src/core/types.js';

export const mockPoll: Poll = {
  id: 'test-poll-1',
  status: 'open',
  outcome: null,
  poll_wallet_pubkey: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  poll_pool_usdc_base_units: '1000000000',
  yes_liquidity_usdc_base_units: '500000000',
  no_liquidity_usdc_base_units: '500000000',
  base_fee_usdc_base_units: '100000',
  closes_at: '2025-12-31T23:59:59Z',
  created_at: '2025-01-01T00:00:00Z',
  proposals: {
    name: 'Fund Development',
    description: 'Allocate funds for Q1 development',
    amount_usdc_base_units: '50000000000',
    to_pubkey: '8xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsV',
    treasuries: {
      pubkey: '9xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsW',
      projects: {
        name: 'Test Project',
      },
    },
  },
  current_entry_fee_yes_usdc: 10.5,
  current_entry_fee_no_usdc: 9.8,
  implied_probability_yes: 0.52,
  implied_probability_no: 0.48,
  yes_votes: 15,
  no_votes: 12,
  total_votes: 27,
};

export const mockResolvedPoll: Poll = {
  ...mockPoll,
  id: 'test-poll-2',
  status: 'resolved',
  outcome: 'yes',
};

export const mockPollDetails: PollDetails = {
  ...mockPoll,
  votes: [
    {
      id: 'vote-1',
      voter_pubkey: 'Voter1PublicKey1234567890123456789012345678901',
      side: 'yes',
      amount_paid_usdc_base_units: '10500000',
      transaction_signature: 'sig1234567890',
      created_at: '2025-01-02T10:00:00Z',
    },
    {
      id: 'vote-2',
      voter_pubkey: 'Voter2PublicKey1234567890123456789012345678902',
      side: 'no',
      amount_paid_usdc_base_units: '9800000',
      transaction_signature: 'sig0987654321',
      created_at: '2025-01-02T11:00:00Z',
    },
  ],
};

export const mockPosition: Position = {
  poll_id: 'test-poll-1',
  voter_pubkey: 'Voter1PublicKey1234567890123456789012345678901',
  poll_status: 'open',
  poll_outcome: null,
  vote_side: 'yes',
  amount_paid_usdc: 10.5,
  vote_timestamp: '2025-01-02T10:00:00Z',
  total_pot_usdc: 1000,
  same_side_total_usdc: 525,
  user_share_of_side: 0.02,
  yes_votes: 15,
  no_votes: 12,
  projected_winner: 'yes',
  potential_payout_usdc: 19.05,
  potential_profit_usdc: 8.55,
  potential_roi_percent: 81.43,
};

export const mockResolvedPosition: Position = {
  ...mockPosition,
  poll_id: 'test-poll-2',
  poll_status: 'resolved',
  poll_outcome: 'yes',
  result: 'won',
  actual_payout_usdc: 19.05,
  actual_profit_usdc: 8.55,
  actual_roi_percent: 81.43,
};

export const mockStats: Stats = {
  active_polls: 5,
  total_projects: 12,
  total_proposals: 27,
};

export const mockPollListResponse = {
  polls: [mockPoll, mockResolvedPoll],
  pagination: {
    limit: 20,
    offset: 0,
    total: 2,
  },
};

export const mockVoteResult = {
  success: true,
  vote_id: 'vote-123',
  transaction_signature: 'sig1234567890abcdef',
  amount_paid_usdc_base_units: '10500000',
  quoted_amount_usdc_base_units: '10000000',
  actual_slippage: 0.05,
  voter_pubkey: 'Voter1PublicKey1234567890123456789012345678901',
  side: 'yes' as const,
  poll_id: 'test-poll-1',
  timestamp: '2025-01-02T10:00:00Z',
};

export const mockX402PaymentRequirements = {
  network: 'solana-devnet',
  payTo: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  amount: '10500000',
  splToken: 'USDC',
  memo: 'Vote on poll test-poll-1',
  resource: '/poll/test-poll-1/vote',
  description: 'Vote yes on poll test-poll-1',
  extra: {
    quotedAmount: '10000000',
    quotedAt: Date.now(),
    quoteExpiry: Date.now() + 60000,
    maxSlippage: 0.05,
    maxAmount: '11000000',
    yesLiquidity: '500000000',
    noLiquidity: '500000000',
  },
};
