/**
 * Tests for OpenAI adapter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { toOpenAITool, getOpenAITools, OpenAIFutarchyAdapter } from '../../src/adapters/openai/adapter.js';
import { listPollsTool, voteTool } from '../../src/tools/definitions.js';
import { mockPollListResponse } from '../fixtures/polls.js';
import { MockFetchBuilder } from '../helpers/mock-fetch.js';

describe('OpenAI Adapter', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('toOpenAITool', () => {
    it('should convert universal tool to OpenAI format', () => {
      const openaiTool = toOpenAITool(listPollsTool);

      expect(openaiTool.type).toBe('function');
      expect(openaiTool.function.name).toBe('futarchy_list_polls');
      expect(openaiTool.function.description).toBeDefined();
      expect(openaiTool.function.parameters.type).toBe('object');
      expect(openaiTool.function.parameters.properties).toBeDefined();
    });

    it('should include enum values', () => {
      const openaiTool = toOpenAITool(voteTool);

      expect(openaiTool.function.parameters.properties.side.enum).toEqual(['yes', 'no']);
    });

    it('should include default values', () => {
      const openaiTool = toOpenAITool(listPollsTool);

      expect(openaiTool.function.parameters.properties.limit.default).toBe(20);
    });

    it('should mark required parameters', () => {
      const openaiTool = toOpenAITool(voteTool);

      expect(openaiTool.function.parameters.required).toContain('poll_id');
      expect(openaiTool.function.parameters.required).toContain('side');
      expect(openaiTool.function.parameters.required).toContain('wallet_private_key');
    });
  });

  describe('getOpenAITools', () => {
    it('should return all tools in OpenAI format', () => {
      const tools = getOpenAITools();

      expect(tools).toHaveLength(5);
      tools.forEach((tool) => {
        expect(tool.type).toBe('function');
        expect(tool.function.name).toBeDefined();
      });
    });
  });

  describe('OpenAIFutarchyAdapter', () => {
    it('should create adapter with default client', () => {
      const adapter = new OpenAIFutarchyAdapter();

      expect(adapter.getTools()).toHaveLength(5);
      expect(adapter.getClient()).toBeDefined();
    });

    it('should execute function successfully', async () => {
      const mockBuilder = new MockFetchBuilder();
      mockBuilder.addResponse('.*polls.*', {
        status: 200,
        body: mockPollListResponse,
      });
      global.fetch = mockBuilder.build();

      const adapter = new OpenAIFutarchyAdapter();
      const result = await adapter.executeFunction(
        'futarchy_list_polls',
        JSON.stringify({})
      );

      const parsed = JSON.parse(result);
      expect(parsed.polls).toBeDefined();
      expect(Array.isArray(parsed.polls)).toBe(true);
    });

    it('should handle execution errors', async () => {
      const adapter = new OpenAIFutarchyAdapter();
      const result = await adapter.executeFunction(
        'futarchy_get_poll',
        JSON.stringify({}) // Missing required poll_id
      );

      const parsed = JSON.parse(result);
      expect(parsed.error).toBeDefined();
    });

    it('should handle invalid JSON', async () => {
      const adapter = new OpenAIFutarchyAdapter();
      const result = await adapter.executeFunction(
        'futarchy_list_polls',
        'invalid json'
      );

      const parsed = JSON.parse(result);
      expect(parsed.error).toBeDefined();
    });
  });
});
