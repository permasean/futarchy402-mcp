/**
 * Anthropic Claude Tool Use Adapter
 * Converts universal tools to Claude tool use format
 */

import type { Tool } from '@anthropic-ai/sdk/resources/messages.mjs';
import { allTools, ToolDefinition, ToolParameter } from '../../tools/definitions.js';
import { executeTool, ToolContext } from '../../tools/handlers.js';
import { Futarchy402Client } from '../../core/client.js';

/**
 * Convert universal tool parameter to Claude input schema format
 */
function convertParameter(param: ToolParameter): any {
  const schema: any = {
    type: param.type,
    description: param.description,
  };

  if (param.enum) {
    schema.enum = param.enum;
  }

  return schema;
}

/**
 * Convert universal tool definition to Claude tool use format
 */
export function toClaudeTool(tool: ToolDefinition): Tool {
  const properties: Record<string, any> = {};

  for (const [name, param] of Object.entries(tool.parameters)) {
    properties[name] = convertParameter(param);
  }

  return {
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: 'object',
      properties,
      required: tool.required,
    },
  };
}

/**
 * Get all Futarchy402 tools in Claude format
 */
export function getClaudeTools(): Tool[] {
  return allTools.map(toClaudeTool);
}

/**
 * Execute a Claude tool use
 */
export async function executeClaudeTool(
  toolName: string,
  toolInput: Record<string, any>,
  client?: Futarchy402Client
): Promise<any> {
  const context: ToolContext = {
    client: client || new Futarchy402Client(),
  };

  try {
    const result = await executeTool(toolName, toolInput, context);
    return result;
  } catch (error: any) {
    return {
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Claude adapter class for easier integration
 */
export class ClaudeFutarchyAdapter {
  private client: Futarchy402Client;

  constructor(client?: Futarchy402Client) {
    this.client = client || new Futarchy402Client();
  }

  /**
   * Get tools in Claude format
   */
  getTools(): Tool[] {
    return getClaudeTools();
  }

  /**
   * Execute a tool use
   */
  async executeTool(toolName: string, toolInput: Record<string, any>): Promise<any> {
    return executeClaudeTool(toolName, toolInput, this.client);
  }

  /**
   * Get the underlying Futarchy402 client
   */
  getClient(): Futarchy402Client {
    return this.client;
  }
}
