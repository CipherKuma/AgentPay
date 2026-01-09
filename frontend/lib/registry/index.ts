/**
 * Service registry - combines on-chain data with IPFS metadata
 */

export * from './onchain';

import { getServiceOnChain, type OnChainService } from './onchain';
import { fetchMetadata, type ServiceMetadata } from '../pinata';
import { getServiceHeaders } from '../db/secrets';

export interface FullService {
  // On-chain data
  serviceId: number;
  owner: string;
  name: string;
  endpointUrl: string;
  metadataUri: string;
  pricePerRequest: bigint;
  isVerified: boolean;
  isActive: boolean;
  // IPFS metadata
  description: string;
  category: string;
  tags: string[];
  method: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  iconUrl?: string;
  // Runtime (not stored)
  headers?: Record<string, string>;
}

/**
 * Get full service with on-chain data + IPFS metadata
 */
export async function getFullService(serviceId: number): Promise<FullService | null> {
  // Get on-chain data
  const onChain = await getServiceOnChain(serviceId);
  if (!onChain) return null;

  // Get IPFS metadata
  let metadata: ServiceMetadata | null = null;
  try {
    metadata = await fetchMetadata(onChain.metadataUri);
  } catch (error) {
    console.error('[Registry] Failed to fetch metadata:', error);
  }

  return {
    ...onChain,
    description: metadata?.description || '',
    category: metadata?.category || 'other',
    tags: metadata?.tags || [],
    method: metadata?.method || 'POST',
    inputSchema: metadata?.inputSchema,
    outputSchema: metadata?.outputSchema,
    iconUrl: metadata?.iconUrl,
  };
}

/**
 * Get service with headers for proxying
 * Only call this when you need to make the actual proxy request
 */
export async function getServiceForProxy(
  serviceId: number
): Promise<(OnChainService & { headers: Record<string, string> | null }) | null> {
  const onChain = await getServiceOnChain(serviceId);
  if (!onChain) return null;

  const headers = await getServiceHeaders(serviceId);

  return {
    ...onChain,
    headers,
  };
}
