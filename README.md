# Futarchy402 MCP

Multi-platform AI tools for the Futarchy402 governance platform with x402 payment-gated voting.

## Overview

Futarchy402 MCP provides a unified interface for AI agents to interact with the Futarchy402 governance platform across multiple frameworks:

- **OpenAI** - Function calling
- **Anthropic Claude** - Tool use
- **Model Context Protocol (MCP)** - Standard protocol for AI tools
- **LangChain** - Agent framework integration

All platforms share the same core implementation, including the critical **x402 payment-gated voting protocol**.

## Features

- 🗳️ **Full Governance Integration** - List polls, get details, check positions
- 💰 **x402 Payment Protocol** - Execute payment-gated votes on-chain
- 🔌 **Multi-Platform Support** - Works with OpenAI, Claude, MCP, LangChain
- 🛠️ **Type-Safe** - Full TypeScript support
- 🧪 **Well-Tested** - Comprehensive test coverage
- 📦 **Tree-Shakeable** - Import only what you need

## Installation

```bash
npm install @futarchy402/mcp
```

## Quick Start

### OpenAI

```typescript
import { OpenAIFutarchyAdapter } from '@futarchy402/mcp/adapters/openai';
import OpenAI from 'openai';

const openai = new OpenAI();
const adapter = new OpenAIFutarchyAdapter();

const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Show me open polls' }],
  tools: adapter.getTools(),
});

// Handle tool calls
for (const toolCall of response.choices[0].message.tool_calls || []) {
  const result = await adapter.executeFunction(
    toolCall.function.name,
    toolCall.function.arguments
  );
  console.log(result);
}
```

### Anthropic Claude

```typescript
import { ClaudeFutarchyAdapter } from '@futarchy402/mcp/adapters/anthropic';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();
const adapter = new ClaudeFutarchyAdapter();

const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 4096,
  messages: [{ role: 'user', content: 'Show me open polls' }],
  tools: adapter.getTools(),
});

// Handle tool uses in response.content
```

### MCP Server

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "futarchy402": {
      "command": "node",
      "args": ["node_modules/@futarchy402/mcp/dist/adapters/mcp/server.js"]
    }
  }
}
```

### LangChain

```typescript
import { LangChainFutarchyAdapter } from '@futarchy402/mcp/adapters/langchain';
import { ChatOpenAI } from '@langchain/openai';
import { createToolCallingAgent, AgentExecutor } from 'langchain/agents';

const adapter = new LangChainFutarchyAdapter();
const tools = adapter.getTools();

const llm = new ChatOpenAI({ modelName: 'gpt-4o' });
const agent = await createToolCallingAgent({ llm, tools, prompt });
const executor = new AgentExecutor({ agent, tools });

const result = await executor.invoke({
  input: 'What polls are open?',
});
```

### Direct SDK Usage

```typescript
import { Futarchy402Client, executeVote } from '@futarchy402/mcp';

const client = new Futarchy402Client();

// List polls
const { polls } = await client.listPolls({ status: 'open' });

// Get poll details
const poll = await client.getPoll('poll-id');

// Get position
const position = await client.getPosition('poll-id', 'wallet-pubkey');

// Vote (x402 payment-gated)
const result = await executeVote({
  pollId: 'poll-id',
  side: 'yes',
  walletPrivateKey: 'base58-key',
  slippage: 0.05,
});
```

## Available Tools

All platforms expose these 5 tools:

### 1. `futarchy_list_polls`

List governance polls with optional filtering.

**Parameters:**
- `status` (optional) - Filter by "open" or "resolved"
- `treasury_id` (optional) - Filter by treasury
- `limit` (optional) - Max results (default: 20)
- `offset` (optional) - Pagination offset

**Returns:** Array of polls with liquidity, fees, probabilities, vote counts

### 2. `futarchy_get_poll`

Get detailed information about a specific poll including all votes.

**Parameters:**
- `poll_id` (required) - Poll identifier

**Returns:** Full poll details with proposal info, liquidity stats, all votes

### 3. `futarchy_get_position`

Get a wallet's position in a poll with profit/loss projections.

**Parameters:**
- `poll_id` (required) - Poll identifier
- `voter_pubkey` (required) - Solana wallet public key

**Returns:** Position details, projections, actual results (if resolved)

### 4. `futarchy_vote`

Execute a payment-gated vote using the x402 protocol.

**Parameters:**
- `poll_id` (required) - Poll to vote on
- `side` (required) - "yes" or "no"
- `wallet_private_key` (required) - Base58 encoded private key
- `slippage` (optional) - Max slippage tolerance (default: 0.05 = 5%)

**Returns:** Vote result with transaction signature, amounts, slippage

**⚠️ IMPORTANT:** This executes a real on-chain transaction that costs USDC.

### 5. `futarchy_get_stats`

Get platform-wide statistics.

**Returns:** Active polls, total projects, total proposals

## x402 Payment Protocol

The voting mechanism uses the x402 payment-gated protocol:

1. Request vote → Receive 402 Payment Required
2. Parse payment requirements from `X-Payment-Required` header
3. Generate transaction via facilitator (x402.org)
4. Sign transaction with wallet
5. Submit signed transaction with `X-Payment` header

This is implemented in [`src/core/x402.ts`](src/core/x402.ts) and handles:
- Slippage protection
- Duplicate vote prevention
- Transaction confirmation
- Comprehensive error handling

## Configuration

### Network Selection

The SDK supports both mainnet and devnet. **Always test on devnet first!**

```bash
# Set network (mainnet or devnet)
FUTARCHY_NETWORK=devnet

# Network-specific API URLs are set automatically
# devnet: https://futarchy402-api-devnet-385498168887.us-central1.run.app
# mainnet: https://futarchy402-api-385498168887.us-central1.run.app
```

Or configure programmatically:

```typescript
import { Futarchy402Client } from '@futarchy402/mcp';

// Use devnet for testing
const devnetClient = new Futarchy402Client({
  network: 'devnet'
});

// Use mainnet for production
const mainnetClient = new Futarchy402Client({
  network: 'mainnet'
});
```

### Environment Variables

```bash
# Network selection (default: mainnet)
FUTARCHY_NETWORK=devnet

# Override API URL (optional)
FUTARCHY_API_URL="https://custom-api.example.com"

# Override facilitator URL (optional)
FACILITATOR_URL="https://x402.org/facilitator"

# Override Solana RPC endpoints (optional)
SOLANA_RPC_DEVNET="https://api.devnet.solana.com"
SOLANA_RPC_MAINNET="https://api.mainnet-beta.solana.com"
```

### Custom Configuration

```typescript
import { Futarchy402Client } from '@futarchy402/mcp';

const client = new Futarchy402Client({
  apiBaseUrl: 'https://custom-api.example.com',
  network: 'devnet',
});
```

## Architecture

```
futarchy402-mcp/
├── src/
│   ├── core/           # Platform-agnostic SDK
│   │   ├── client.ts   # API client
│   │   ├── x402.ts     # Payment-gated voting
│   │   ├── wallet.ts   # Solana utilities
│   │   └── types.ts    # Type definitions
│   ├── tools/          # Universal tool definitions
│   │   ├── definitions.ts
│   │   └── handlers.ts
│   └── adapters/       # Platform-specific adapters
│       ├── openai/
│       ├── anthropic/
│       ├── mcp/
│       └── langchain/
└── examples/           # Integration examples
```

## Examples

See the [`examples/`](examples/) directory for complete working examples:

- [OpenAI Function Calling](examples/openai-example.ts)
- [Anthropic Claude Tool Use](examples/anthropic-example.ts)
- [MCP Configuration](examples/mcp-config-example.json)
- [LangChain Agent](examples/langchain-example.ts)

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm test

# Lint
npm run lint

# Format
npm run format
```

## Security

- **Never commit private keys** to version control
- Use environment variables for sensitive data
- Review transactions before signing
- Test on devnet before mainnet
- The `futarchy_vote` tool executes real on-chain transactions

## License

MIT

## Links

- [Futarchy402 Platform](https://futarchy402.com)
- [x402 Protocol](https://x402.org)
- [MCP Specification](https://modelcontextprotocol.io)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Claude Tool Use](https://docs.anthropic.com/claude/docs/tool-use)
- [LangChain](https://js.langchain.com)
