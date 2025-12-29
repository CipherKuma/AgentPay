import { Router, Request, Response } from 'express';
import { listModels, listImageModels } from '../providers/index.js';
import { pricingService } from '../services/pricing.js';
import { getRate } from '../services/image-pricing.js';
import { mockComputeProvider } from '../providers/compute.js';
import { calculateComputePrice } from '../middleware/x402.js';

const router = Router();

// GPU types with pricing info
interface GpuTypeInfo {
  id: string;
  name: string;
  memory: string;
  pricing: {
    per_hour: { usd: string; move: string; octas: string };
  };
}

/**
 * GET /v1/models
 * List all available models with pricing
 */
router.get('/models', (_req: Request, res: Response) => {
  try {
    const models = listModels();
    const { moveUsdRate, octasPerMove } = pricingService.getRate();

    // Enhance with formatted pricing
    const modelsWithPricing = models.map((model) => {
      // Calculate cost for 1K input + 1K output tokens with margin
      const inputCost = model.pricing.input;
      const outputCost = model.pricing.output;
      const baseCost = inputCost + outputCost;
      const withMargin = baseCost * 1.15; // 15% margin
      const movePrice = withMargin / moveUsdRate;

      return {
        id: model.id,
        provider: model.provider,
        pricing: {
          input_per_1k_tokens: {
            usd: model.pricing.input.toFixed(6),
            move: (model.pricing.input / moveUsdRate).toFixed(8),
          },
          output_per_1k_tokens: {
            usd: model.pricing.output.toFixed(6),
            move: (model.pricing.output / moveUsdRate).toFixed(8),
          },
          per_1k_total: {
            usd: withMargin.toFixed(6),
            move: movePrice.toFixed(8),
            octas: Math.ceil(movePrice * octasPerMove).toString(),
          },
        },
      };
    });

    // Get image models
    const imageModels = listImageModels();
    const imageRate = getRate();

    const imageModelsWithPricing = imageModels.map((model) => {
      const pricePerImage = model.pricePerImage;
      const withMargin = pricePerImage * 1.15; // 15% margin
      const movePrice = withMargin / imageRate.moveUsdRate;

      return {
        id: model.id,
        type: 'image' as const,
        provider: model.provider,
        pricing: {
          per_image: {
            usd: withMargin.toFixed(6),
            move: movePrice.toFixed(8),
            octas: Math.ceil(movePrice * imageRate.octasPerMove).toString(),
          },
        },
      };
    });

    // Add type to inference models
    const inferenceModelsWithType = modelsWithPricing.map((m) => ({
      ...m,
      type: 'inference' as const,
    }));

    const allModels = [...inferenceModelsWithType, ...imageModelsWithPricing];

    res.json({
      models: allModels,
      meta: {
        count: allModels.length,
        inference_count: inferenceModelsWithType.length,
        image_count: imageModelsWithPricing.length,
        move_usd_rate: moveUsdRate,
        margin_percent: 15,
      },
    });
  } catch (error) {
    console.error('[Models] Error listing models:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list models',
      },
    });
  }
});

// GPU metadata for display
const GPU_METADATA: Record<string, { name: string; memory: string }> = {
  'A100': { name: 'NVIDIA A100', memory: '80GB' },
  'H100': { name: 'NVIDIA H100', memory: '80GB' },
  '4090': { name: 'NVIDIA GeForce RTX 4090', memory: '24GB' },
};

/**
 * GET /v1/compute/gpu-types
 * List available GPU types with pricing
 */
router.get('/compute/gpu-types', (_req: Request, res: Response) => {
  try {
    const gpuTypes = mockComputeProvider.gpuTypes;
    const moveUsdRate = 0.50; // 1 MOVE = $0.50
    const octasPerMove = 100_000_000;

    const gpuTypesWithPricing: GpuTypeInfo[] = gpuTypes.map((gpuType) => {
      const pricing = mockComputeProvider.getComputePricing(gpuType);
      const priceWithMargin = pricing.perHour * 1.15; // 15% margin
      const movePrice = priceWithMargin / moveUsdRate;
      const metadata = GPU_METADATA[gpuType] || { name: gpuType, memory: 'N/A' };

      return {
        id: gpuType,
        name: metadata.name,
        memory: metadata.memory,
        pricing: {
          per_hour: {
            usd: priceWithMargin.toFixed(2),
            move: movePrice.toFixed(4),
            octas: Math.ceil(movePrice * octasPerMove).toString(),
          },
        },
      };
    });

    res.json({
      gpu_types: gpuTypesWithPricing,
      meta: {
        count: gpuTypesWithPricing.length,
        move_usd_rate: moveUsdRate,
        margin_percent: 15,
      },
    });
  } catch (error) {
    console.error('[Models] Error listing GPU types:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list GPU types',
      },
    });
  }
});

export default router;
