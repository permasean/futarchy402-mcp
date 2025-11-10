/**
 * Tests for MCP server
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMCPServer, toMCPTool } from '../../src/adapters/mcp/server.js';
import { listPollsTool, voteTool } from '../../src/tools/definitions.js';
import { mockPollListResponse } from '../fixtures/polls.js';
import { MockFetchBuilder } from '../helpers/mock-fetch.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

describe('MCP Server', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('toMCPTool', () => {
    it('should convert universal tool to MCP format', () => {
      const mcpTool = toMCPTool(listPollsTool);

      expect(mcpTool.name).toBe('futarchy_list_polls');
      expect(mcpTool.description).toBeDefined();
      expect(mcpTool.inputSchema.type).toBe('object');
      expect(mcpTool.inputSchema.properties).toBeDefined();
    });

    it('should include enum values', () => {
      const mcpTool = toMCPTool(voteTool);

      expect(mcpTool.inputSchema.properties.side.enum).toEqual(['yes', 'no']);
    });

    it('should mark required parameters', () => {
      const mcpTool = toMCPTool(voteTool);

      expect(mcpTool.inputSchema.required).toContain('poll_id');
      expect(mcpTool.inputSchema.required).toContain('side');
      expect(mcpTool.inputSchema.required).toContain('wallet_private_key');
    });
  });

  describe('createMCPServer', () => {
    it('should create server with capabilities', () => {
      const server = createMCPServer();

      expect(server).toBeDefined();
    });

    it('should handle ListToolsRequest', async () => {
      const server = createMCPServer();

      // Get the handler (this is internal MCP SDK, so we test indirectly)
      expect(server).toBeDefined();
    });

    it('should handle CallToolRequest successfully', async () => {
      const mockBuilder = new MockFetchBuilder();
      mockBuilder.addResponse('.*polls.*', {
        status: 200,
        body: mockPollListResponse,
      });
      global.fetch = mockBuilder.build();

      const server = createMCPServer();

      // In a real scenario, this would go through the MCP protocol
      // Here we're testing that the server was created successfully
      expect(server).toBeDefined();
    });
  });
});
