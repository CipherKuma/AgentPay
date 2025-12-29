import { getComputeProvider } from '../providers/index.js';

// 1 MOVE = $0.50 USD (fixed rate for MVP)
const MOVE_USD_RATE = 0.50;
// 1 MOVE = 100,000,000 octas
const OCTAS_PER_MOVE = 100_000_000;
// 15% margin
const MARGIN_PERCENT = 0.15;

export interface ComputePriceQuote {
  gpuType: string;
  gpuCount: number;
  timeoutSeconds: number;
  maxHours: string;
  pricePerHour: string;      // USD per hour per GPU
  providerCost: string;      // Max provider cost in USD
  margin: string;            // 15% markup
  totalCost: string;         // Max customer pays in USD
  costInMOVE: string;        // Converted to MOVE
  costInOctas: string;       // In base units
  providerId: string;
}

/**
 * Get compute price quote for maximum possible cost
 * Customer pays upfront based on timeout; refund calculated on completion
 */
export function getComputeQuote(
  gpuType: string,
  gpuCount: number,
  timeoutSeconds: number,
  providerId?: string
): ComputePriceQuote {
  const provider = getComputeProvider(providerId);

  if (!provider) {
    throw new Error(`Compute provider not found: ${providerId || 'default'}`);
  }

  // Validate GPU type
  if (!provider.gpuTypes.includes(gpuType)) {
    throw new Error(`GPU type ${gpuType} not available. Available: ${provider.gpuTypes.join(', ')}`);
  }

  // Get pricing from provider
  const { perHour } = provider.getComputePricing(gpuType);

  // Calculate maximum hours based on timeout
  const maxHours = timeoutSeconds / 3600;

  // Calculate maximum cost (what customer pays upfront)
  const providerCost = perHour * maxHours * gpuCount;
  const margin = providerCost * MARGIN_PERCENT;
  const totalCost = providerCost + margin;

  // Convert to MOVE
  const costInMOVE = totalCost / MOVE_USD_RATE;
  const costInOctas = Math.ceil(costInMOVE * OCTAS_PER_MOVE);

  return {
    gpuType,
    gpuCount,
    timeoutSeconds,
    maxHours: maxHours.toFixed(4),
    pricePerHour: perHour.toFixed(4),
    providerCost: providerCost.toFixed(6),
    margin: margin.toFixed(6),
    totalCost: totalCost.toFixed(6),
    costInMOVE: costInMOVE.toFixed(8),
    costInOctas: costInOctas.toString(),
    providerId: provider.id,
  };
}

/**
 * Calculate actual cost after job completion
 * Returns refund amount if job completed early
 */
export function calculateActualCost(
  gpuType: string,
  gpuCount: number,
  actualSeconds: number,
  maxTimeoutSeconds: number,
  providerId?: string
): {
  actualCost: string;
  refundAmount: string;
  refundOctas: string;
} {
  const provider = getComputeProvider(providerId);

  if (!provider) {
    throw new Error(`Compute provider not found: ${providerId || 'default'}`);
  }

  const { perHour } = provider.getComputePricing(gpuType);

  // Calculate actual cost
  const actualHours = actualSeconds / 3600;
  const actualProviderCost = perHour * actualHours * gpuCount;
  const actualMargin = actualProviderCost * MARGIN_PERCENT;
  const actualTotalCost = actualProviderCost + actualMargin;

  // Calculate what was paid upfront
  const maxHours = maxTimeoutSeconds / 3600;
  const maxProviderCost = perHour * maxHours * gpuCount;
  const maxMargin = maxProviderCost * MARGIN_PERCENT;
  const maxTotalCost = maxProviderCost + maxMargin;

  // Calculate refund
  const refundAmount = Math.max(0, maxTotalCost - actualTotalCost);
  const refundInMOVE = refundAmount / MOVE_USD_RATE;
  const refundOctas = Math.floor(refundInMOVE * OCTAS_PER_MOVE);

  return {
    actualCost: actualTotalCost.toFixed(6),
    refundAmount: refundAmount.toFixed(6),
    refundOctas: refundOctas.toString(),
  };
}

/**
 * Convert USD amount to octas
 */
export function usdToOctas(usdAmount: number): string {
  const moveAmount = usdAmount / MOVE_USD_RATE;
  const octas = Math.ceil(moveAmount * OCTAS_PER_MOVE);
  return octas.toString();
}
