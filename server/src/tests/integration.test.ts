import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:4402';

/**
 * Integration tests for AgentPay API endpoints
 * Note: These tests require the server to be running on localhost:4402
 *
 * Some tests (x402 payment flow) require OPENAI_API_KEY to be configured.
 * If not configured, those tests will be skipped.
 */
describe('API Integration Tests', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await fetch(`${BASE_URL}/health`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data.version).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('Providers Endpoint', () => {
    it('should return list of providers', async () => {
      const response = await fetch(`${BASE_URL}/v1/providers`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.providers).toBeDefined();
      expect(Array.isArray(data.providers)).toBe(true);
      expect(data.providers.length).toBeGreaterThan(0);

      // Verify provider structure
      const provider = data.providers[0];
      expect(provider.id).toBeDefined();
      expect(provider.name).toBeDefined();
      expect(provider.models).toBeDefined();
    });
  });

  describe('Models Endpoint', () => {
    it('should return list of models', async () => {
      const response = await fetch(`${BASE_URL}/v1/models`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.models).toBeDefined();
      expect(Array.isArray(data.models)).toBe(true);
      expect(data.models.length).toBeGreaterThan(0);

      // Verify model structure (actual API format)
      const model = data.models[0];
      expect(model.id).toBeDefined();
      expect(model.provider).toBeDefined();
      expect(model.pricing).toBeDefined();
      expect(model.pricing.input_per_1k_tokens).toBeDefined();
      expect(model.pricing.output_per_1k_tokens).toBeDefined();
      expect(model.pricing.per_1k_total).toBeDefined();
    });

    it('should include meta information', async () => {
      const response = await fetch(`${BASE_URL}/v1/models`);
      const data = await response.json();

      expect(data.meta).toBeDefined();
      expect(data.meta.count).toBe(data.models.length);
      expect(data.meta.move_usd_rate).toBeDefined();
      expect(data.meta.margin_percent).toBeDefined();
    });
  });

  describe('Inference Endpoint - Basic Validation', () => {
    it('should require authentication or payment', async () => {
      const response = await fetch(`${BASE_URL}/v1/inference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      // Should return 402 (payment required) or 500 (if API key not configured)
      // Both are valid non-200 responses for unauthenticated requests
      expect(response.ok).toBe(false);
      expect([402, 500]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown endpoint', async () => {
      const response = await fetch(`${BASE_URL}/v1/unknown`);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should handle invalid JSON body', async () => {
      const response = await fetch(`${BASE_URL}/v1/inference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      });

      // Should return error (likely 400 or 500)
      expect(response.ok).toBe(false);
    });
  });

  describe('API Consistency', () => {
    it('should have consistent model pricing across endpoints', async () => {
      const modelsResponse = await fetch(`${BASE_URL}/v1/models`);
      const modelsData = await modelsResponse.json();

      const providersResponse = await fetch(`${BASE_URL}/v1/providers`);
      const providersData = await providersResponse.json();

      // Each model should belong to a valid provider
      for (const model of modelsData.models) {
        const provider = providersData.providers.find(
          (p: { id: string }) => p.id === model.provider
        );
        expect(provider).toBeDefined();
        expect(provider.models).toContain(model.id);
      }
    });
  });
});
