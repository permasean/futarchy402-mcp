/**
 * Mock fetch utilities for testing
 */

export interface MockResponse {
  status: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: any;
}

export class MockFetchBuilder {
  private responses: Map<string, MockResponse[]> = new Map();

  /**
   * Add a mock response for a URL pattern
   */
  addResponse(urlPattern: string | RegExp, response: MockResponse): this {
    const key = urlPattern instanceof RegExp ? urlPattern.source : urlPattern;
    const existing = this.responses.get(key) || [];
    existing.push(response);
    this.responses.set(key, existing);
    return this;
  }

  /**
   * Build the mock fetch function
   */
  build(): typeof fetch {
    const responses = this.responses;

    return async function mockFetch(url: string | URL, init?: RequestInit): Promise<Response> {
      const urlString = url.toString();

      // Find matching response
      for (const [pattern, responseList] of responses.entries()) {
        const regex = new RegExp(pattern);
        if (regex.test(urlString)) {
          const response = responseList.shift();
          if (!response) {
            throw new Error(`No more mock responses for ${urlString}`);
          }

          const headers = new Map<string, string>();
          if (response.headers) {
            Object.entries(response.headers).forEach(([k, v]) => headers.set(k, v));
          }

          return {
            ok: response.status >= 200 && response.status < 300,
            status: response.status,
            statusText: response.statusText || 'OK',
            headers: {
              get: (name: string) => headers.get(name.toLowerCase()) || null,
            } as any,
            json: async () => response.body,
            text: async () => JSON.stringify(response.body),
          } as Response;
        }
      }

      throw new Error(`No mock response for ${urlString}`);
    } as any;
  }

  /**
   * Reset all responses
   */
  reset(): void {
    this.responses.clear();
  }
}

/**
 * Create a mock fetch that returns specific responses
 */
export function createMockFetch(responses: Record<string, MockResponse>): typeof fetch {
  const builder = new MockFetchBuilder();
  Object.entries(responses).forEach(([url, response]) => {
    builder.addResponse(url, response);
  });
  return builder.build();
}
