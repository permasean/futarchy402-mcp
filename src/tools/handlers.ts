/**
 * Universal tool handlers
 * Platform-agnostic implementations that use the core SDK
 */

import { Futarchy402Client } from '../core/client.js';
import { executeVote } from '../core/x402.js';
import { ToolNames } from './definitions.js';

export interface ToolContext {
  client: Futarchy402Client;
}

export type ToolHandler = (context: ToolContext, args: any) => Promise<any>;

/**
 * Handle list_polls tool
 */
export const handleListPolls: ToolHandler = async (context, args) => {
  const { status, treasury_id, limit, offset } = args;

  const result = await context.client.listPolls({
    status,
    treasury_id,
    limit: limit ?? 20,
    offset: offset ?? 0,
  });

  return {
    polls: result.polls.map((poll) => ({
      id: poll.id,
      status: poll.status,
      outcome: poll.outcome,
      proposal_name: poll.proposals.name,
      proposal_description: poll.proposals.description,
      project_name: poll.proposals.treasuries.projects.name,
      amount_usdc: parseFloat(poll.proposals.amount_usdc_base_units) / 1_000_000,
      total_liquidity_usdc: parseFloat(poll.poll_pool_usdc_base_units) / 1_000_000,
      yes_liquidity_usdc: parseFloat(poll.yes_liquidity_usdc_base_units) / 1_000_000,
      no_liquidity_usdc: parseFloat(poll.no_liquidity_usdc_base_units) / 1_000_000,
      entry_fee_yes_usdc: poll.current_entry_fee_yes_usdc,
      entry_fee_no_usdc: poll.current_entry_fee_no_usdc,
      implied_probability_yes: poll.implied_probability_yes,
      implied_probability_no: poll.implied_probability_no,
      yes_votes: poll.yes_votes,
      no_votes: poll.no_votes,
      total_votes: poll.total_votes,
      closes_at: poll.closes_at,
      created_at: poll.created_at,
    })),
    pagination: result.pagination,
  };
};

/**
 * Handle get_poll tool
 */
export const handleGetPoll: ToolHandler = async (context, args) => {
  const { poll_id } = args;

  if (!poll_id) {
    throw new Error('poll_id is required');
  }

  const poll = await context.client.getPoll(poll_id);

  return {
    id: poll.id,
    status: poll.status,
    outcome: poll.outcome,
    proposal: {
      name: poll.proposals.name,
      description: poll.proposals.description,
      amount_usdc: parseFloat(poll.proposals.amount_usdc_base_units) / 1_000_000,
      to_pubkey: poll.proposals.to_pubkey,
      project_name: poll.proposals.treasuries.projects.name,
    },
    liquidity: {
      total_usdc: parseFloat(poll.poll_pool_usdc_base_units) / 1_000_000,
      yes_usdc: parseFloat(poll.yes_liquidity_usdc_base_units) / 1_000_000,
      no_usdc: parseFloat(poll.no_liquidity_usdc_base_units) / 1_000_000,
      base_fee_usdc: parseFloat(poll.base_fee_usdc_base_units) / 1_000_000,
    },
    current_prices: {
      entry_fee_yes_usdc: poll.current_entry_fee_yes_usdc,
      entry_fee_no_usdc: poll.current_entry_fee_no_usdc,
      implied_probability_yes: poll.implied_probability_yes,
      implied_probability_no: poll.implied_probability_no,
    },
    vote_counts: {
      yes: poll.yes_votes,
      no: poll.no_votes,
      total: poll.total_votes,
    },
    votes: poll.votes.map((vote) => ({
      id: vote.id,
      voter_pubkey: vote.voter_pubkey,
      side: vote.side,
      amount_paid_usdc: parseFloat(vote.amount_paid_usdc_base_units) / 1_000_000,
      transaction_signature: vote.transaction_signature,
      created_at: vote.created_at,
    })),
    poll_wallet_pubkey: poll.poll_wallet_pubkey,
    closes_at: poll.closes_at,
    created_at: poll.created_at,
  };
};

/**
 * Handle get_position tool
 */
export const handleGetPosition: ToolHandler = async (context, args) => {
  const { poll_id, voter_pubkey } = args;

  if (!poll_id) {
    throw new Error('poll_id is required');
  }
  if (!voter_pubkey) {
    throw new Error('voter_pubkey is required');
  }

  const position = await context.client.getPosition(poll_id, voter_pubkey);

  return {
    poll_id: position.poll_id,
    voter_pubkey: position.voter_pubkey,
    poll_status: position.poll_status,
    poll_outcome: position.poll_outcome,
    vote_side: position.vote_side,
    amount_paid_usdc: position.amount_paid_usdc,
    vote_timestamp: position.vote_timestamp,
    pool_stats: {
      total_pot_usdc: position.total_pot_usdc,
      same_side_total_usdc: position.same_side_total_usdc,
      user_share_of_side: position.user_share_of_side,
      yes_votes: position.yes_votes,
      no_votes: position.no_votes,
    },
    projection: {
      projected_winner: position.projected_winner,
      potential_payout_usdc: position.potential_payout_usdc,
      potential_profit_usdc: position.potential_profit_usdc,
      potential_roi_percent: position.potential_roi_percent,
    },
    actual_results:
      position.poll_status === 'resolved'
        ? {
            result: position.result,
            actual_payout_usdc: position.actual_payout_usdc,
            actual_profit_usdc: position.actual_profit_usdc,
            actual_roi_percent: position.actual_roi_percent,
          }
        : null,
  };
};

/**
 * Handle vote tool - CRITICAL FUNCTION
 */
export const handleVote: ToolHandler = async (context, args) => {
  const { poll_id, side, wallet_private_key, slippage } = args;

  if (!poll_id) {
    throw new Error('poll_id is required');
  }
  if (!side) {
    throw new Error('side is required');
  }
  if (side !== 'yes' && side !== 'no') {
    throw new Error('side must be "yes" or "no"');
  }
  if (!wallet_private_key) {
    throw new Error('wallet_private_key is required');
  }

  const result = await executeVote({
    pollId: poll_id,
    side,
    walletPrivateKey: wallet_private_key,
    slippage: slippage ?? 0.05,
    apiBaseUrl: context.client.getBaseUrl(),
  });

  if (!result.success) {
    throw new Error(result.error || 'Vote failed');
  }

  return {
    success: true,
    vote_id: result.vote_id,
    transaction_signature: result.transaction_signature,
    amount_paid_usdc: result.amount_paid_usdc_base_units
      ? parseFloat(result.amount_paid_usdc_base_units) / 1_000_000
      : undefined,
    quoted_amount_usdc: result.quoted_amount_usdc_base_units
      ? parseFloat(result.quoted_amount_usdc_base_units) / 1_000_000
      : undefined,
    actual_slippage_percent: result.actual_slippage ? result.actual_slippage * 100 : undefined,
    voter_pubkey: result.voter_pubkey,
    side: result.side,
    poll_id: result.poll_id,
    timestamp: result.timestamp,
  };
};

/**
 * Handle get_stats tool
 */
export const handleGetStats: ToolHandler = async (context, args) => {
  const stats = await context.client.getStats();

  return {
    active_polls: stats.active_polls,
    total_projects: stats.total_projects,
    total_proposals: stats.total_proposals,
  };
};

/**
 * Tool handler registry
 */
export const toolHandlers: Record<string, ToolHandler> = {
  [ToolNames.LIST_POLLS]: handleListPolls,
  [ToolNames.GET_POLL]: handleGetPoll,
  [ToolNames.GET_POSITION]: handleGetPosition,
  [ToolNames.VOTE]: handleVote,
  [ToolNames.GET_STATS]: handleGetStats,
};

/**
 * Execute a tool by name
 */
export async function executeTool(
  toolName: string,
  args: any,
  context: ToolContext
): Promise<any> {
  const handler = toolHandlers[toolName];
  if (!handler) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  return await handler(context, args);
}
