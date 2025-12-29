import { paymentMiddlewareSimple, type RoutesMap } from 'x402plus';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import { pricingService } from '../services/pricing.js';
import type { InferenceRequest } from '../providers/types.js';

// GPU pricing in USD per hour (must match compute provider)
const GPU_HOURLY_RATES: Record<string, number> = {
  'A100': 2.50,
  'H100': 4.00,
  '4090': 1.00,
};
const MARGIN = 1.15; // 15% margin
const MOVE_USD_RATE = 0.50; // 1 MOVE = $0.50
const OCTAS_PER_MOVE = 100_000_000;

export interface RouteConfig {
  price: string; // Amount in smallest unit (octas)
  description?: string;
  dynamic?: boolean; // Enable dynamic pricing
}

export type RouteMap = Record<string, RouteConfig>;

/**
 * Creates x402 payment middleware with route-specific pricing
 */
export function createX402Middleware(routes: RouteMap) {
  const payTo = config.movement.payTo;

  if (!payTo) {
    console.warn('[x402] MOVEMENT_PAY_TO not configured, payment verification disabled');
    return (_req: any, _res: any, next: any) => next();
  }

  // Transform routes to x402plus format
  const x402Routes: RoutesMap = {};

  for (const [route, routeConfig] of Object.entries(routes)) {
    x402Routes[route] = {
      network: config.movement.network,
      asset: 'MOVE', // Native MOVE token
      maxAmountRequired: routeConfig.price,
      description: routeConfig.description || `Access to ${route}`,
    };
  }

  return paymentMiddlewareSimple(
    payTo,
    x402Routes,
    {
      url: config.movement.facilitatorUrl,
    }
  );
}

/**
 * Dynamic pricing middleware - calculates price based on request body
 * Use this before x402 middleware for inference endpoints
 */
export function dynamicPricingMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Skip if no body or no model
    if (!req.body?.model) {
      return next();
    }

    const inferenceRequest: InferenceRequest = {
      model: req.body.model,
      prompt: req.body.prompt,
      messages: req.body.messages,
      max_tokens: req.body.max_tokens,
    };

    const quote = pricingService.getQuote(inferenceRequest);

    // Attach quote to request for use by routes
    (req as any).priceQuote = quote;

    console.log('[x402] Dynamic price:', {
      model: quote.model,
      tokens: quote.estimatedTokens,
      usd: quote.totalCost,
      octas: quote.costInOctas,
    });

    next();
  } catch (error) {
    console.error('[x402] Dynamic pricing error:', error);
    next();
  }
}

/**
 * Calculate compute price based on GPU type, count, and timeout
 */
export function calculateComputePrice(
  gpuType: string,
  gpuCount: number,
  timeoutSeconds: number
): { usd: number; octas: string } {
  const hourlyRate = GPU_HOURLY_RATES[gpuType] || GPU_HOURLY_RATES['A100'];
  const hoursMax = timeoutSeconds / 3600;

  // Calculate max cost (charge for full timeout as escrow)
  const baseCost = hoursMax * hourlyRate * gpuCount;
  const costWithMargin = baseCost * MARGIN;

  // Convert to octas
  const moveAmount = costWithMargin / MOVE_USD_RATE;
  const octas = Math.ceil(moveAmount * OCTAS_PER_MOVE);

  return { usd: costWithMargin, octas: octas.toString() };
}

/**
 * Dynamic pricing middleware for compute endpoints
 * Calculates price based on GPU type, count, and timeout
 */
export function computePricingMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Skip if not a compute request or missing required fields
    if (!req.body?.timeout_seconds) {
      return next();
    }

    const gpu = req.body.gpu || { type: 'A100', count: 1 };
    const timeoutSeconds = req.body.timeout_seconds;

    const pricing = calculateComputePrice(gpu.type, gpu.count, timeoutSeconds);

    // Attach pricing to request
    (req as any).computePrice = pricing;

    console.log('[x402] Compute price:', {
      gpu: gpu.type,
      count: gpu.count,
      timeout: timeoutSeconds,
      usd: pricing.usd.toFixed(4),
      octas: pricing.octas,
    });

    next();
  } catch (error) {
    console.error('[x402] Compute pricing error:', error);
    next();
  }
}

// Default route configuration for AgentPay endpoints
// Prices are in octas (1 MOVE = 100,000,000 octas, 1 MOVE = $0.50)
// $0.001 = 0.002 MOVE = 200,000 octas
// $0.01 = 0.02 MOVE = 2,000,000 octas
// $0.05 = 0.1 MOVE = 10,000,000 octas
export const defaultRoutes: RouteMap = {
  'POST /v1/inference': {
    price: '200000', // ~$0.001
    description: 'LLM inference request',
  },
  'POST /v1/images/generate': {
    price: '2000000', // ~$0.01
    description: 'Image generation request',
  },
  'POST /v1/compute/run': {
    price: '10000000', // ~$0.05
    description: 'GPU compute job',
  },
};
