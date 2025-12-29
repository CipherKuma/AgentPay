import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import type { Provider, InferenceRequest, InferenceResponse, StreamChunk } from './types.js';

// Pricing per 1K tokens
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'llama-3-8b': { input: 0.0001, output: 0.0001 },
  'llama-3-70b': { input: 0.0008, output: 0.0008 },
  'llama-3.1-8b': { input: 0.0001, output: 0.0001 },
  'llama-3.1-70b': { input: 0.0008, output: 0.0008 },
  'mixtral-8x7b': { input: 0.0002, output: 0.0002 },
};

const DEFAULT_PRICING = { input: 0.001, output: 0.002 };

/**
 * OpenAI-compatible provider
 * Works with OpenAI, Together AI, Groq, local models, etc.
 */
export const openaiProvider: Provider = {
  id: 'openai',
  name: 'OpenAI Compatible',
  models: Object.keys(MODEL_PRICING),

  async inference(request: InferenceRequest): Promise<InferenceResponse> {
    const startTime = Date.now();
    const baseUrl = config.providers.openaiBaseUrl;
    const apiKey = config.providers.openaiApiKey;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Determine if using chat or completion endpoint
    const useChat = !!request.messages;
    const endpoint = useChat ? `${baseUrl}/chat/completions` : `${baseUrl}/completions`;

    const body = useChat
      ? buildChatRequest(request)
      : buildCompletionRequest(request);

    console.log(`[OpenAI] Request to ${endpoint}`, { model: request.model });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[OpenAI] API error:', error);
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const latencyMs = Date.now() - startTime;

    const output = useChat
      ? data.choices?.[0]?.message?.content || ''
      : data.choices?.[0]?.text || '';

    console.log(`[OpenAI] Response in ${latencyMs}ms`, {
      tokens: data.usage?.total_tokens,
    });

    return {
      id: data.id || uuidv4(),
      model: request.model,
      output,
      usage: {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0,
      },
      latency_ms: latencyMs,
    };
  },

  estimateTokens(prompt: string, maxTokens = 100): number {
    // Simple estimation: ~1.3 tokens per word
    const words = prompt.split(/\s+/).length;
    const promptTokens = Math.ceil(words * 1.3);
    return promptTokens + maxTokens;
  },

  getPricing(model: string): { input: number; output: number } {
    return MODEL_PRICING[model] || DEFAULT_PRICING;
  },

  async healthCheck(): Promise<boolean> {
    try {
      const baseUrl = config.providers.openaiBaseUrl;
      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${config.providers.openaiApiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  async *inferenceStream(request: InferenceRequest): AsyncIterable<StreamChunk> {
    const baseUrl = config.providers.openaiBaseUrl;
    const apiKey = config.providers.openaiApiKey;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const useChat = !!request.messages;
    const endpoint = useChat ? `${baseUrl}/chat/completions` : `${baseUrl}/completions`;

    const body = useChat
      ? { ...buildChatRequest(request), stream: true }
      : { ...buildCompletionRequest(request), stream: true };

    console.log(`[OpenAI] Streaming request to ${endpoint}`, { model: request.model });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[OpenAI] Streaming API error:', error);
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body for streaming');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    const id = uuidv4();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = useChat
              ? parsed.choices?.[0]?.delta?.content || ''
              : parsed.choices?.[0]?.text || '';
            const finishReason = parsed.choices?.[0]?.finish_reason;

            if (delta || finishReason) {
              yield { id, delta, finish_reason: finishReason };
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },
};

function buildChatRequest(request: InferenceRequest) {
  return {
    model: request.model,
    messages: request.messages,
    max_tokens: request.max_tokens || 100,
    temperature: request.temperature ?? 0.7,
    stream: false, // Streaming not yet supported
  };
}

function buildCompletionRequest(request: InferenceRequest) {
  return {
    model: request.model,
    prompt: request.prompt,
    max_tokens: request.max_tokens || 100,
    temperature: request.temperature ?? 0.7,
    stream: false,
  };
}
