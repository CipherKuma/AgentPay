/**
 * Treasury Service - Integration with Move contract for payment tracking
 *
 * The x402 facilitator handles actual MOVE transfers.
 * This service is for recording payments on-chain for accounting
 * and future provider revenue sharing.
 */

import { config } from '../config/index.js';

export interface PaymentRecord {
  payer: string;
  amount: bigint;
  serviceType: 'inference' | 'image' | 'compute';
  model: string;
  provider: string;
  txHash?: string;
}

export interface TreasuryStats {
  totalRevenue: bigint;
  totalRequests: number;
  totalPayouts: bigint;
}

export class TreasuryService {
  private treasuryAddress: string;
  private enabled: boolean;

  constructor() {
    this.treasuryAddress = config.movement.treasuryAddress || '';
    this.enabled = !!this.treasuryAddress;
  }

  /**
   * Record a payment on-chain
   * Integration with Move contract will be added later
   */
  async recordPayment(payment: PaymentRecord): Promise<void> {
    if (!this.enabled) {
      console.log('[Treasury] Recording payment (off-chain only):', {
        payer: payment.payer,
        amount: payment.amount.toString(),
        service: payment.serviceType,
        model: payment.model,
        provider: payment.provider,
      });
      return;
    }

    // TODO: Integrate with Movement SDK to call treasury::record_payment
    // const tx = await aptosClient.transaction.submit({
    //   function: `${this.treasuryAddress}::treasury::record_payment`,
    //   typeArguments: [],
    //   arguments: [
    //     payment.payer,
    //     payment.amount,
    //     payment.serviceType,
    //     payment.model,
    //     payment.provider,
    //   ],
    // });

    console.log('[Treasury] Payment recorded:', {
      payer: payment.payer,
      amount: payment.amount.toString(),
      service: payment.serviceType,
    });
  }

  /**
   * Record a payout to a provider
   */
  async recordPayout(provider: string, amount: bigint): Promise<void> {
    if (!this.enabled) {
      console.log('[Treasury] Recording payout (off-chain only):', {
        provider,
        amount: amount.toString(),
      });
      return;
    }

    // TODO: Integrate with Movement SDK to call treasury::record_payout
    console.log('[Treasury] Payout recorded:', { provider, amount: amount.toString() });
  }

  /**
   * Get treasury statistics
   */
  async getStats(): Promise<TreasuryStats | null> {
    if (!this.enabled) {
      return null;
    }

    // TODO: Integrate with Movement SDK to call treasury::get_stats view function
    // const [revenue, requests, payouts] = await aptosClient.view({
    //   function: `${this.treasuryAddress}::treasury::get_stats`,
    //   typeArguments: [],
    //   arguments: [this.treasuryAddress],
    // });

    return {
      totalRevenue: 0n,
      totalRequests: 0,
      totalPayouts: 0n,
    };
  }

  /**
   * Check if treasury is initialized
   */
  async isInitialized(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    // TODO: Integrate with Movement SDK
    return false;
  }

  /**
   * Get treasury address
   */
  getAddress(): string {
    return this.treasuryAddress;
  }

  /**
   * Check if treasury integration is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
export const treasuryService = new TreasuryService();
