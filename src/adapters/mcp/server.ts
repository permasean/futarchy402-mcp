/**
 * Model Context Protocol (MCP) Server
 * Exposes Futarchy402 tools via MCP standard
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool as MCPTool,
} from '@modelcontextprotocol/sdk/types.js';
import { allTools, ToolDefinition, ToolParameter } from '../../tools/definitions.js';
import { executeTool, ToolContext } from '../../tools/handlers.js';
import { Futarchy402Client } from '../../core/client.js';

/**
 * Convert universal tool parameter to MCP input schema format
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
 * Convert universal tool definition to MCP format
 */
export function toMCPTool(tool: ToolDefinition): MCPTool {
  const properties: Record<string, any> = {};

  for (const [name, param] of Object.entries(tool.parameters)) {
    properties[name] = convertParameter(param);
  }

  return {
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type: 'object',
      properties,
      required: tool.required,
    },
  };
}

/**
 * Create and configure MCP server
 */
export function createMCPServer(client?: Futarchy402Client): Server {
  const futarchyClient = client || new Futarchy402Client();
  const context: ToolContext = { client: futarchyClient };

  const server = new Server(
    {
      name: 'futarchy402-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: allTools.map(toMCPTool),
    };
  });

  // Execute tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const result = await executeTool(name, args || {}, context);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error.message || 'Unknown error',
            }),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Run MCP server with stdio transport
 */
export async function runMCPServer(client?: Futarchy402Client): Promise<void> {
  const server = createMCPServer(client);
  const transport = new StdioServerTransport();

  await server.connect(transport);

  console.error('Futarchy402 MCP server running on stdio');
}

/**
 * Main entry point for standalone MCP server
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  runMCPServer().catch((error) => {
    console.error('Fatal error running MCP server:', error);
    process.exit(1);
  });
}
