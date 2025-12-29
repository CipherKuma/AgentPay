import { listProviders, getProvider } from '../providers/index.js';
import { routingEngine, type ProviderStatus } from './engine.js';

export class HealthChecker {
  private intervalId: NodeJS.Timeout | null = null;
  private checking: boolean = false;

  /**
   * Start periodic health checks
   */
  startChecking(intervalMs: number = 60000): void {
    if (this.intervalId) {
      console.log('[HealthChecker] Already running');
      return;
    }

    console.log(`[HealthChecker] Starting with ${intervalMs}ms interval`);

    // Initialize all providers
    const providers = listProviders();
    for (const info of providers) {
      routingEngine.initializeProvider(info.id);
    }

    // Run initial check
    this.checkAllProviders();

    // Schedule periodic checks
    this.intervalId = setInterval(() => {
      this.checkAllProviders();
    }, intervalMs);
  }

  /**
   * Stop periodic health checks
   */
  stopChecking(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[HealthChecker] Stopped');
    }
  }

  /**
   * Check a single provider's health
   */
  async checkProvider(providerId: string): Promise<ProviderStatus | null> {
    const provider = getProvider(providerId);
    if (!provider) {
      console.log(`[HealthChecker] Provider not found: ${providerId}`);
      return null;
    }

    const startTime = Date.now();
    let available = false;

    try {
      available = await provider.healthCheck();
    } catch (error) {
      console.error(`[HealthChecker] ${providerId} health check failed:`, error);
      available = false;
    }

    const latencyMs = Date.now() - startTime;
    routingEngine.setProviderStatus(providerId, available, latencyMs);

    const status = routingEngine.getProviderStatus(providerId);
    console.log(`[HealthChecker] ${providerId}: ${available ? 'OK' : 'FAILED'} (${latencyMs}ms)`);

    return status || null;
  }

  /**
   * Check all registered providers
   */
  private async checkAllProviders(): Promise<void> {
    if (this.checking) {
      console.log('[HealthChecker] Check already in progress, skipping');
      return;
    }

    this.checking = true;
    console.log('[HealthChecker] Running health checks...');

    const providers = listProviders();
    await Promise.all(
      providers.map((info) => this.checkProvider(info.id))
    );

    this.checking = false;
    console.log('[HealthChecker] Health checks complete');
  }
}

// Singleton instance
export const healthChecker = new HealthChecker();
