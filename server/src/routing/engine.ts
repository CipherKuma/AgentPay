import { findProvidersForModel, getProvider } from '../providers/index.js';
import type { Provider } from '../providers/types.js';

export interface RoutingPreferences {
  provider?: string;
  max_latency_ms?: number;
  max_price?: number;
}

export interface ProviderStatus {
  id: string;
  available: boolean;
  latency_p50: number;
  availability: number;
  lastCheck: Date;
  requestCount: number;
  successCount: number;
}

const DEFAULT_STATUS: Omit<ProviderStatus, 'id'> = {
  available: true,
  latency_p50: 1000,
  availability: 1.0,
  lastCheck: new Date(),
  requestCount: 0,
  successCount: 0,
};

class RoutingEngine {
  private providerStatus: Map<string, ProviderStatus> = new Map();

  /**
   * Initialize provider status
   */
  initializeProvider(providerId: string): void {
    if (!this.providerStatus.has(providerId)) {
      this.providerStatus.set(providerId, {
        id: providerId,
        ...DEFAULT_STATUS,
      });
      console.log(`[Routing] Initialized status for: ${providerId}`);
    }
  }

  /**
   * Select best provider for request based on preferences
   */
  selectProvider(model: string, preferences?: RoutingPreferences): Provider | null {
    // 1. Filter providers that support the model
    let candidates = findProvidersForModel(model);

    if (candidates.length === 0) {
      console.log(`[Routing] No providers support model: ${model}`);
      return null;
    }

    // 2. If specific provider requested
    if (preferences?.provider) {
      const provider = candidates.find((p) => p.id === preferences.provider);
      if (!provider) {
        console.log(`[Routing] Requested provider ${preferences.provider} not available`);
        return null;
      }
      return provider;
    }

    // 3. Filter out unavailable providers (availability < 95%)
    candidates = candidates.filter((p) => {
      const status = this.providerStatus.get(p.id);
      return !status || status.availability >= 0.95;
    });

    if (candidates.length === 0) {
      console.log(`[Routing] All providers below availability threshold`);
      return findProvidersForModel(model)[0] || null;
    }

    // 4. Apply routing logic based on preferences
    if (preferences?.max_latency_ms) {
      return this.selectByLatency(candidates, model, preferences.max_latency_ms);
    }

    if (preferences?.max_price) {
      return this.selectByPrice(candidates, model, preferences.max_price);
    }

    // 5. Default: sort by price (cheapest first)
    return this.selectCheapest(candidates, model);
  }

  private selectByLatency(providers: Provider[], model: string, maxLatency: number): Provider | null {
    const filtered = providers.filter((p) => {
      const status = this.providerStatus.get(p.id);
      return !status || status.latency_p50 <= maxLatency;
    });

    if (filtered.length === 0) {
      console.log(`[Routing] No providers under latency threshold: ${maxLatency}ms`);
      return this.selectCheapest(providers, model);
    }

    return this.selectCheapest(filtered, model);
  }

  private selectByPrice(providers: Provider[], model: string, maxPrice: number): Provider | null {
    const filtered = providers.filter((p) => {
      const pricing = p.getPricing(model);
      return pricing.input <= maxPrice && pricing.output <= maxPrice;
    });

    if (filtered.length === 0) {
      console.log(`[Routing] No providers under price threshold: $${maxPrice}/1K`);
      return this.selectFastest(providers);
    }

    return this.selectFastest(filtered);
  }

  private selectCheapest(providers: Provider[], model: string): Provider | null {
    const sorted = [...providers].sort((a, b) => {
      const priceA = a.getPricing(model);
      const priceB = b.getPricing(model);
      return (priceA.input + priceA.output) - (priceB.input + priceB.output);
    });
    return sorted[0] || null;
  }

  private selectFastest(providers: Provider[]): Provider | null {
    const sorted = [...providers].sort((a, b) => {
      const statusA = this.providerStatus.get(a.id);
      const statusB = this.providerStatus.get(b.id);
      const latencyA = statusA?.latency_p50 ?? 1000;
      const latencyB = statusB?.latency_p50 ?? 1000;
      return latencyA - latencyB;
    });
    return sorted[0] || null;
  }

  /**
   * Update provider status after a request
   */
  updateProviderStatus(providerId: string, success: boolean, latencyMs: number): void {
    let status = this.providerStatus.get(providerId);

    if (!status) {
      status = { id: providerId, ...DEFAULT_STATUS };
    }

    status.requestCount++;
    if (success) status.successCount++;
    status.availability = status.successCount / status.requestCount;
    status.latency_p50 = (status.latency_p50 + latencyMs) / 2; // Simple moving average
    status.lastCheck = new Date();
    status.available = success;

    this.providerStatus.set(providerId, status);
  }

  /**
   * Set provider status directly (for health checks)
   */
  setProviderStatus(providerId: string, available: boolean, latencyMs: number): void {
    let status = this.providerStatus.get(providerId);

    if (!status) {
      status = { id: providerId, ...DEFAULT_STATUS };
    }

    status.available = available;
    status.latency_p50 = latencyMs;
    status.lastCheck = new Date();
    if (!available) status.availability = Math.max(0, status.availability - 0.05);

    this.providerStatus.set(providerId, status);
  }

  /**
   * Get all provider statuses
   */
  getProviderStatuses(): ProviderStatus[] {
    return Array.from(this.providerStatus.values());
  }

  /**
   * Get status for a specific provider
   */
  getProviderStatus(providerId: string): ProviderStatus | undefined {
    return this.providerStatus.get(providerId);
  }
}

// Singleton instance
export const routingEngine = new RoutingEngine();
