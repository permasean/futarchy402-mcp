/**
 * Tests for MCP server
 */

import { describe, it, expect } from 'vitest';
import { createMCPServer, toMCPTool } from '../../src/adapters/mcp/server.js';
import { listPollsTool, voteTool } from '../../src/tools/definitions.js';

describe('MCP Server', () => {
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
  });
});
