/**
 * Core types for Futarchy402 MCP
 */

export type PollStatus = 'open' | 'resolved';
export type PollOutcome = 'yes' | 'no' | 'tie' | null;
export type VoteSide = 'yes' | 'no';

export interface Poll {
  id: string;
  status: PollStatus;
  outcome: PollOutcome;
  poll_wallet_pubkey: string;
  poll_pool_usdc_base_units: string;
  yes_liquidity_usdc_base_units: string;
  no_liquidity_usdc_base_units: string;
  base_fee_usdc_base_units: string;
  closes_at: string;
  created_at: string;
  proposals: {
    name: string;
    description: string;
    amount_usdc_base_units: string;
    to_pubkey: string;
    treasuries: {
      pubkey: string;
      projects: {
        name: string;
      };
    };
  };
  current_entry_fee_yes_usdc: number;
  current_entry_fee_no_usdc: number;
  implied_probability_yes: number;
  implied_probability_no: number;
  yes_votes: number;
  no_votes: number;
  total_votes: number;
}

export interface PollListResponse {
  polls: Poll[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface Vote {
  id: string;
  voter_pubkey: string;
  side: VoteSide;
  amount_paid_usdc_base_units: string;
  transaction_signature: string;
  created_at: string;
}

export interface PollDetails extends Poll {
  votes: Vote[];
}

export interface Position {
  poll_id: string;
  voter_pubkey: string;
  poll_status: PollStatus;
  poll_outcome: PollOutcome;
  vote_side: VoteSide;
  amount_paid_usdc: number;
  vote_timestamp: string;
  total_pot_usdc: number;
  same_side_total_usdc: number;
  user_share_of_side: number;
  yes_votes: number;
  no_votes: number;
  projected_winner: 'yes' | 'no' | 'tie';
  potential_payout_usdc: number;
  potential_profit_usdc: number;
  potential_roi_percent: number;
  actual_payout_usdc?: number;
  actual_profit_usdc?: number;
  actual_roi_percent?: number;
  result?: 'won' | 'lost' | 'tie';
}

export interface Stats {
  active_polls: number;
  total_projects: number;
  total_proposals: number;
}

export interface VoteResult {
  success: boolean;
  vote_id?: string;
  transaction_signature?: string;
  amount_paid_usdc_base_units?: string;
  quoted_amount_usdc_base_units?: string;
  actual_slippage?: number;
  voter_pubkey?: string;
  side?: VoteSide;
  poll_id?: string;
  timestamp?: string;
  error?: string;
}

export interface X402PaymentRequirements {
  network: string;
  payTo: string;
  amount: string;
  splToken: string;
  memo?: string;
  resource: string;
  description: string;
  extra: {
    quotedAmount: string;
    quotedAt: number;
    quoteExpiry: number;
    maxSlippage: number;
    maxAmount: string;
    yesLiquidity: string;
    noLiquidity: string;
  };
}
