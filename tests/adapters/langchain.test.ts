/**
 * Tests for LangChain adapter
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getLangChainTools, LangChainFutarchyAdapter } from '../../src/adapters/langchain/adapter.js';
import { mockPollListResponse } from '../fixtures/polls.js';

// Mock node-fetch
vi.mock('node-fetch');

import fetch from 'node-fetch';
const mockFetch = vi.mocked(fetch);

describe('LangChain Adapter', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('getLangChainTools', () => {
    it('should return all tools as DynamicStructuredTool', () => {
      const tools = getLangChainTools();

      expect(tools).toHaveLength(6);
      tools.forEach((tool) => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.schema).toBeDefined();
      });
    });

    it('should have correct tool names', () => {
      const tools = getLangChainTools();
      const names = tools.map((t) => t.name);

      expect(names).toContain('futarchy_list_polls');
      expect(names).toContain('futarchy_get_poll');
      expect(names).toContain('futarchy_get_position');
      expect(names).toContain('futarchy_vote');
      expect(names).toContain('futarchy_get_stats');
    });
  });

  describe('LangChainFutarchyAdapter', () => {
    it('should create adapter with default client', () => {
      const adapter = new LangChainFutarchyAdapter();

      expect(adapter.getTools()).toHaveLength(6);
      expect(adapter.getClient()).toBeDefined();
    });

    it('should get tool by name', () => {
      const adapter = new LangChainFutarchyAdapter();
      const tool = adapter.getTool('futarchy_list_polls');

      expect(tool).toBeDefined();
      expect(tool?.name).toBe('futarchy_list_polls');
    });

    it('should return undefined for unknown tool', () => {
      const adapter = new LangChainFutarchyAdapter();
      const tool = adapter.getTool('unknown_tool');

      expect(tool).toBeUndefined();
    });

    it('should execute tool successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPollListResponse,
      } as any);

      const adapter = new LangChainFutarchyAdapter();
      const tool = adapter.getTool('futarchy_list_polls');

      if (!tool) {
        throw new Error('Tool not found');
      }

      const result = await tool.func({});
      const parsed = JSON.parse(result);

      expect(parsed.polls).toBeDefined();
      expect(Array.isArray(parsed.polls)).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const adapter = new LangChainFutarchyAdapter();
      const tool = adapter.getTool('futarchy_get_poll');

      if (!tool) {
        throw new Error('Tool not found');
      }

      const result = await tool.func({});
      const parsed = JSON.parse(result);

      expect(parsed.error).toBeDefined();
    });

    it('should pass parameters correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ...mockPollListResponse, polls: [mockPollListResponse.polls[0]] }),
      } as any);

      const adapter = new LangChainFutarchyAdapter();
      const tool = adapter.getTool('futarchy_list_polls');

      if (!tool) {
        throw new Error('Tool not found');
      }

      const result = await tool.func({ status: 'open' });
      const parsed = JSON.parse(result);

      expect(parsed.polls).toHaveLength(1);
      expect(parsed.polls[0].status).toBe('open');
    });
  });
});
