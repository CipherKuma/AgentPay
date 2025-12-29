import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PricingService } from '../services/pricing.js';

// Mock the providers module
vi.mock('../providers/index.js', () => ({
  getProvider: vi.fn((id) => {
    if (id === 'openai') {
      return {
        id: 'openai',
        name: 'OpenAI',
        models: ['gpt-4', 'gpt-4o-mini'],
        getPricing: (model: string) => {
          const prices: Record<string, { input: number; output: number }> = {
            'gpt-4': { input: 0.03, output: 0.06 },
            'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
          };
          return prices[model] || { input: 0.001, output: 0.002 };
        },
      };
    }
    return undefined;
  }),
  findProvidersForModel: vi.fn((model) => {
    if (['gpt-4', 'gpt-4o-mini'].includes(model)) {
      return [{
        id: 'openai',
        name: 'OpenAI',
        models: ['gpt-4', 'gpt-4o-mini'],
        getPricing: (m: string) => {
          const prices: Record<string, { input: number; output: number }> = {
            'gpt-4': { input: 0.03, output: 0.06 },
            'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
          };
          return prices[m] || { input: 0.001, output: 0.002 };
        },
      }];
    }
    return [];
  }),
}));

describe('PricingService', () => {
  let pricingService: PricingService;

  beforeEach(() => {
    pricingService = new PricingService();
  });

  describe('estimateTokens', () => {
    it('should estimate tokens from prompt string', () => {
      const result = pricingService.estimateTokens({
        model: 'gpt-4',
        prompt: 'Hello world this is a test prompt',
      });

      // 7 words * 1.3 = 9.1, + 10 overhead = 19.1, rounded to nearest 100 = 100
      expect(result.input).toBe(100);
      expect(result.output).toBe(300); // Default 256 rounded up to 300
    });

    it('should estimate tokens from messages array', () => {
      const result = pricingService.estimateTokens({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello, how are you?' },
        ],
      });

      // Total chars: 29 + 19 = 48, / 4 = 12, + 10 = 22, rounded = 100
      expect(result.input).toBe(100);
      expect(result.output).toBe(300);
    });

    it('should use max_tokens for output estimation', () => {
      const result = pricingService.estimateTokens({
        model: 'gpt-4',
        prompt: 'Hello',
        max_tokens: 500,
      });

      expect(result.output).toBe(500); // 500 rounded to nearest 100 = 500
    });

    it('should handle empty prompt', () => {
      const result = pricingService.estimateTokens({
        model: 'gpt-4',
        prompt: '',
      });

      // 0 words + 10 overhead = 10, rounded = 100
      expect(result.input).toBe(100);
    });

    it('should handle empty messages', () => {
      const result = pricingService.estimateTokens({
        model: 'gpt-4',
        messages: [],
      });

      // 0 chars / 4 = 0, + 10 = 10, rounded = 100
      expect(result.input).toBe(100);
    });
  });

  describe('getQuote', () => {
    it('should calculate price with 15% margin', () => {
      const quote = pricingService.getQuote({
        model: 'gpt-4o-mini',
        prompt: 'Hello',
        max_tokens: 100,
      });

      expect(quote.providerId).toBe('openai');
      expect(quote.model).toBe('gpt-4o-mini');
      expect(quote.inputTokens).toBe(100);
      expect(quote.outputTokens).toBe(100);

      // Verify margin calculation
      const providerCost = parseFloat(quote.providerCost);
      const margin = parseFloat(quote.margin);
      const totalCost = parseFloat(quote.totalCost);

      expect(margin).toBeCloseTo(providerCost * 0.15, 6);
      expect(totalCost).toBeCloseTo(providerCost + margin, 6);
    });

    it('should return higher prices for expensive models', () => {
      const cheapQuote = pricingService.getQuote({
        model: 'gpt-4o-mini',
        prompt: 'Hello',
        max_tokens: 100,
      });

      const expensiveQuote = pricingService.getQuote({
        model: 'gpt-4',
        prompt: 'Hello',
        max_tokens: 100,
      });

      expect(parseFloat(expensiveQuote.totalCost))
        .toBeGreaterThan(parseFloat(cheapQuote.totalCost));
    });

    it('should throw error for unsupported model', () => {
      expect(() => {
        pricingService.getQuote({
          model: 'unsupported-model',
          prompt: 'Hello',
        });
      }).toThrow('No provider found for model');
    });

    it('should use specific provider if requested', () => {
      const quote = pricingService.getQuote(
        { model: 'gpt-4', prompt: 'Hello' },
        'openai'
      );

      expect(quote.providerId).toBe('openai');
    });
  });

  describe('usdToMOVE', () => {
    it('should convert USD to MOVE (in octas)', () => {
      // At $0.50/MOVE, $1 = 2 MOVE = 200,000,000 octas
      const result = pricingService.usdToMOVE(1);
      expect(result).toBe('200000000');
    });

    it('should handle small amounts', () => {
      // $0.001 = 0.002 MOVE = 200,000 octas
      const result = pricingService.usdToMOVE(0.001);
      expect(result).toBe('200000');
    });

    it('should round up to nearest octa', () => {
      // $0.0000001 = 0.0000002 MOVE = 20 octas (rounded up)
      const result = pricingService.usdToMOVE(0.0000001);
      expect(parseInt(result)).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getRate', () => {
    it('should return current MOVE/USD rate', () => {
      const rate = pricingService.getRate();

      expect(rate.moveUsdRate).toBe(0.5);
      expect(rate.octasPerMove).toBe(100_000_000);
    });
  });

  describe('Quote calculations', () => {
    it('should calculate costInMOVE correctly', () => {
      const quote = pricingService.getQuote({
        model: 'gpt-4o-mini',
        prompt: 'Hello',
        max_tokens: 100,
      });

      const totalCostUSD = parseFloat(quote.totalCost);
      const costInMOVE = parseFloat(quote.costInMOVE);

      // costInMOVE = totalCost / 0.5
      expect(costInMOVE).toBeCloseTo(totalCostUSD / 0.5, 6);
    });

    it('should calculate costInOctas correctly', () => {
      const quote = pricingService.getQuote({
        model: 'gpt-4o-mini',
        prompt: 'Hello',
        max_tokens: 100,
      });

      const costInMOVE = parseFloat(quote.costInMOVE);
      const costInOctas = parseInt(quote.costInOctas);

      // costInOctas = ceil(costInMOVE * 100_000_000)
      expect(costInOctas).toBe(Math.ceil(costInMOVE * 100_000_000));
    });
  });
});
