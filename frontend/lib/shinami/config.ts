/**
 * Shinami Node Service configuration for Movement Testnet
 *
 * SHINAMI_KEY is server-side only (not exposed to client).
 * Client-side code uses public RPC.
 */

// Public Movement Testnet RPC (for client-side)
export const PUBLIC_RPC = 'https://testnet.movementnetwork.xyz/v1';

/**
 * Get RPC URL for server-side use (API routes)
 * Uses Shinami if SHINAMI_KEY is set, otherwise public RPC
 */
export function getServerRpcUrl(): string {
  const shinamiKey = process.env.SHINAMI_KEY;
  if (shinamiKey) {
    return `https://api.shinami.com/aptos/node/v1/${shinamiKey}`;
  }
  return PUBLIC_RPC;
}

/**
 * Movement Testnet configuration
 */
export const MOVEMENT_CONFIG = {
  network: 'movement-testnet' as const,
  chainId: '177',
  publicRpc: PUBLIC_RPC,
  explorerUrl: 'https://explorer.movementnetwork.xyz',
} as const;
