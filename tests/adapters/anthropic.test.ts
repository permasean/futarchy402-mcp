/**
 * Tests for Anthropic/Claude adapter
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { toClaudeTool, getClaudeTools, ClaudeFutarchyAdapter } from '../../src/adapters/anthropic/adapter.js';
import { listPollsTool, voteTool } from '../../src/tools/definitions.js';
import { mockPollListResponse } from '../fixtures/polls.js';

// Mock node-fetch
vi.mock('node-fetch');

import fetch from 'node-fetch';
const mockFetch = vi.mocked(fetch);

describe('Anthropic/Claude Adapter', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('toClaudeTool', () => {
    it('should convert universal tool to Claude format', () => {
      const claudeTool = toClaudeTool(listPollsTool);

      expect(claudeTool.name).toBe('futarchy_list_polls');
      expect(claudeTool.description).toBeDefined();
      expect(claudeTool.input_schema.type).toBe('object');
      expect(claudeTool.input_schema.properties).toBeDefined();
    });

    it('should include enum values', () => {
      const claudeTool = toClaudeTool(voteTool);

      expect(claudeTool.input_schema.properties.side.enum).toEqual(['yes', 'no']);
    });

    it('should mark required parameters', () => {
      const claudeTool = toClaudeTool(voteTool);

      expect(claudeTool.input_schema.required).toContain('poll_id');
      expect(claudeTool.input_schema.required).toContain('side');
      // wallet_private_key is now optional (can use WALLET_PRIVATE_KEY env var)
      expect(claudeTool.input_schema.required).not.toContain('wallet_private_key');
    });

    it('should preserve descriptions', () => {
      const claudeTool = toClaudeTool(listPollsTool);

      expect(claudeTool.input_schema.properties.status.description).toBeDefined();
    });
  });

  describe('getClaudeTools', () => {
    it('should return all tools in Claude format', () => {
      const tools = getClaudeTools();

      expect(tools).toHaveLength(6);
      tools.forEach((tool) => {
        expect(tool.name).toBeDefined();
        expect(tool.input_schema).toBeDefined();
      });
    });
  });

  describe('ClaudeFutarchyAdapter', () => {
    it('should create adapter with default client', () => {
      const adapter = new ClaudeFutarchyAdapter();

      expect(adapter.getTools()).toHaveLength(6);
      expect(adapter.getClient()).toBeDefined();
    });

    it('should execute tool successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPollListResponse,
      } as any);

      const adapter = new ClaudeFutarchyAdapter();
      const result = await adapter.executeTool('futarchy_list_polls', {});

      expect(result.polls).toBeDefined();
      expect(Array.isArray(result.polls)).toBe(true);
    });

    it('should handle execution errors', async () => {
      const adapter = new ClaudeFutarchyAdapter();
      const result = await adapter.executeTool('futarchy_get_poll', {});

      expect(result.error).toBeDefined();
      expect(result.error).toContain('poll_id is required');
    });

    it('should pass parameters correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ...mockPollListResponse, polls: [mockPollListResponse.polls[0]] }),
      } as any);

      const adapter = new ClaudeFutarchyAdapter();
      const result = await adapter.executeTool('futarchy_list_polls', {
        status: 'open',
      });

      expect(result.polls).toHaveLength(1);
      expect(result.polls[0].status).toBe('open');
    });
  });
});
