export const OCTAS_PER_MOVE = BigInt(100_000_000);
export const MOVE_USD_RATE = 0.5; // 1 MOVE = $0.50

export const MOVEMENT_NETWORKS = {
  mainnet: 'movement',
  testnet: 'movement-testnet',
} as const;

// Current network - set to testnet for development
export const CURRENT_NETWORK = MOVEMENT_NETWORKS.testnet;

export type MovementNetwork =
  (typeof MOVEMENT_NETWORKS)[keyof typeof MOVEMENT_NETWORKS];
