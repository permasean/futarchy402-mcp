/**
 * OpenAI Function Calling Adapter
 * Converts universal tools to OpenAI function calling format
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import { allTools, ToolDefinition, ToolParameter } from '../../tools/definitions.js';
import { executeTool, ToolContext } from '../../tools/handlers.js';
import { Futarchy402Client } from '../../core/client.js';

/**
 * Convert universal tool parameter to OpenAI JSON Schema format
 */
function convertParameter(param: ToolParameter): any {
  const schema: any = {
    type: param.type,
    description: param.description,
  };

  if (param.enum) {
    schema.enum = param.enum;
  }

  if (param.default !== undefined) {
    schema.default = param.default;
  }

  return schema;
}

/**
 * Convert universal tool definition to OpenAI function calling format
 */
export function toOpenAITool(tool: ToolDefinition): ChatCompletionTool {
  const properties: Record<string, any> = {};

  for (const [name, param] of Object.entries(tool.parameters)) {
    properties[name] = convertParameter(param);
  }

  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties,
        required: tool.required,
      },
    },
  };
}

/**
 * Get all Futarchy402 tools in OpenAI format
 */
export function getOpenAITools(): ChatCompletionTool[] {
  return allTools.map(toOpenAITool);
}

/**
 * Execute an OpenAI function call
 */
export async function executeOpenAIFunction(
  functionName: string,
  functionArgs: string,
  client?: Futarchy402Client
): Promise<string> {
  const context: ToolContext = {
    client: client || new Futarchy402Client(),
  };

  try {
    const args = JSON.parse(functionArgs);
    const result = await executeTool(functionName, args, context);
    return JSON.stringify(result, null, 2);
  } catch (error: any) {
    return JSON.stringify({
      error: error.message || 'Unknown error',
    });
  }
}

/**
 * OpenAI adapter class for easier integration
 */
export class OpenAIFutarchyAdapter {
  private client: Futarchy402Client;

  constructor(client?: Futarchy402Client) {
    this.client = client || new Futarchy402Client();
  }

  /**
   * Get tools in OpenAI format
   */
  getTools(): ChatCompletionTool[] {
    return getOpenAITools();
  }

  /**
   * Execute a function call
   */
  async executeFunction(functionName: string, functionArgs: string): Promise<string> {
    return executeOpenAIFunction(functionName, functionArgs, this.client);
  }

  /**
   * Get the underlying Futarchy402 client
   */
  getClient(): Futarchy402Client {
    return this.client;
  }
}
