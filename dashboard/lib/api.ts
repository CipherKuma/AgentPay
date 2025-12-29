// API client functions for AgentPay dashboard

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4402';

export interface Model {
  id: string;
  provider: string;
  name: string;
  description?: string;
  pricePerToken: number;
  maxTokens: number;
}

export interface Provider {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  availability: number;
  modelsSupported: string[];
}

export interface UsageStats {
  totalRequests: number;
  totalSpent: number;
  averageCost: number;
  dailyUsage: { date: string; requests: number; cost: number }[];
}

export async function getModels(): Promise<Model[]> {
  const res = await fetch(`${API_URL}/v1/models`);
  if (!res.ok) throw new Error('Failed to fetch models');
  const data = await res.json();
  return data.models || [];
}

export async function getProviders(): Promise<Provider[]> {
  const res = await fetch(`${API_URL}/v1/providers`);
  if (!res.ok) throw new Error('Failed to fetch providers');
  const data = await res.json();
  return data.providers || [];
}

export async function getUsageStats(): Promise<UsageStats> {
  // For now, return mock data since usage tracking isn't implemented yet
  // This would normally call /v1/usage endpoint
  return {
    totalRequests: 0,
    totalSpent: 0,
    averageCost: 0,
    dailyUsage: [],
  };
}

export async function runInference(
  model: string,
  prompt: string,
  options: { maxTokens?: number; temperature?: number; stream?: boolean },
  paymentHeader?: string
): Promise<Response> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (paymentHeader) {
    headers['X-PAYMENT'] = paymentHeader;
  }

  return fetch(`${API_URL}/v1/inference`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      prompt,
      max_tokens: options.maxTokens || 256,
      temperature: options.temperature || 0.7,
      stream: options.stream || false,
    }),
  });
}

export async function* parseSSEStream(
  response: Response
): AsyncGenerator<string, void, unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body is not readable');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || parsed.content || '';
            if (content) yield content;
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function getApiUrl(): string {
  return API_URL;
}
