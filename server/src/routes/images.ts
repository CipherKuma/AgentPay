import { Router, Request, Response, NextFunction } from 'express';
import type { ImageGenerationRequest } from '../providers/types.js';
import { config } from '../config/index.js';
import { findImageProvidersForModel } from '../providers/index.js';
import { getImageQuote } from '../services/image-pricing.js';

const router = Router();

interface ImageBody extends ImageGenerationRequest {
  provider?: string;
}

/**
 * POST /v1/images/generate
 * Generate images using AI models
 */
router.post('/images/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as ImageBody;

    // Validate prompt is present
    if (!body.prompt) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'prompt is required' },
      });
    }

    // Default model to 'sdxl' if not specified
    const model = body.model || 'sdxl';
    // Default n to 1
    const count = body.n || 1;

    console.log('[Images] Request:', {
      model,
      count,
      size: body.size,
      promptLength: body.prompt.length,
    });

    // Find available provider
    const providers = findImageProvidersForModel(model);

    if (providers.length === 0) {
      return res.status(400).json({
        error: {
          code: 'NO_PROVIDER',
          message: `No available provider for image model: ${model}`,
        },
      });
    }

    // Select first available provider (or specified one)
    let provider = providers[0];
    if (body.provider) {
      const specified = providers.find((p) => p.id === body.provider);
      if (specified) {
        provider = specified;
      } else {
        return res.status(400).json({
          error: {
            code: 'PROVIDER_NOT_FOUND',
            message: `Provider ${body.provider} not available for model: ${model}`,
          },
        });
      }
    }

    console.log(`[Images] Selected provider: ${provider.id}`);

    // Generate image
    const request: ImageGenerationRequest = {
      prompt: body.prompt,
      model,
      size: body.size,
      n: count,
    };

    const startTime = Date.now();
    const response = await provider.generateImage(request);
    const latencyMs = Date.now() - startTime;

    // Calculate cost with margin
    const quote = getImageQuote(model, count, provider.id);

    console.log('[Images] Response:', {
      id: response.id,
      provider: provider.id,
      latency_ms: latencyMs,
      images: response.images.length,
      cost: quote.totalCost,
    });

    res.json({
      id: response.id,
      model,
      provider: provider.id,
      data: response.images,
      latency_ms: latencyMs,
      cost: {
        amount: quote.totalCost,
        currency: 'USD',
        breakdown: {
          count,
          price_per_image: quote.pricePerImage,
          provider_cost: quote.providerCost,
          margin: quote.margin,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
