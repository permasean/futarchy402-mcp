/**
 * Simplified tests for universal tool handlers
 * Focuses on validation and formatting without complex API mocking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeTool, ToolContext } from '../../src/tools/handlers.js';
import { ToolNames } from '../../src/tools/definitions.js';
import { Futarchy402Client } from '../../src/core/client.js';
import { mockPollListResponse, mockPollDetails, mockPosition, mockStats } from '../fixtures/polls.js';

// Mock node-fetch
vi.mock('node-fetch');

import fetch from 'node-fetch';
const mockFetch = vi.mocked(fetch);

describe('Tool Handlers', () => {
  let context: ToolContext;

  beforeEach(() => {
    const client = new Futarchy402Client({
      apiBaseUrl: 'https://test-api.example.com',
    });
    context = { client };
    mockFetch.mockReset();
  });

  describe('handleListPolls', () => {
    it('should list polls with formatted output', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPollListResponse,
      } as any);

      const result = await executeTool(ToolNames.LIST_POLLS, {}, context);

      expect(result.polls).toHaveLength(2);
      expect(result.polls[0].total_liquidity_usdc).toBe(1000); // 1000000000 / 1M
      expect(result.polls[0].entry_fee_yes_usdc).toBe(10.5);
      expect(result.pagination).toBeDefined();
    });

    it('should filter by status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ...mockPollListResponse, polls: [mockPollListResponse.polls[0]] }),
      } as any);

      const result = await executeTool(
        ToolNames.LIST_POLLS,
        { status: 'open' },
        context
      );

      expect(result.polls).toHaveLength(1);
      expect(result.polls[0].status).toBe('open');
    });
  });

  describe('handleGetPoll', () => {
    it('should get poll with formatted output and USDC conversion', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPollDetails,
      } as any);

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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPosition,
      } as any);

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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ...mockPosition,
          poll_status: 'resolved',
          poll_outcome: 'yes',
          result: 'won',
          actual_payout_usdc: 19.05,
          actual_profit_usdc: 8.55,
          actual_roi_percent: 81.43,
        }),
      } as any);

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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockStats,
      } as any);

      const result = await executeTool(ToolNames.GET_STATS, {}, context);

      expect(result.active_polls).toBe(5);
      expect(result.total_projects).toBe(12);
      expect(result.total_proposals).toBe(27);
    });
  });

  describe('handleVote - Validation', () => {
    it('should validate required poll_id parameter', async () => {
      await expect(
        executeTool(ToolNames.VOTE, {}, context)
      ).rejects.toThrow('poll_id is required');
    });

    it('should validate required side parameter', async () => {
      await expect(
        executeTool(ToolNames.VOTE, { poll_id: 'test' }, context)
      ).rejects.toThrow('side is required');
    });

    it('should validate required wallet_private_key parameter', async () => {
      await expect(
        executeTool(ToolNames.VOTE, { poll_id: 'test', side: 'yes' }, context)
      ).rejects.toThrow('wallet_private_key is required');
    });

    it('should validate vote side must be yes or no', async () => {
      await expect(
        executeTool(
          ToolNames.VOTE,
          { poll_id: 'test', side: 'invalid', wallet_private_key: 'key' },
          context
        )
      ).rejects.toThrow('side must be "yes" or "no"');
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
