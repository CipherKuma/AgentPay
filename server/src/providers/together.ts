import type {
  Provider,
  InferenceRequest,
  InferenceResponse,
  StreamChunk
} from './types.js';

const TOGETHER_API_URL = 'https://api.together.xyz/v1';

// Together AI model pricing (per 1M tokens)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo': { input: 0.18, output: 0.18 },
  'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo': { input: 0.88, output: 0.88 },
  'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo': { input: 3.5, output: 3.5 },
  'mistralai/Mixtral-8x7B-Instruct-v0.1': { input: 0.6, output: 0.6 },
  'mistralai/Mixtral-8x22B-Instruct-v0.1': { input: 1.2, output: 1.2 },
  'Qwen/Qwen2.5-72B-Instruct-Turbo': { input: 1.2, output: 1.2 },
  'deepseek-ai/DeepSeek-V3': { input: 0.9, output: 0.9 },
};

// Model aliases for simpler names
const MODEL_ALIASES: Record<string, string> = {
  'llama-3.1-8b': 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
  'llama-3.1-70b': 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
  'llama-3.1-405b': 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
  'mixtral-8x7b': 'mistralai/Mixtral-8x7B-Instruct-v0.1',
  'mixtral-8x22b': 'mistralai/Mixtral-8x22B-Instruct-v0.1',
  'qwen-2.5-72b': 'Qwen/Qwen2.5-72B-Instruct-Turbo',
  'deepseek-v3': 'deepseek-ai/DeepSeek-V3',
};

export class TogetherProvider implements Provider {
  readonly id = 'together';
  readonly name = 'Together AI';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  get models(): string[] {
    return [...Object.keys(MODEL_ALIASES), ...Object.keys(MODEL_PRICING)];
  }

  private resolveModel(model: string): string {
    return MODEL_ALIASES[model] || model;
  }

  getPricing(model: string): { input: number; output: number } {
    const resolved = this.resolveModel(model);
    const pricing = MODEL_PRICING[resolved];
    if (!pricing) return { input: 0.001, output: 0.001 };
    // Convert from per 1M tokens to per 1K tokens
    return { input: pricing.input / 1000, output: pricing.output / 1000 };
  }

  estimateTokens(prompt: string, maxTokens = 512): number {
    // Rough estimate: ~4 chars per token
    const inputTokens = Math.ceil(prompt.length / 4);
    return inputTokens + maxTokens;
  }

  async inference(request: InferenceRequest): Promise<InferenceResponse> {
    const model = this.resolveModel(request.model);
    const startTime = Date.now();

    const response = await fetch(`${TOGETHER_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: request.messages || [{ role: 'user', content: request.prompt }],
        max_tokens: request.max_tokens || 512,
        temperature: request.temperature ?? 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Together AI error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const choice = data.choices[0];
    const latencyMs = Date.now() - startTime;

    return {
      id: data.id,
      model: request.model,
      output: choice.message?.content || '',
      usage: {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0,
      },
      latency_ms: latencyMs,
    };
  }

  async *inferenceStream(request: InferenceRequest): AsyncIterable<StreamChunk> {
    const model = this.resolveModel(request.model);

    const response = await fetch(`${TOGETHER_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: request.messages || [{ role: 'user', content: request.prompt }],
        max_tokens: request.max_tokens || 512,
        temperature: request.temperature ?? 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Together AI error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';
    let chunkId = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') {
          yield { id: `chunk-${chunkId++}`, delta: '', finish_reason: 'stop' };
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            yield { id: `chunk-${chunkId++}`, delta };
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${TOGETHER_API_URL}/models`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export function createTogetherProvider(apiKey?: string): TogetherProvider | null {
  if (!apiKey) return null;
  return new TogetherProvider(apiKey);
}
