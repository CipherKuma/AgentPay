/**
 * Treasury Service - Integration with Move contract for payment tracking
 *
 * The x402 facilitator handles actual MOVE transfers.
 * This service is for recording payments on-chain for accounting
 * and future provider revenue sharing.
 */

import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';
import { config } from '../config/index.js';
import { getDb, payments } from '../db/index.js';

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
  private aptos: Aptos;
  private adminAccount: Account | null = null;

  constructor() {
    this.treasuryAddress = config.movement.treasuryAddress || '';
    this.enabled = !!this.treasuryAddress;

    // Initialize Aptos client for Movement network
    const aptosConfig = new AptosConfig({
      network: config.movement.network === 'mainnet' ? Network.MAINNET : Network.TESTNET,
      fullnode: config.movement.rpcUrl,
    });
    this.aptos = new Aptos(aptosConfig);

    // Initialize admin account if private key is provided
    if (config.movement.adminPrivateKey) {
      try {
        const privateKey = new Ed25519PrivateKey(config.movement.adminPrivateKey);
        this.adminAccount = Account.fromPrivateKey({ privateKey });
        console.log('[Treasury] Admin account initialized:', this.adminAccount.accountAddress.toString());
      } catch (error) {
        console.error('[Treasury] Failed to initialize admin account:', error);
      }
    }
  }

  /**
   * Record a payment on-chain and in the database
   */
  async recordPayment(payment: PaymentRecord): Promise<void> {
    // Always try to save to database first
    try {
      const db = getDb();
      if (db) {
        await db.insert(payments).values({
          payer: payment.payer,
          amount: payment.amount,
          serviceType: payment.serviceType,
          model: payment.model,
          provider: payment.provider,
          txHash: payment.txHash,
        });
        console.log('[Treasury] Payment saved to database');
      }
    } catch (dbError) {
      console.error('[Treasury] Failed to save payment to database:', dbError);
    }

    // Then try on-chain if enabled
    if (!this.enabled || !this.adminAccount) {
      console.log('[Treasury] Recording payment (off-chain only):', {
        payer: payment.payer,
        amount: payment.amount.toString(),
        service: payment.serviceType,
        model: payment.model,
        provider: payment.provider,
      });
      return;
    }

    try {
      const transaction = await this.aptos.transaction.build.simple({
        sender: this.adminAccount.accountAddress,
        data: {
          function: `${this.treasuryAddress}::treasury::record_payment`,
          functionArguments: [
            payment.payer,
            payment.amount,
            payment.serviceType,
            payment.model,
            payment.provider,
          ],
        },
      });

      const pendingTx = await this.aptos.signAndSubmitTransaction({
        signer: this.adminAccount,
        transaction,
      });

      await this.aptos.waitForTransaction({ transactionHash: pendingTx.hash });

      console.log('[Treasury] Payment recorded on-chain:', pendingTx.hash);
    } catch (error) {
      console.error('[Treasury] Failed to record payment on-chain:', error);
      // Don't throw - allow request to succeed even if treasury recording fails
    }
  }

  /**
   * Record a payout to a provider
   */
  async recordPayout(provider: string, amount: bigint): Promise<void> {
    if (!this.enabled || !this.adminAccount) {
      console.log('[Treasury] Recording payout (off-chain only):', {
        provider,
        amount: amount.toString(),
      });
      return;
    }

    try {
      const transaction = await this.aptos.transaction.build.simple({
        sender: this.adminAccount.accountAddress,
        data: {
          function: `${this.treasuryAddress}::treasury::record_payout`,
          functionArguments: [provider, amount],
        },
      });

      const pendingTx = await this.aptos.signAndSubmitTransaction({
        signer: this.adminAccount,
        transaction,
      });

      await this.aptos.waitForTransaction({ transactionHash: pendingTx.hash });

      console.log('[Treasury] Payout recorded on-chain:', pendingTx.hash);
    } catch (error) {
      console.error('[Treasury] Failed to record payout on-chain:', error);
    }
  }

  /**
   * Get treasury statistics
   */
  async getStats(): Promise<TreasuryStats | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const [revenue, requests, payouts] = await this.aptos.view({
        payload: {
          function: `${this.treasuryAddress}::treasury::get_stats`,
          functionArguments: [this.treasuryAddress],
        },
      });

      return {
        totalRevenue: BigInt(revenue as string),
        totalRequests: Number(requests),
        totalPayouts: BigInt(payouts as string),
      };
    } catch (error) {
      console.error('[Treasury] Failed to get stats:', error);
      return null;
    }
  }

  /**
   * Check if treasury is initialized
   */
  async isInitialized(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const [initialized] = await this.aptos.view({
        payload: {
          function: `${this.treasuryAddress}::treasury::is_initialized`,
          functionArguments: [this.treasuryAddress],
        },
      });

      return initialized as boolean;
    } catch (error) {
      console.error('[Treasury] Failed to check initialization:', error);
      return false;
    }
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
