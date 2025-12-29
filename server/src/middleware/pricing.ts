import { Request, Response, NextFunction } from 'express';
import { pricingService, PriceQuote } from '../services/pricing.js';
import type { InferenceRequest } from '../providers/types.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      priceQuote?: PriceQuote;
    }
  }
}

/**
 * Middleware that calculates dynamic pricing based on request body
 * Attaches price info to request for downstream use
 */
export function pricingMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Only process requests with body (POST, PUT, PATCH)
    if (!req.body || Object.keys(req.body).length === 0) {
      return next();
    }

    // Check if this is an inference request
    const inferenceRequest: InferenceRequest = {
      model: req.body.model,
      prompt: req.body.prompt,
      messages: req.body.messages,
      max_tokens: req.body.max_tokens,
    };

    // Skip if no model specified
    if (!inferenceRequest.model) {
      return next();
    }

    // Calculate price quote
    const quote = pricingService.getQuote(inferenceRequest, req.body.provider);

    // Attach to request
    req.priceQuote = quote;

    // Log for debugging
    console.log('[Pricing] Quote calculated:', {
      model: quote.model,
      provider: quote.providerId,
      tokens: quote.estimatedTokens,
      costUSD: quote.totalCost,
      costOctas: quote.costInOctas,
    });

    next();
  } catch (error) {
    // Log error but don't block request
    console.error('[Pricing] Error calculating quote:', error);
    next();
  }
}

/**
 * Get price for a specific endpoint type
 */
export function getEndpointPrice(endpoint: string, body?: any): string {
  // Default prices by endpoint type
  const defaults: Record<string, string> = {
    '/v1/inference': '$0.001',
    '/v1/images/generate': '$0.01',
    '/v1/compute/run': '$0.05',
  };

  // Try to calculate dynamic price if body has model
  if (body?.model) {
    try {
      const quote = pricingService.getQuote(body as InferenceRequest);
      return quote.costInOctas;
    } catch {
      // Fall through to default
    }
  }

  return defaults[endpoint] || '$0.01';
}
