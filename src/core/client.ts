/**
 * Core API client for Futarchy402
 */

import fetch from 'node-fetch';
import { Poll, PollListResponse, PollDetails, Position, Stats } from './types.js';

export interface ClientConfig {
  apiBaseUrl?: string;
  network?: 'mainnet' | 'devnet';
}

export class Futarchy402Client {
  private apiBaseUrl: string;
  private network: 'mainnet' | 'devnet';

  constructor(config: ClientConfig = {}) {
    // Determine network from config or environment
    this.network = config.network ||
      (process.env.FUTARCHY_NETWORK as 'mainnet' | 'devnet') ||
      'mainnet';

    // Set API URL based on network or explicit config
    if (config.apiBaseUrl) {
      this.apiBaseUrl = config.apiBaseUrl;
    } else if (process.env.FUTARCHY_API_URL) {
      this.apiBaseUrl = process.env.FUTARCHY_API_URL;
    } else {
      // Default URLs based on network
      this.apiBaseUrl = this.network === 'devnet'
        ? 'https://futarchy402-api-devnet-385498168887.us-central1.run.app'
        : 'https://futarchy402-api-385498168887.us-central1.run.app';
    }
  }

  /**
   * List polls with optional filtering
   */
  async listPolls(options: {
    status?: 'open' | 'resolved';
    treasury_id?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<PollListResponse> {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.treasury_id) params.append('treasury_id', options.treasury_id);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    const url = `${this.apiBaseUrl}/polls${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to list polls: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as PollListResponse;
  }

  /**
   * Get detailed information about a specific poll
   */
  async getPoll(pollId: string): Promise<PollDetails> {
    const url = `${this.apiBaseUrl}/poll/${pollId}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Poll not found: ${pollId}`);
      }
      throw new Error(`Failed to get poll: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as PollDetails;
  }

  /**
   * Get a wallet's position in a specific poll
   */
  async getPosition(pollId: string, voterPubkey: string): Promise<Position> {
    const params = new URLSearchParams({ voter_pubkey: voterPubkey });
    const url = `${this.apiBaseUrl}/poll/${pollId}/position?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`No position found for ${voterPubkey} in poll ${pollId}`);
      }
      if (response.status === 400) {
        throw new Error('Missing voter_pubkey parameter');
      }
      throw new Error(`Failed to get position: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as Position;
  }

  /**
   * Get platform-wide statistics
   */
  async getStats(): Promise<Stats> {
    const url = `${this.apiBaseUrl}/stats`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to get stats: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as Stats;
  }

  /**
   * Get the API base URL
   */
  getBaseUrl(): string {
    return this.apiBaseUrl;
  }

  /**
   * Get the current network
   */
  getNetwork(): 'mainnet' | 'devnet' {
    return this.network;
  }
}

// Default export
export const createClient = (config?: ClientConfig) => new Futarchy402Client(config);
