/**
 * Streaming chunk structure (SSE format)
 */
export interface StreamChunk {
  id: string;
  delta: string;
  finish_reason?: string;
}

/**
 * Provider interface for AI/compute services
 */
export interface Provider {
  id: string;
  name: string;
  models: string[];

  inference(request: InferenceRequest): Promise<InferenceResponse>;
  inferenceStream?(request: InferenceRequest): AsyncIterable<StreamChunk>;
  estimateTokens(prompt: string, maxTokens?: number): number;
  getPricing(model: string): { input: number; output: number }; // per 1K tokens
  healthCheck(): Promise<boolean>;
}

/**
 * Inference request structure (OpenAI-compatible)
 */
export interface InferenceRequest {
  model: string;
  prompt?: string;
  messages?: Array<{ role: string; content: string }>;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

/**
 * Inference response structure
 */
export interface InferenceResponse {
  id: string;
  model: string;
  output: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  latency_ms: number;
}

/**
 * Provider metadata for listing
 */
export interface ProviderInfo {
  id: string;
  name: string;
  models: string[];
  status: 'available' | 'unavailable' | 'degraded';
}

/**
 * Model info with pricing
 */
export interface ModelInfo {
  id: string;
  provider: string;
  pricing: {
    input: number;
    output: number;
  };
}

/**
 * Image generation provider interface
 */
export interface ImageProvider {
  id: string;
  name: string;
  models: string[];

  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse>;
  getImagePricing(model: string): number; // price per image
  healthCheck(): Promise<boolean>;
}

/**
 * Image generation request
 */
export interface ImageGenerationRequest {
  prompt: string;
  model?: string;
  size?: string;
  n?: number;
}

/**
 * Image generation response
 */
export interface ImageGenerationResponse {
  id: string;
  images: { url: string; b64_json?: string }[];
  latency_ms: number;
}

/**
 * Image model info with pricing
 */
export interface ImageModelInfo {
  id: string;
  provider: string;
  pricePerImage: number;
}

// ==================== Compute Provider Types ====================

/**
 * Compute provider interface for GPU/container jobs
 */
export interface ComputeProvider {
  id: string;
  name: string;
  gpuTypes: string[];  // ['A100', 'H100', '4090']

  runJob(request: ComputeRunRequest): Promise<ComputeJobHandle>;
  getJobStatus(jobId: string): Promise<ComputeJobStatus>;
  cancelJob(jobId: string): Promise<void>;
  getComputePricing(gpuType: string): { perHour: number }; // USD per hour
  healthCheck(): Promise<boolean>;
}

/**
 * Request to run a compute job
 */
export interface ComputeRunRequest {
  image: string;
  command?: string[];
  env?: Record<string, string>;
  gpu?: { type: string; count: number };
  timeout_seconds: number;
}

/**
 * Handle returned when job is created
 */
export interface ComputeJobHandle {
  id: string;
  status: 'pending' | 'running';
  estimatedCost: string;
}

/**
 * Status of a compute job
 */
export interface ComputeJobStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: string;
  logs?: string;
  duration_seconds?: number;
  cost?: string;
}

/**
 * Compute provider metadata for listing
 */
export interface ComputeProviderInfo {
  id: string;
  name: string;
  gpuTypes: string[];
  status: 'available' | 'unavailable' | 'degraded';
}

/**
 * GPU type info with pricing
 */
export interface GpuTypeInfo {
  type: string;
  provider: string;
  pricePerHour: number;
}
