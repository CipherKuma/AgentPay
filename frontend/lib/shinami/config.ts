/**
 * Shinami Node Service configuration for Movement Testnet
 *
 * Shinami provides reliable RPC endpoints with rate limiting and analytics.
 * For Movement Testnet, we use the Shinami Node Service API.
 *
 * Environment variable: NEXT_PUBLIC_SHINAMI_KEY
 */

// Movement Testnet RPC via Shinami Node Service
const SHINAMI_KEY = process.env.NEXT_PUBLIC_SHINAMI_KEY;

// Fallback public RPC (less reliable, no rate limiting)
const FALLBACK_RPC = 'https://aptos.testnet.bardock.movementlabs.xyz/v1';

/**
 * Get the Shinami Node Service RPC URL for Movement Testnet
 */
export function getShinamiRpcUrl(): string {
  if (!SHINAMI_KEY) {
    console.warn(
      '[Shinami] NEXT_PUBLIC_SHINAMI_KEY not set, using fallback RPC'
    );
    return FALLBACK_RPC;
  }

  // Shinami Movement Testnet endpoint format
  return `https://api.shinami.com/aptos/node/v1/${SHINAMI_KEY}`;
}

/**
 * Movement network configuration
 */
export const MOVEMENT_CONFIG = {
  network: 'movement-testnet' as const,
  chainId: '177', // Movement Testnet chain ID
  rpcUrl: getShinamiRpcUrl(),
  explorerUrl: 'https://explorer.movementnetwork.xyz',
} as const;

/**
 * Check if Shinami is properly configured
 */
export function isShinamiConfigured(): boolean {
  return !!SHINAMI_KEY;
}
