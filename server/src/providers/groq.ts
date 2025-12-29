import type {
  Provider,
  InferenceRequest,
  InferenceResponse,
  StreamChunk
} from './types.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1';

// Groq model pricing (per 1M tokens) - very cheap!
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
  'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
  'llama-3.1-70b-versatile': { input: 0.59, output: 0.79 },
  'mixtral-8x7b-32768': { input: 0.24, output: 0.24 },
  'gemma2-9b-it': { input: 0.20, output: 0.20 },
};

// Model aliases
const MODEL_ALIASES: Record<string, string> = {
  'groq-llama-3.3-70b': 'llama-3.3-70b-versatile',
  'groq-llama-3.1-8b': 'llama-3.1-8b-instant',
  'groq-llama-3.1-70b': 'llama-3.1-70b-versatile',
  'groq-mixtral': 'mixtral-8x7b-32768',
  'groq-gemma': 'gemma2-9b-it',
};

export class GroqProvider implements Provider {
  readonly id = 'groq';
  readonly name = 'Groq';
  private apiKey: string;

  // Groq is known for low latency
  readonly typicalLatencyMs = 100;

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
    if (!pricing) return { input: 0.0005, output: 0.0005 };
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

    const response = await fetch(`${GROQ_API_URL}/chat/completions`, {
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
      throw new Error(`Groq error: ${response.status} - ${error}`);
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

    const response = await fetch(`${GROQ_API_URL}/chat/completions`, {
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
      throw new Error(`Groq error: ${response.status} - ${error}`);
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
      const response = await fetch(`${GROQ_API_URL}/models`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export function createGroqProvider(apiKey?: string): GroqProvider | null {
  if (!apiKey) return null;
  return new GroqProvider(apiKey);
}
