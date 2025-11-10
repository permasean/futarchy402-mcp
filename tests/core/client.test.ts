/**
 * Tests for Futarchy402Client
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mockPollListResponse, mockPollDetails, mockPosition, mockStats } from '../fixtures/polls.js';

// Mock node-fetch before importing client
vi.mock('node-fetch');

import fetch from 'node-fetch';
import { Futarchy402Client } from '../../src/core/client.js';

const mockFetch = vi.mocked(fetch);

describe('Futarchy402Client', () => {
  let client: Futarchy402Client;

  beforeEach(() => {
    client = new Futarchy402Client({
      apiBaseUrl: 'https://test-api.example.com',
    });
    mockFetch.mockReset();
  });

  describe('constructor', () => {
    it('should use custom API URL', () => {
      expect(client.getBaseUrl()).toBe('https://test-api.example.com');
    });

    it('should use default API URL', () => {
      const defaultClient = new Futarchy402Client();
      expect(defaultClient.getBaseUrl()).toContain('futarchy402-api');
    });

    it('should use environment variable', () => {
      const originalEnv = process.env.FUTARCHY_API_URL;
      process.env.FUTARCHY_API_URL = 'https://env-api.example.com';

      const envClient = new Futarchy402Client();
      expect(envClient.getBaseUrl()).toBe('https://env-api.example.com');

      // Restore
      if (originalEnv) {
        process.env.FUTARCHY_API_URL = originalEnv;
      } else {
        delete process.env.FUTARCHY_API_URL;
      }
    });
  });

  describe('listPolls', () => {
    it('should list all polls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPollListResponse,
      } as any);

      const result = await client.listPolls();

      expect(result.polls).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should filter by status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ...mockPollListResponse, polls: [mockPollListResponse.polls[0]] }),
      } as any);

      const result = await client.listPolls({ status: 'open' });

      expect(result.polls).toHaveLength(1);
      expect(result.polls[0].status).toBe('open');
    });

    it('should handle pagination', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ...mockPollListResponse,
          pagination: { limit: 10, offset: 20, total: 2 },
        }),
      } as any);

      const result = await client.listPolls({ limit: 10, offset: 20 });

      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.offset).toBe(20);
    });

    it('should throw on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as any);

      await expect(client.listPolls()).rejects.toThrow('Failed to list polls');
    });
  });

  describe('getPoll', () => {
    it('should get poll details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPollDetails,
      } as any);

      const result = await client.getPoll('test-poll-1');

      expect(result.id).toBe('test-poll-1');
      expect(result.votes).toHaveLength(2);
    });

    it('should throw on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as any);

      await expect(client.getPoll('nonexistent')).rejects.toThrow('Poll not found');
    });
  });

  describe('getPosition', () => {
    it('should get position details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPosition,
      } as any);

      const result = await client.getPosition('test-poll-1', 'Voter1');

      expect(result.poll_id).toBe('test-poll-1');
      expect(result.vote_side).toBe('yes');
    });

    it('should throw on missing voter_pubkey', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      } as any);

      await expect(client.getPosition('test-poll-1', '')).rejects.toThrow();
    });

    it('should throw on no position found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as any);

      await expect(client.getPosition('test-poll-1', 'NoVoter')).rejects.toThrow(
        'No position found'
      );
    });
  });

  describe('getStats', () => {
    it('should get platform stats', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockStats,
      } as any);

      const result = await client.getStats();

      expect(result.active_polls).toBe(5);
      expect(result.total_projects).toBe(12);
      expect(result.total_proposals).toBe(27);
    });
  });
});
