// Request types
export interface InferenceRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ImageGenerationRequest {
  prompt: string;
  model?: string;
  size?: string;
  n?: number;
}

export interface ComputeRunRequest {
  image: string;
  command?: string[];
  env?: Record<string, string>;
  gpu?: string;
  timeout_seconds?: number;
}

// Response types
export interface InferenceResponse {
  id: string;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost: CostInfo;
}

export interface ImageGenerationResponse {
  id: string;
  created: number;
  data: {
    url?: string;
    b64_json?: string;
  }[];
  cost: CostInfo;
}

export interface ComputeRunResponse {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: string;
  error?: string;
  cost: CostInfo;
}

// Shared types
export interface CostInfo {
  provider: string;
  provider_cost: string;
  total_cost: string;
  currency: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Provider types
export interface ProviderInfo {
  id: string;
  name: string;
  status: 'available' | 'degraded' | 'unavailable';
  models: string[];
}

export interface ModelInfo {
  id: string;
  provider: string;
  type: 'inference' | 'image' | 'compute';
  price_per_unit: string;
  unit: string;
}
