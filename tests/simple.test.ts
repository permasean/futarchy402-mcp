/**
 * Simple smoke tests to verify basic functionality
 */

import { describe, it, expect } from 'vitest';
import { validatePublicKey, getSolanaRpcUrl } from '../src/core/wallet.js';
import { allTools, ToolNames } from '../src/tools/definitions.js';
import { toOpenAITool, getOpenAITools } from '../src/adapters/openai/adapter.js';
import { toClaudeTool, getClaudeTools } from '../src/adapters/anthropic/adapter.js';
import { getLangChainTools } from '../src/adapters/langchain/adapter.js';
import { toMCPTool } from '../src/adapters/mcp/server.js';

describe('Wallet Utilities', () => {
  it('should validate correct Solana public keys', () => {
    expect(validatePublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU')).toBe(true);
    expect(validatePublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')).toBe(true);
  });

  it('should reject invalid public keys', () => {
    expect(validatePublicKey('invalid')).toBe(false);
    expect(validatePublicKey('')).toBe(false);
  });

  it('should return devnet RPC URL', () => {
    const url = getSolanaRpcUrl('solana-devnet');
    expect(url).toContain('devnet');
  });

  it('should return mainnet RPC URL', () => {
    const url = getSolanaRpcUrl('solana-mainnet');
    expect(url).toContain('mainnet');
  });

  it('should throw for unsupported network', () => {
    expect(() => getSolanaRpcUrl('invalid')).toThrow('Unsupported network');
  });
});

describe('Tool Definitions', () => {
  it('should export 5 tools', () => {
    expect(allTools).toHaveLength(5);
  });

  it('should have correct tool names', () => {
    expect(ToolNames.LIST_POLLS).toBe('futarchy_list_polls');
    expect(ToolNames.GET_POLL).toBe('futarchy_get_poll');
    expect(ToolNames.GET_POSITION).toBe('futarchy_get_position');
    expect(ToolNames.VOTE).toBe('futarchy_vote');
    expect(ToolNames.GET_STATS).toBe('futarchy_get_stats');
  });

  it('should have required parameters for vote tool', () => {
    const voteTool = allTools.find(t => t.name === 'futarchy_vote');
    expect(voteTool?.required).toContain('poll_id');
    expect(voteTool?.required).toContain('side');
    // wallet_private_key is now optional (can use WALLET_PRIVATE_KEY env var)
    expect(voteTool?.required).not.toContain('wallet_private_key');
  });
});

describe('OpenAI Adapter', () => {
  it('should convert tools to OpenAI format', () => {
    const tools = getOpenAITools();
    expect(tools).toHaveLength(5);

    tools.forEach(tool => {
      expect(tool.type).toBe('function');
      expect(tool.function.name).toBeDefined();
      expect(tool.function.parameters.type).toBe('object');
    });
  });

  it('should preserve enum values', () => {
    const voteTool = allTools.find(t => t.name === 'futarchy_vote')!;
    const openaiTool = toOpenAITool(voteTool);
    expect(openaiTool.function.parameters.properties.side.enum).toEqual(['yes', 'no']);
  });
});

describe('Claude Adapter', () => {
  it('should convert tools to Claude format', () => {
    const tools = getClaudeTools();
    expect(tools).toHaveLength(5);

    tools.forEach(tool => {
      expect(tool.name).toBeDefined();
      expect(tool.input_schema.type).toBe('object');
    });
  });

  it('should mark required parameters', () => {
    const voteTool = allTools.find(t => t.name === 'futarchy_vote')!;
    const claudeTool = toClaudeTool(voteTool);
    expect(claudeTool.input_schema.required).toContain('poll_id');
  });
});

describe('LangChain Adapter', () => {
  it('should convert tools to LangChain format', () => {
    const tools = getLangChainTools();
    expect(tools).toHaveLength(5);

    tools.forEach(tool => {
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.schema).toBeDefined();
    });
  });
});

describe('MCP Adapter', () => {
  it('should convert tools to MCP format', () => {
    allTools.forEach(tool => {
      const mcpTool = toMCPTool(tool);
      expect(mcpTool.name).toBeDefined();
      expect(mcpTool.inputSchema.type).toBe('object');
    });
  });
});
