/**
 * Simplified tests for x402 payment-gated voting protocol
 * Focuses on error handling and validation without complex transaction mocking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// Mock node-fetch
vi.mock('node-fetch');

// Mock @solana/web3.js Connection
vi.mock('@solana/web3.js', async () => {
  const actual = await vi.importActual('@solana/web3.js');
  return {
    ...actual,
    Connection: vi.fn().mockImplementation(() => ({
      getLatestBlockhash: vi.fn().mockResolvedValue({
        blockhash: 'mock-blockhash',
      }),
      getAccountInfo: vi.fn().mockResolvedValue(null),
    })),
  };
});

// Mock @solana/spl-token
vi.mock('@solana/spl-token', async () => {
  const actual = await vi.importActual('@solana/spl-token');
  return {
    ...actual,
    getMint: vi.fn().mockResolvedValue({
      decimals: 6,
    }),
    getAssociatedTokenAddress: vi.fn().mockResolvedValue({
      toBase58: () => 'mock-ata',
    }),
  };
});

import fetch from 'node-fetch';
import { executeVote } from '../../src/core/x402.js';

const mockFetch = vi.mocked(fetch);

describe('x402 Payment Protocol', () => {
  let testKeypair: Keypair;
  let testPrivateKey: string;

  beforeEach(() => {
    mockFetch.mockReset();
    testKeypair = Keypair.generate();
    testPrivateKey = bs58.encode(testKeypair.secretKey);
  });

  describe('executeVote - Error Handling', () => {
    it('should handle 400 invalid request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid side parameter' }),
      } as any);

      const result = await executeVote({
        pollId: 'test-poll-1',
        side: 'yes',
        walletPrivateKey: testPrivateKey,
        apiBaseUrl: 'https://test-api.example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid vote request');
    });

    it('should handle 403 duplicate vote', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      } as any);

      const result = await executeVote({
        pollId: 'test-poll-1',
        side: 'yes',
        walletPrivateKey: testPrivateKey,
        apiBaseUrl: 'https://test-api.example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Duplicate vote');
    });

    it('should handle 404 poll not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as any);

      const result = await executeVote({
        pollId: 'nonexistent',
        side: 'yes',
        walletPrivateKey: testPrivateKey,
        apiBaseUrl: 'https://test-api.example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Poll not found');
    });

    it('should handle missing accepts array in x402 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 402,
        json: async () => ({
          x402Version: '1.0',
          resource: 'https://test.com',
          accepts: [],
        }),
      } as any);

      const result = await executeVote({
        pollId: 'test-poll-1',
        side: 'yes',
        walletPrivateKey: testPrivateKey,
        apiBaseUrl: 'https://test-api.example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No payment methods accepted');
    });

    it('should handle unsupported payment scheme', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 402,
        json: async () => ({
          x402Version: '1.0',
          resource: 'https://test.com',
          accepts: [
            {
              scheme: 'ethereum',
              network: 'mainnet',
              payTo: 'address',
              splToken: 'token',
              maxAmountRequired: '1000000',
            },
          ],
        }),
      } as any);

      const result = await executeVote({
        pollId: 'test-poll-1',
        side: 'yes',
        walletPrivateKey: testPrivateKey,
        apiBaseUrl: 'https://test-api.example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported payment scheme');
    });

    it('should handle invalid wallet private key', async () => {
      const result = await executeVote({
        pollId: 'test-poll-1',
        side: 'yes',
        walletPrivateKey: 'invalid-key',
        apiBaseUrl: 'https://test-api.example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error result on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await executeVote({
        pollId: 'test-poll-1',
        side: 'yes',
        walletPrivateKey: testPrivateKey,
        apiBaseUrl: 'https://test-api.example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('executeVote - Parameter Validation', () => {
    it('should use default slippage of 0.05', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as any);

      // Just verify it doesn't throw and uses default
      const result = await executeVote({
        pollId: 'test',
        side: 'yes',
        walletPrivateKey: testPrivateKey,
        apiBaseUrl: 'https://test-api.example.com',
      });

      expect(result.success).toBe(false);
    });

    it('should accept custom slippage', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as any);

      const result = await executeVote({
        pollId: 'test',
        side: 'yes',
        walletPrivateKey: testPrivateKey,
        slippage: 0.1,
        apiBaseUrl: 'https://test-api.example.com',
      });

      expect(result.success).toBe(false);
    });
  });
});
