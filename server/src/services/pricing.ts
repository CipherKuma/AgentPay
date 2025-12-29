import { InferenceRequest } from '../providers/types.js';
import { getProvider, findProvidersForModel } from '../providers/index.js';

// 1 MOVE = $0.50 USD (fixed rate for MVP)
const MOVE_USD_RATE = 0.50;
// 1 MOVE = 100,000,000 octas
const OCTAS_PER_MOVE = 100_000_000;
// 15% margin
const MARGIN_PERCENT = 0.15;

export interface PriceQuote {
  estimatedTokens: number;
  inputTokens: number;
  outputTokens: number;
  providerCost: string;      // In USD
  margin: string;            // 15% markup
  totalCost: string;         // What customer pays in USD
  costInMOVE: string;        // Converted to MOVE
  costInOctas: string;       // In base units
  providerId: string;
  model: string;
}

export class PricingService {
  /**
   * Estimate tokens from request body
   */
  estimateTokens(request: InferenceRequest): { input: number; output: number } {
    let inputTokens = 0;

    // Estimate input tokens
    if (request.prompt) {
      // Count words × 1.3 for word-based estimation
      const words = request.prompt.split(/\s+/).filter(Boolean).length;
      inputTokens = Math.ceil(words * 1.3);
    } else if (request.messages && request.messages.length > 0) {
      // Sum content lengths, divide by 4 (avg chars per token)
      const totalChars = request.messages.reduce(
        (sum, msg) => sum + (msg.content?.length || 0),
        0
      );
      inputTokens = Math.ceil(totalChars / 4);
    }

    // Add system overhead (~10 tokens)
    inputTokens = Math.max(inputTokens + 10, 10);

    // Estimate output tokens (use max_tokens or default)
    const outputTokens = request.max_tokens || 256;

    // Round up to nearest 100
    return {
      input: Math.ceil(inputTokens / 100) * 100,
      output: Math.ceil(outputTokens / 100) * 100,
    };
  }

  /**
   * Get price quote for a request
   */
  getQuote(request: InferenceRequest, providerId?: string): PriceQuote {
    // Find provider
    let provider = providerId ? getProvider(providerId) : undefined;

    if (!provider) {
      const providers = findProvidersForModel(request.model);
      provider = providers[0]; // Use first available
    }

    if (!provider) {
      throw new Error(`No provider found for model: ${request.model}`);
    }

    // Estimate tokens
    const { input: inputTokens, output: outputTokens } = this.estimateTokens(request);
    const estimatedTokens = inputTokens + outputTokens;

    // Get pricing from provider (per 1K tokens)
    const pricing = provider.getPricing(request.model);

    // Calculate costs in USD
    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;
    const providerCost = inputCost + outputCost;

    // Apply margin
    const margin = providerCost * MARGIN_PERCENT;
    const totalCost = providerCost + margin;

    // Convert to MOVE
    const costInMOVE = totalCost / MOVE_USD_RATE;
    const costInOctas = Math.ceil(costInMOVE * OCTAS_PER_MOVE);

    return {
      estimatedTokens,
      inputTokens,
      outputTokens,
      providerCost: providerCost.toFixed(6),
      margin: margin.toFixed(6),
      totalCost: totalCost.toFixed(6),
      costInMOVE: costInMOVE.toFixed(8),
      costInOctas: costInOctas.toString(),
      providerId: provider.id,
      model: request.model,
    };
  }

  /**
   * Convert USD to MOVE (in octas)
   */
  usdToMOVE(usdAmount: number): string {
    const moveAmount = usdAmount / MOVE_USD_RATE;
    const octas = Math.ceil(moveAmount * OCTAS_PER_MOVE);
    return octas.toString();
  }

  /**
   * Get MOVE/USD rate
   */
  getRate(): { moveUsdRate: number; octasPerMove: number } {
    return {
      moveUsdRate: MOVE_USD_RATE,
      octasPerMove: OCTAS_PER_MOVE,
    };
  }
}

// Singleton instance
export const pricingService = new PricingService();
