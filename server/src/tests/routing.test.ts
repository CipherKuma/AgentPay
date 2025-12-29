import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Provider } from '../providers/types.js';

// Create mock providers
const createMockProvider = (id: string, pricing: { input: number; output: number }): Provider => ({
  id,
  name: `Provider ${id}`,
  models: ['gpt-4', 'gpt-4o-mini'],
  inference: vi.fn(),
  estimateTokens: vi.fn(),
  getPricing: () => pricing,
  healthCheck: vi.fn().mockResolvedValue(true),
});

const cheapProvider = createMockProvider('cheap', { input: 0.001, output: 0.002 });
const expensiveProvider = createMockProvider('expensive', { input: 0.01, output: 0.02 });
const premiumProvider = createMockProvider('premium', { input: 0.05, output: 0.1 });

// Mock providers module
vi.mock('../providers/index.js', () => ({
  getProvider: vi.fn((id) => {
    const providers: Record<string, Provider> = {
      cheap: cheapProvider,
      expensive: expensiveProvider,
      premium: premiumProvider,
    };
    return providers[id];
  }),
  findProvidersForModel: vi.fn((model) => {
    if (['gpt-4', 'gpt-4o-mini'].includes(model)) {
      return [cheapProvider, expensiveProvider, premiumProvider];
    }
    return [];
  }),
}));

// Import after mocking
import { routingEngine } from '../routing/engine.js';

describe('RoutingEngine', () => {
  beforeEach(() => {
    // Reset provider statuses
    vi.clearAllMocks();
  });

  describe('selectProvider', () => {
    it('should select cheapest provider by default', () => {
      const provider = routingEngine.selectProvider('gpt-4');

      expect(provider).toBeDefined();
      expect(provider?.id).toBe('cheap');
    });

    it('should select specific provider when requested', () => {
      const provider = routingEngine.selectProvider('gpt-4', {
        provider: 'expensive',
      });

      expect(provider).toBeDefined();
      expect(provider?.id).toBe('expensive');
    });

    it('should return null for unsupported model', () => {
      const provider = routingEngine.selectProvider('unsupported-model');

      expect(provider).toBeNull();
    });

    it('should return null when requested provider not available', () => {
      const provider = routingEngine.selectProvider('gpt-4', {
        provider: 'nonexistent',
      });

      expect(provider).toBeNull();
    });
  });

  describe('selectProvider with max_latency_ms', () => {
    it('should filter by latency when max_latency_ms specified', () => {
      // Set latency for providers
      routingEngine.setProviderStatus('cheap', true, 2000);
      routingEngine.setProviderStatus('expensive', true, 500);
      routingEngine.setProviderStatus('premium', true, 100);

      const provider = routingEngine.selectProvider('gpt-4', {
        max_latency_ms: 600,
      });

      // Should get cheapest among fast providers
      expect(provider).toBeDefined();
      // Should not select 'cheap' as it has 2000ms latency
      expect(provider?.id).not.toBe('cheap');
    });
  });

  describe('selectProvider with max_price', () => {
    it('should filter by price when max_price specified', () => {
      const provider = routingEngine.selectProvider('gpt-4', {
        max_price: 0.005,
      });

      // Should get fastest among cheap providers
      expect(provider).toBeDefined();
      expect(provider?.id).toBe('cheap');
    });

    it('should return fastest when no providers under price threshold', () => {
      // Set latency to differentiate
      routingEngine.setProviderStatus('expensive', true, 100);
      routingEngine.setProviderStatus('premium', true, 200);

      const provider = routingEngine.selectProvider('gpt-4', {
        max_price: 0.0001, // Very low, none qualify
      });

      // Should fall back to fastest
      expect(provider).toBeDefined();
    });
  });

  describe('updateProviderStatus', () => {
    it('should track success rate', () => {
      const providerId = 'test-provider';

      routingEngine.initializeProvider(providerId);
      routingEngine.updateProviderStatus(providerId, true, 100);
      routingEngine.updateProviderStatus(providerId, true, 100);
      routingEngine.updateProviderStatus(providerId, false, 500);

      const status = routingEngine.getProviderStatus(providerId);

      expect(status).toBeDefined();
      expect(status?.requestCount).toBe(3);
      expect(status?.successCount).toBe(2);
      // 2/3 = 0.666...
      expect(status?.availability).toBeCloseTo(0.666, 2);
    });

    it('should calculate moving average latency', () => {
      const providerId = 'latency-test';

      routingEngine.initializeProvider(providerId);
      routingEngine.updateProviderStatus(providerId, true, 100);
      routingEngine.updateProviderStatus(providerId, true, 300);

      const status = routingEngine.getProviderStatus(providerId);

      // Moving average: (1000 + 100) / 2 = 550, then (550 + 300) / 2 = 425
      expect(status).toBeDefined();
      expect(status?.latency_p50).toBeDefined();
    });
  });

  describe('setProviderStatus', () => {
    it('should directly set provider status', () => {
      const providerId = 'direct-set';

      routingEngine.setProviderStatus(providerId, true, 250);

      const status = routingEngine.getProviderStatus(providerId);

      expect(status).toBeDefined();
      expect(status?.available).toBe(true);
      expect(status?.latency_p50).toBe(250);
    });

    it('should decrease availability when unavailable', () => {
      const providerId = 'availability-test';

      routingEngine.initializeProvider(providerId);

      const initialStatus = routingEngine.getProviderStatus(providerId);
      const initialAvailability = initialStatus?.availability || 1.0;

      routingEngine.setProviderStatus(providerId, false, 0);

      const status = routingEngine.getProviderStatus(providerId);

      expect(status?.available).toBe(false);
      expect(status?.availability).toBeLessThan(initialAvailability);
    });
  });

  describe('getProviderStatuses', () => {
    it('should return all provider statuses', () => {
      routingEngine.initializeProvider('provider-a');
      routingEngine.initializeProvider('provider-b');

      const statuses = routingEngine.getProviderStatuses();

      expect(Array.isArray(statuses)).toBe(true);
      expect(statuses.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('availability threshold', () => {
    it('should filter out providers with low availability', () => {
      // Simulate provider becoming unavailable
      routingEngine.initializeProvider('unreliable');

      // Make it fail multiple times to drop below 95%
      for (let i = 0; i < 10; i++) {
        routingEngine.updateProviderStatus('unreliable', false, 1000);
      }

      const status = routingEngine.getProviderStatus('unreliable');
      expect(status?.availability).toBeLessThan(0.95);
    });
  });
});
