# Test Suite

Comprehensive test coverage for futarchy402-mcp.

## Test Structure

```
tests/
├── core/                   # Core SDK tests
│   ├── client.test.ts      # API client tests
│   ├── wallet.test.ts      # Wallet utilities tests
│   └── x402.test.ts        # x402 payment protocol tests
├── tools/                  # Universal tools tests
│   └── handlers.test.ts    # Tool handlers and execution tests
├── adapters/               # Platform adapter tests
│   ├── openai.test.ts      # OpenAI adapter tests
│   ├── anthropic.test.ts   # Claude adapter tests
│   ├── langchain.test.ts   # LangChain adapter tests
│   └── mcp.test.ts         # MCP server tests
├── fixtures/               # Test data
│   └── polls.ts            # Mock poll data
└── helpers/                # Test utilities
    └── mock-fetch.ts       # Mock HTTP client
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test tests/core/client.test.ts

# Run tests matching pattern
npm test -- --grep "x402"
```

## Test Coverage

### Core SDK (src/core/)

**client.test.ts** - Futarchy402Client
- ✅ Constructor with custom/default/env API URL
- ✅ listPolls() - all polls, filtered, paginated
- ✅ getPoll() - success and 404 error
- ✅ getPosition() - success, missing params, not found
- ✅ getStats() - platform statistics
- ✅ Error handling for all HTTP status codes

**wallet.test.ts** - Wallet utilities
- ✅ validatePublicKey() - valid and invalid addresses
- ✅ getSolanaRpcUrl() - devnet, mainnet, env vars
- ✅ Unsupported network error

**x402.test.ts** - Payment protocol
- ✅ Full 402 payment flow (request → facilitator → submit)
- ✅ Error handling: 400, 403, 404, 409
- ✅ Missing X-Payment-Required header
- ✅ Facilitator errors
- ✅ Slippage exceeded (409)
- ✅ Default slippage parameter
- ✅ Invalid wallet private key

### Universal Tools (src/tools/)

**handlers.test.ts** - Tool execution
- ✅ handleListPolls - formatting, filtering, pagination
- ✅ handleGetPoll - USDC conversion, missing params
- ✅ handleGetPosition - open/resolved polls, projections
- ✅ handleGetStats - platform stats
- ✅ handleVote - validation, USDC conversion, slippage
- ✅ executeTool() - unknown tool error

### Platform Adapters (src/adapters/)

**openai.test.ts** - OpenAI integration
- ✅ toOpenAITool() - schema conversion
- ✅ Enum values, defaults, required params
- ✅ getOpenAITools() - all tools
- ✅ OpenAIFutarchyAdapter - execution, errors, invalid JSON

**anthropic.test.ts** - Claude integration
- ✅ toClaudeTool() - schema conversion
- ✅ Input schema structure
- ✅ getClaudeTools() - all tools
- ✅ ClaudeFutarchyAdapter - execution, errors, parameters

**langchain.test.ts** - LangChain integration
- ✅ getLangChainTools() - DynamicStructuredTool creation
- ✅ Tool names and schemas
- ✅ LangChainFutarchyAdapter - get by name, execution
- ✅ Error handling

**mcp.test.ts** - MCP server
- ✅ toMCPTool() - schema conversion
- ✅ createMCPServer() - server creation
- ✅ Request handling

## Test Utilities

### Mock Fetch (helpers/mock-fetch.ts)

Helper for mocking HTTP requests:

```typescript
import { MockFetchBuilder } from './helpers/mock-fetch.js';

const mockBuilder = new MockFetchBuilder();
mockBuilder.addResponse('https://api.example.com/polls', {
  status: 200,
  body: { polls: [] },
});
global.fetch = mockBuilder.build();
```

### Fixtures (fixtures/polls.ts)

Reusable test data:
- `mockPoll` - Open poll
- `mockResolvedPoll` - Resolved poll
- `mockPollDetails` - Poll with votes
- `mockPosition` - User position
- `mockVoteResult` - Vote execution result
- `mockX402PaymentRequirements` - Payment headers

## Writing Tests

Example test structure:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Futarchy402Client } from '../../src/core/client.js';
import { MockFetchBuilder } from '../helpers/mock-fetch.js';
import { mockPollListResponse } from '../fixtures/polls.js';

describe('MyFeature', () => {
  let client: Futarchy402Client;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    client = new Futarchy402Client();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should do something', async () => {
    const mockBuilder = new MockFetchBuilder();
    mockBuilder.addResponse('.*polls.*', {
      status: 200,
      body: mockPollListResponse,
    });
    global.fetch = mockBuilder.build();

    const result = await client.listPolls();
    expect(result.polls).toBeDefined();
  });
});
```

## Coverage Goals

- **Core SDK**: >90% coverage
- **Tools**: >90% coverage
- **Adapters**: >80% coverage
- **Overall**: >85% coverage

## CI/CD Integration

Tests run automatically on:
- Every commit
- Pull requests
- Before publishing

## Known Limitations

- Some x402 tests use simplified transaction mocking
- MCP server tests are basic (full protocol testing requires MCP client)
- No e2e tests against real API (all use mocks)

## Future Improvements

- [ ] Add integration tests with test API
- [ ] Add e2e tests for complete workflows
- [ ] Add performance/benchmark tests
- [ ] Add property-based testing
- [ ] Increase coverage to 95%+
