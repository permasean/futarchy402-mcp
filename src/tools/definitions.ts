/**
 * Universal tool definitions for Futarchy402
 * Platform-agnostic schemas that can be adapted to any AI framework
 */

export interface ToolParameter {
  type: string;
  description: string;
  enum?: string[];
  default?: any;
  required?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    [key: string]: ToolParameter;
  };
  required: string[];
}

/**
 * List polls with optional filtering
 */
export const listPollsTool: ToolDefinition = {
  name: 'futarchy_list_polls',
  description:
    'List governance polls from Futarchy402. Can filter by status (open/resolved) or treasury. Returns poll details including liquidity, entry fees, implied probabilities, and vote counts.',
  parameters: {
    status: {
      type: 'string',
      description: 'Filter by poll status',
      enum: ['open', 'resolved'],
    },
    treasury_id: {
      type: 'string',
      description: 'Filter by treasury ID',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of polls to return',
      default: 20,
    },
    offset: {
      type: 'number',
      description: 'Pagination offset',
      default: 0,
    },
  },
  required: [],
};

/**
 * Get detailed poll information
 */
export const getPollTool: ToolDefinition = {
  name: 'futarchy_get_poll',
  description:
    'Get detailed information about a specific poll including all votes, proposal details, current liquidity, entry fees, and voting statistics. Use this to see the full history and current state of a poll.',
  parameters: {
    poll_id: {
      type: 'string',
      description: 'The unique identifier of the poll',
      required: true,
    },
  },
  required: ['poll_id'],
};

/**
 * Get wallet position in a poll
 */
export const getPositionTool: ToolDefinition = {
  name: 'futarchy_get_position',
  description:
    "Get a wallet's position in a specific poll. Shows the vote side, amount paid, projected payout, potential profit/loss, ROI, and if the poll is resolved, the actual results. Essential for tracking investment performance.",
  parameters: {
    poll_id: {
      type: 'string',
      description: 'The poll ID',
      required: true,
    },
    voter_pubkey: {
      type: 'string',
      description: 'The Solana wallet public key of the voter',
      required: true,
    },
  },
  required: ['poll_id', 'voter_pubkey'],
};

/**
 * Execute a vote using x402 payment protocol
 */
export const voteTool: ToolDefinition = {
  name: 'futarchy_vote',
  description:
    'Vote on a governance poll using the x402 payment-gated protocol. Voting requires payment in USDC which contributes to the liquidity pool. The amount paid determines your share of the winning side. CRITICAL: Requires wallet private key to sign the payment transaction. This will execute a real on-chain transaction.',
  parameters: {
    poll_id: {
      type: 'string',
      description: 'The poll ID to vote on',
      required: true,
    },
    side: {
      type: 'string',
      description: 'Which side to vote for',
      enum: ['yes', 'no'],
      required: true,
    },
    wallet_private_key: {
      type: 'string',
      description: 'Base58 encoded Solana wallet private key for signing the payment transaction. Optional if WALLET_PRIVATE_KEY environment variable is set.',
      required: false,
    },
    slippage: {
      type: 'number',
      description: 'Maximum allowed slippage for entry fee changes (0.05 = 5%)',
      default: 0.05,
    },
  },
  required: ['poll_id', 'side'],
};

/**
 * Get platform statistics
 */
export const getStatsTool: ToolDefinition = {
  name: 'futarchy_get_stats',
  description:
    'Get platform-wide statistics including total number of active polls, projects, and proposals. Useful for understanding the overall activity on Futarchy402.',
  parameters: {},
  required: [],
};

/**
 * All available tools
 */
export const allTools: ToolDefinition[] = [
  listPollsTool,
  getPollTool,
  getPositionTool,
  voteTool,
  getStatsTool,
];

/**
 * Tool names for easy reference
 */
export const ToolNames = {
  LIST_POLLS: 'futarchy_list_polls',
  GET_POLL: 'futarchy_get_poll',
  GET_POSITION: 'futarchy_get_position',
  VOTE: 'futarchy_vote',
  GET_STATS: 'futarchy_get_stats',
} as const;
