import { openaiProvider } from './openai.js';
import { replicateProvider } from './replicate.js';
import { mockComputeProvider } from './compute.js';
import { createTogetherProvider } from './together.js';
import { createGroqProvider } from './groq.js';
import { config } from '../config/index.js';
import type {
  Provider,
  ProviderInfo,
  ModelInfo,
  ImageProvider,
  ImageModelInfo,
  ComputeProvider,
  ComputeProviderInfo,
  GpuTypeInfo,
} from './types.js';

export * from './types.js';

// Provider registry (inference)
const providers: Map<string, Provider> = new Map([
  ['openai', openaiProvider],
]);

// Initialize Together AI provider if API key is available
const togetherProvider = createTogetherProvider(config.providers.togetherApiKey);
if (togetherProvider) {
  providers.set('together', togetherProvider);
  console.log('[Providers] Registered: Together AI');
}

// Initialize Groq provider if API key is available
const groqProvider = createGroqProvider(config.providers.groqApiKey);
if (groqProvider) {
  providers.set('groq', groqProvider);
  console.log('[Providers] Registered: Groq');
}

// Image provider registry
const imageProviders: Map<string, ImageProvider> = new Map([
  ['replicate', replicateProvider],
]);

/**
 * Get a provider by ID
 */
export function getProvider(id: string): Provider | undefined {
  return providers.get(id);
}

/**
 * Get provider or throw if not found
 */
export function getProviderOrThrow(id: string): Provider {
  const provider = providers.get(id);
  if (!provider) {
    throw new Error(`Provider not found: ${id}`);
  }
  return provider;
}

/**
 * List all registered providers
 */
export function listProviders(): ProviderInfo[] {
  return Array.from(providers.values()).map((p) => ({
    id: p.id,
    name: p.name,
    models: p.models,
    status: 'available' as const,
  }));
}

/**
 * List all available models across providers
 */
export function listModels(): ModelInfo[] {
  const models: ModelInfo[] = [];

  for (const provider of providers.values()) {
    for (const modelId of provider.models) {
      models.push({
        id: modelId,
        provider: provider.id,
        pricing: provider.getPricing(modelId),
      });
    }
  }

  return models;
}

/**
 * Find providers that support a specific model
 */
export function findProvidersForModel(model: string): Provider[] {
  return Array.from(providers.values()).filter((p) =>
    p.models.includes(model)
  );
}

/**
 * Register a new provider
 */
export function registerProvider(provider: Provider): void {
  providers.set(provider.id, provider);
  console.log(`[Providers] Registered: ${provider.id} with ${provider.models.length} models`);
}

// ==================== Image Providers ====================

/**
 * Get an image provider by ID
 */
export function getImageProvider(id: string): ImageProvider | undefined {
  return imageProviders.get(id);
}

/**
 * Get image provider or throw if not found
 */
export function getImageProviderOrThrow(id: string): ImageProvider {
  const provider = imageProviders.get(id);
  if (!provider) {
    throw new Error(`Image provider not found: ${id}`);
  }
  return provider;
}

/**
 * List all image models across providers
 */
export function listImageModels(): ImageModelInfo[] {
  const models: ImageModelInfo[] = [];

  for (const provider of imageProviders.values()) {
    for (const modelId of provider.models) {
      models.push({
        id: modelId,
        provider: provider.id,
        pricePerImage: provider.getImagePricing(modelId),
      });
    }
  }

  return models;
}

/**
 * Find image providers that support a specific model
 */
export function findImageProvidersForModel(model: string): ImageProvider[] {
  return Array.from(imageProviders.values()).filter((p) =>
    p.models.includes(model)
  );
}

/**
 * Register a new image provider
 */
export function registerImageProvider(provider: ImageProvider): void {
  imageProviders.set(provider.id, provider);
  console.log(`[Providers] Registered image provider: ${provider.id} with ${provider.models.length} models`);
}

// ==================== Compute Providers ====================

// Compute provider registry
const computeProviders: Map<string, ComputeProvider> = new Map([
  ['mock', mockComputeProvider],
]);

/**
 * Get the active compute provider
 * For MVP, defaults to mock provider
 */
export function getComputeProvider(id?: string): ComputeProvider | undefined {
  if (id) {
    return computeProviders.get(id);
  }
  // Default to mock provider
  return computeProviders.get('mock');
}

/**
 * Get compute provider or throw if not found
 */
export function getComputeProviderOrThrow(id?: string): ComputeProvider {
  const provider = getComputeProvider(id);
  if (!provider) {
    throw new Error(`Compute provider not found: ${id || 'default'}`);
  }
  return provider;
}

/**
 * List all registered compute providers
 */
export function listComputeProviders(): ComputeProviderInfo[] {
  return Array.from(computeProviders.values()).map((p) => ({
    id: p.id,
    name: p.name,
    gpuTypes: p.gpuTypes,
    status: 'available' as const,
  }));
}

/**
 * List all available GPU types across providers
 */
export function listGpuTypes(): GpuTypeInfo[] {
  const gpuTypes: GpuTypeInfo[] = [];

  for (const provider of computeProviders.values()) {
    for (const gpuType of provider.gpuTypes) {
      gpuTypes.push({
        type: gpuType,
        provider: provider.id,
        pricePerHour: provider.getComputePricing(gpuType).perHour,
      });
    }
  }

  return gpuTypes;
}

/**
 * Register a new compute provider
 */
export function registerComputeProvider(provider: ComputeProvider): void {
  computeProviders.set(provider.id, provider);
  console.log(`[Providers] Registered compute provider: ${provider.id} with GPUs: ${provider.gpuTypes.join(', ')}`);
}
