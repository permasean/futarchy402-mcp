/**
 * LangChain Integration Example
 * Shows how to use Futarchy402 tools with LangChain
 */

import { ChatOpenAI } from '@langchain/openai';
import { LangChainFutarchyAdapter } from '../src/adapters/langchain/adapter.js';
import { Futarchy402Client } from '../src/core/client.js';

async function main() {
  // Initialize Futarchy402 adapter
  const futarchyAdapter = new LangChainFutarchyAdapter(
    new Futarchy402Client({
      apiBaseUrl: process.env.FUTARCHY_API_URL,
    })
  );

  // Get tools
  const tools = futarchyAdapter.getTools();

  console.log('Available tools:', tools.map((t) => t.name).join(', '));
  console.log('\nNote: This example shows how to get LangChain-formatted tools.');
  console.log('You can use these tools with LangChain agents, chains, or tool-calling models.\n');

  // Initialize LLM with tool binding
  const llm = new ChatOpenAI({
    modelName: 'gpt-4o',
    temperature: 0,
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Bind tools to the model
  const llmWithTools = llm.bindTools(tools);

  // Example: Direct tool-calling with the model
  console.log('Asking model to list open polls...\n');

  const response = await llmWithTools.invoke([
    {
      role: 'user',
      content: 'What are the currently open polls on Futarchy402? List them.',
    },
  ]);

  console.log('Model response:', response);

  // Check if model wants to use tools
  if (response.tool_calls && response.tool_calls.length > 0) {
    console.log('\nModel requested tool calls:');
    for (const toolCall of response.tool_calls) {
      console.log(`- ${toolCall.name} with args:`, toolCall.args);

      // Execute the tool
      const tool = tools.find((t) => t.name === toolCall.name);
      if (tool) {
        const result = await tool.invoke(toolCall.args);
        console.log(`  Result:`, result);
      }
    }
  }
}

main().catch(console.error);
