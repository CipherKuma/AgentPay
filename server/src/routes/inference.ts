import { Router, Request, Response, NextFunction } from 'express';
import type { InferenceRequest } from '../providers/types.js';
import { config } from '../config/index.js';
import { routingEngine, type RoutingPreferences } from '../routing/index.js';

const router = Router();

interface InferenceBody extends InferenceRequest {
  provider?: string;
  max_latency_ms?: number;
  max_price?: number;
}

/**
 * POST /v1/inference
 * Execute an inference request through a provider
 */
router.post('/inference', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as InferenceBody;

    // Validate request
    if (!body.model) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'model is required' },
      });
    }

    if (!body.prompt && !body.messages) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'prompt or messages required' },
      });
    }

    // Build routing preferences
    const preferences: RoutingPreferences = {
      provider: body.provider,
      max_latency_ms: body.max_latency_ms,
      max_price: body.max_price,
    };

    console.log('[Inference] Request:', {
      model: body.model,
      preferences,
      hasPrompt: !!body.prompt,
      hasMessages: !!body.messages,
    });

    // Select provider using routing engine
    const provider = routingEngine.selectProvider(body.model, preferences);

    if (!provider) {
      return res.status(400).json({
        error: {
          code: 'NO_PROVIDER',
          message: `No available provider for model: ${body.model}`,
        },
      });
    }

    console.log(`[Inference] Selected provider: ${provider.id}`);

    // Handle streaming requests
    if (body.stream) {
      if (!provider.inferenceStream) {
        return res.status(400).json({
          error: {
            code: 'STREAMING_NOT_SUPPORTED',
            message: `Provider ${provider.id} does not support streaming`,
          },
        });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Provider', provider.id);

      console.log('[Inference] Starting stream');

      try {
        for await (const chunk of provider.inferenceStream(body)) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
        res.write('data: [DONE]\n\n');
        res.end();
        routingEngine.updateProviderStatus(provider.id, true, 0);
      } catch (error) {
        routingEngine.updateProviderStatus(provider.id, false, 0);
        console.error('[Inference] Streaming error:', error);
        res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
        res.end();
      }
      return;
    }

    // Non-streaming request
    const startTime = Date.now();
    let success = true;

    try {
      const response = await provider.inference(body);
      const latencyMs = Date.now() - startTime;

      // Update provider status
      routingEngine.updateProviderStatus(provider.id, true, latencyMs);

      // Calculate cost with margin
      const pricing = provider.getPricing(body.model);
      const inputCost = (response.usage.prompt_tokens / 1000) * pricing.input;
      const outputCost = (response.usage.completion_tokens / 1000) * pricing.output;
      const baseCost = inputCost + outputCost;
      const margin = baseCost * (config.pricing.marginPercent / 100);
      const totalCost = baseCost + margin;

      console.log('[Inference] Response:', {
        id: response.id,
        provider: provider.id,
        latency_ms: response.latency_ms,
        tokens: response.usage.total_tokens,
        cost: totalCost.toFixed(6),
      });

      res.json({
        ...response,
        provider: provider.id,
        cost: {
          amount: totalCost.toFixed(6),
          currency: 'USD',
          breakdown: {
            input_cost: inputCost.toFixed(6),
            output_cost: outputCost.toFixed(6),
            margin: margin.toFixed(6),
          },
        },
      });
    } catch (error) {
      success = false;
      routingEngine.updateProviderStatus(provider.id, false, Date.now() - startTime);
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

export default router;
