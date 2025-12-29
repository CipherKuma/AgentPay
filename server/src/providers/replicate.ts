import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import type { ImageProvider, ImageGenerationRequest, ImageGenerationResponse } from './types.js';

// Replicate model versions (stable versions)
const MODEL_VERSIONS: Record<string, string> = {
  'sdxl': 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
  'stable-diffusion': 'stability-ai/stable-diffusion:ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4',
  'flux': 'black-forest-labs/flux-schnell:bf53bdb93ddf954a07b35a900cf19f49d7d0b015b7f37d380c70b7f8cbe28e5d',
};

// Pricing per image in USD
const IMAGE_PRICING: Record<string, number> = {
  'sdxl': 0.003,
  'stable-diffusion': 0.002,
  'flux': 0.01,
};

const DEFAULT_PRICE = 0.005;
const POLL_INTERVAL_MS = 1000;
const MAX_POLL_ATTEMPTS = 120; // 2 minutes max

interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string[] | null;
  error?: string | null;
}

/**
 * Replicate image generation provider
 */
export const replicateProvider: ImageProvider = {
  id: 'replicate',
  name: 'Replicate',
  models: Object.keys(MODEL_VERSIONS),

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const startTime = Date.now();
    const apiToken = config.providers.replicateApiToken;

    if (!apiToken) {
      throw new Error('REPLICATE_API_TOKEN not configured');
    }

    const model = request.model || 'sdxl';
    const version = MODEL_VERSIONS[model];
    if (!version) {
      throw new Error(`Unsupported model: ${model}. Available: ${Object.keys(MODEL_VERSIONS).join(', ')}`);
    }

    console.log(`[Replicate] Starting prediction for model: ${model}`);

    // Create prediction
    const prediction = await createPrediction(apiToken, version, request);

    // Poll until complete
    const result = await pollPrediction(apiToken, prediction.id);
    const latencyMs = Date.now() - startTime;

    if (result.status === 'failed') {
      throw new Error(`Replicate prediction failed: ${result.error || 'Unknown error'}`);
    }

    const images = (result.output || []).map((url: string) => ({ url }));

    console.log(`[Replicate] Completed in ${latencyMs}ms, generated ${images.length} image(s)`);

    return {
      id: result.id,
      images,
      latency_ms: latencyMs,
    };
  },

  getImagePricing(model: string): number {
    return IMAGE_PRICING[model] || DEFAULT_PRICE;
  },

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch('https://api.replicate.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${config.providers.replicateApiToken}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};

async function createPrediction(
  apiToken: string,
  version: string,
  request: ImageGenerationRequest
): Promise<ReplicatePrediction> {
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiToken}`,
    },
    body: JSON.stringify({
      version: version.split(':')[1],
      input: {
        prompt: request.prompt,
        num_outputs: request.n || 1,
        ...(request.size && parseSize(request.size)),
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Replicate API error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function pollPrediction(apiToken: string, predictionId: string): Promise<ReplicatePrediction> {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to poll prediction: ${response.status}`);
    }

    const prediction: ReplicatePrediction = await response.json();

    if (prediction.status === 'succeeded' || prediction.status === 'failed' || prediction.status === 'canceled') {
      return prediction;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error('Prediction timed out');
}

function parseSize(size: string): { width?: number; height?: number } {
  const match = size.match(/(\d+)x(\d+)/);
  if (match) {
    return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
  }
  return {};
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
