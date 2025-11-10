/**
 * Tests for universal tool handlers
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { executeTool, ToolContext } from '../../src/tools/handlers.js';
import { ToolNames } from '../../src/tools/definitions.js';
import { Futarchy402Client } from '../../src/core/client.js';
import { mockPollListResponse, mockPollDetails, mockPosition, mockStats } from '../fixtures/polls.js';
import { MockFetchBuilder } from '../helpers/mock-fetch.js';

describe('Tool Handlers', () => {
  let context: ToolContext;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    const client = new Futarchy402Client({
      apiBaseUrl: 'https://test-api.example.com',
    });
    context = { client };
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('handleListPolls', () => {
    it('should list polls with formatted output', async () => {
      const mockBuilder = new MockFetchBuilder();
      mockBuilder.addResponse('.*polls.*', {
        status: 200,
        body: mockPollListResponse,
      });
      global.fetch = mockBuilder.build();

      const result = await executeTool(ToolNames.LIST_POLLS, {}, context);

      expect(result.polls).toHaveLength(2);
      expect(result.polls[0].total_liquidity_usdc).toBe(1000); // 1000000000 / 1M
      expect(result.polls[0].entry_fee_yes_usdc).toBe(10.5);
      expect(result.pagination).toBeDefined();
    });

    it('should filter by status', async () => {
      const mockBuilder = new MockFetchBuilder();
      mockBuilder.addResponse('.*status=open.*', {
        status: 200,
        body: { ...mockPollListResponse, polls: [mockPollListResponse.polls[0]] },
      });
      global.fetch = mockBuilder.build();

      const result = await executeTool(
        ToolNames.LIST_POLLS,
        { status: 'open' },
        context
      );

      expect(result.polls).toHaveLength(1);
      expect(result.polls[0].status).toBe('open');
    });

    it('should apply pagination', async () => {
      const mockBuilder = new MockFetchBuilder();
      mockBuilder.addResponse('.*limit=10.*offset=20.*', {
        status: 200,
        body: mockPollListResponse,
      });
      global.fetch = mockBuilder.build();

      const result = await executeTool(
        ToolNames.LIST_POLLS,
        { limit: 10, offset: 20 },
        context
      );

      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.offset).toBe(20);
    });
  });

  describe('handleGetPoll', () => {
    it('should get poll with formatted output', async () => {
      const mockBuilder = new MockFetchBuilder();
      mockBuilder.addResponse('.*poll/test-poll-1', {
        status: 200,
        body: mockPollDetails,
      });
      global.fetch = mockBuilder.build();

      const result = await executeTool(
        ToolNames.GET_POLL,
        { poll_id: 'test-poll-1' },
        context
      );

      expect(result.id).toBe('test-poll-1');
      expect(result.proposal.amount_usdc).toBe(50000); // 50000000000 / 1M
      expect(result.liquidity.total_usdc).toBe(1000);
      expect(result.votes).toHaveLength(2);
      expect(result.votes[0].amount_paid_usdc).toBe(10.5);
    });

    it('should throw if poll_id is missing', async () => {
      await expect(executeTool(ToolNames.GET_POLL, {}, context)).rejects.toThrow(
        'poll_id is required'
      );
    });
  });

  describe('handleGetPosition', () => {
    it('should get position with formatted output', async () => {
      const mockBuilder = new MockFetchBuilder();
      mockBuilder.addResponse('.*position.*', {
        status: 200,
        body: mockPosition,
      });
      global.fetch = mockBuilder.build();

      const result = await executeTool(
        ToolNames.GET_POSITION,
        { poll_id: 'test-poll-1', voter_pubkey: 'Voter1' },
        context
      );

      expect(result.poll_id).toBe('test-poll-1');
      expect(result.vote_side).toBe('yes');
      expect(result.pool_stats).toBeDefined();
      expect(result.projection).toBeDefined();
      expect(result.projection.potential_roi_percent).toBe(81.43);
    });

    it('should include actual results for resolved polls', async () => {
      const mockBuilder = new MockFetchBuilder();
      mockBuilder.addResponse('.*position.*', {
        status: 200,
        body: {
          ...mockPosition,
          poll_status: 'resolved',
          poll_outcome: 'yes',
          result: 'won',
          actual_payout_usdc: 19.05,
          actual_profit_usdc: 8.55,
          actual_roi_percent: 81.43,
        },
      });
      global.fetch = mockBuilder.build();

      const result = await executeTool(
        ToolNames.GET_POSITION,
        { poll_id: 'test-poll-2', voter_pubkey: 'Voter1' },
        context
      );

      expect(result.actual_results).toBeDefined();
      expect(result.actual_results.result).toBe('won');
      expect(result.actual_results.actual_roi_percent).toBe(81.43);
    });

    it('should throw if parameters are missing', async () => {
      await expect(
        executeTool(ToolNames.GET_POSITION, { poll_id: 'test' }, context)
      ).rejects.toThrow('voter_pubkey is required');

      await expect(
        executeTool(ToolNames.GET_POSITION, { voter_pubkey: 'Voter1' }, context)
      ).rejects.toThrow('poll_id is required');
    });
  });

  describe('handleGetStats', () => {
    it('should get platform stats', async () => {
      const mockBuilder = new MockFetchBuilder();
      mockBuilder.addResponse('.*stats', {
        status: 200,
        body: mockStats,
      });
      global.fetch = mockBuilder.build();

      const result = await executeTool(ToolNames.GET_STATS, {}, context);

      expect(result.active_polls).toBe(5);
      expect(result.total_projects).toBe(12);
      expect(result.total_proposals).toBe(27);
    });
  });

  describe('handleVote', () => {
    it('should validate required parameters', async () => {
      await expect(
        executeTool(ToolNames.VOTE, {}, context)
      ).rejects.toThrow('poll_id is required');

      await expect(
        executeTool(ToolNames.VOTE, { poll_id: 'test' }, context)
      ).rejects.toThrow('side is required');

      await expect(
        executeTool(ToolNames.VOTE, { poll_id: 'test', side: 'yes' }, context)
      ).rejects.toThrow('wallet_private_key is required');
    });

    it('should validate vote side', async () => {
      await expect(
        executeTool(
          ToolNames.VOTE,
          { poll_id: 'test', side: 'invalid', wallet_private_key: 'key' },
          context
        )
      ).rejects.toThrow('side must be "yes" or "no"');
    });

    it('should format vote result with USDC conversion', async () => {
      const mockBuilder = new MockFetchBuilder();

      mockBuilder.addResponse('.*vote.*', {
        status: 402,
        headers: {
          'x-payment-required': JSON.stringify({
            network: 'solana-devnet',
            payTo: 'TestAddress',
            amount: '10000000',
            splToken: 'USDC',
            resource: '/poll/test/vote',
            description: 'Test vote',
            extra: {
              quotedAmount: '10000000',
              quotedAt: Date.now(),
              quoteExpiry: Date.now() + 60000,
              maxSlippage: 0.05,
              maxAmount: '11000000',
              yesLiquidity: '500000000',
              noLiquidity: '500000000',
            },
          }),
        },
      });

      mockBuilder.addResponse('.*facilitator.*', {
        status: 200,
        body: {
          transaction: Buffer.from('mock-tx').toString('base64'),
        },
      });

      mockBuilder.addResponse('.*vote.*', {
        status: 200,
        body: {
          success: true,
          vote_id: 'vote-123',
          transaction_signature: 'sig123',
          amount_paid_usdc_base_units: '10500000',
          quoted_amount_usdc_base_units: '10000000',
          actual_slippage: 0.05,
          voter_pubkey: 'Voter1',
          side: 'yes',
          poll_id: 'test',
          timestamp: '2025-01-01T00:00:00Z',
        },
      });

      global.fetch = mockBuilder.build();

      const result = await executeTool(
        ToolNames.VOTE,
        {
          poll_id: 'test',
          side: 'yes',
          wallet_private_key: Buffer.from(new Uint8Array(64)).toString('base64'),
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.amount_paid_usdc).toBe(10.5); // 10500000 / 1M
      expect(result.quoted_amount_usdc).toBe(10); // 10000000 / 1M
      expect(result.actual_slippage_percent).toBe(5); // 0.05 * 100
    });
  });

  describe('executeTool', () => {
    it('should throw on unknown tool', async () => {
      await expect(
        executeTool('unknown_tool', {}, context)
      ).rejects.toThrow('Unknown tool: unknown_tool');
    });
  });
});
