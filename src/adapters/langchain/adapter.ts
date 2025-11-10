/**
 * LangChain Tools Adapter
 * Converts universal tools to LangChain DynamicStructuredTool format
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { allTools, ToolDefinition, ToolParameter } from '../../tools/definitions.js';
import { executeTool, ToolContext } from '../../tools/handlers.js';
import { Futarchy402Client } from '../../core/client.js';

/**
 * Convert universal tool parameter to Zod schema
 */
function parameterToZod(param: ToolParameter): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (param.type) {
    case 'string':
      schema = z.string().describe(param.description);
      if (param.enum) {
        schema = z.enum(param.enum as [string, ...string[]]).describe(param.description);
      }
      break;
    case 'number':
      schema = z.number().describe(param.description);
      break;
    case 'boolean':
      schema = z.boolean().describe(param.description);
      break;
    case 'array':
      schema = z.array(z.any()).describe(param.description);
      break;
    case 'object':
      schema = z.record(z.any()).describe(param.description);
      break;
    default:
      schema = z.any().describe(param.description);
  }

  // Make optional if not required, or add default
  if (!param.required) {
    if (param.default !== undefined) {
      schema = schema.default(param.default);
    } else {
      schema = schema.optional();
    }
  }

  return schema;
}

/**
 * Convert universal tool definition to Zod schema object
 */
function toolToZodSchema(tool: ToolDefinition): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [name, param] of Object.entries(tool.parameters)) {
    shape[name] = parameterToZod(param);
  }

  return z.object(shape);
}

/**
 * Convert universal tool definition to LangChain DynamicStructuredTool
 */
export function toLangChainTool(
  tool: ToolDefinition,
  context: ToolContext
): DynamicStructuredTool {
  const schema = toolToZodSchema(tool);

  return new DynamicStructuredTool({
    name: tool.name,
    description: tool.description,
    schema,
    func: async (input: any) => {
      try {
        const result = await executeTool(tool.name, input, context);
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        return JSON.stringify({
          error: error.message || 'Unknown error',
        });
      }
    },
  });
}

/**
 * Get all Futarchy402 tools in LangChain format
 */
export function getLangChainTools(client?: Futarchy402Client): DynamicStructuredTool[] {
  const context: ToolContext = {
    client: client || new Futarchy402Client(),
  };

  return allTools.map((tool) => toLangChainTool(tool, context));
}

/**
 * LangChain adapter class for easier integration
 */
export class LangChainFutarchyAdapter {
  private client: Futarchy402Client;
  private tools: DynamicStructuredTool[];

  constructor(client?: Futarchy402Client) {
    this.client = client || new Futarchy402Client();
    this.tools = getLangChainTools(this.client);
  }

  /**
   * Get all tools
   */
  getTools(): DynamicStructuredTool[] {
    return this.tools;
  }

  /**
   * Get a specific tool by name
   */
  getTool(name: string): DynamicStructuredTool | undefined {
    return this.tools.find((tool) => tool.name === name);
  }

  /**
   * Get the underlying Futarchy402 client
   */
  getClient(): Futarchy402Client {
    return this.client;
  }
}
