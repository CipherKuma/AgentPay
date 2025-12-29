import { getImageProvider, findImageProvidersForModel } from '../providers/index.js';

// 1 MOVE = $0.50 USD (fixed rate for MVP)
const MOVE_USD_RATE = 0.50;
// 1 MOVE = 100,000,000 octas
const OCTAS_PER_MOVE = 100_000_000;
// 15% margin
const MARGIN_PERCENT = 0.15;

export interface ImagePriceQuote {
  model: string;
  count: number;
  pricePerImage: string;    // USD per image
  providerCost: string;     // Total provider cost in USD
  margin: string;           // 15% markup
  totalCost: string;        // What customer pays in USD
  costInMOVE: string;       // Converted to MOVE
  costInOctas: string;      // In base units
  providerId: string;
}

/**
 * Get image generation price quote
 */
export function getImageQuote(model: string, count: number = 1, providerId?: string): ImagePriceQuote {
  // Find provider
  let provider = providerId ? getImageProvider(providerId) : undefined;

  if (!provider) {
    const providers = findImageProvidersForModel(model);
    provider = providers[0]; // Use first available
  }

  if (!provider) {
    throw new Error(`No provider found for image model: ${model}`);
  }

  // Get price per image from provider
  const pricePerImage = provider.getImagePricing(model);
  const providerCost = pricePerImage * count;

  // Apply margin
  const margin = providerCost * MARGIN_PERCENT;
  const totalCost = providerCost + margin;

  // Convert to MOVE
  const costInMOVE = totalCost / MOVE_USD_RATE;
  const costInOctas = Math.ceil(costInMOVE * OCTAS_PER_MOVE);

  return {
    model,
    count,
    pricePerImage: pricePerImage.toFixed(6),
    providerCost: providerCost.toFixed(6),
    margin: margin.toFixed(6),
    totalCost: totalCost.toFixed(6),
    costInMOVE: costInMOVE.toFixed(8),
    costInOctas: costInOctas.toString(),
    providerId: provider.id,
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

/**
 * Get MOVE/USD rate
 */
export function getRate(): { moveUsdRate: number; octasPerMove: number } {
  return {
    moveUsdRate: MOVE_USD_RATE,
    octasPerMove: OCTAS_PER_MOVE,
  };
}
