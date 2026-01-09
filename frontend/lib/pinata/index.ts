/**
 * Pinata IPFS utilities for storing service metadata
 * Server-side only - uses PINATA_JWT from env
 */

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_API_URL = 'https://api.pinata.cloud/pinning';
const PINATA_GATEWAY_URL = 'https://gateway.pinata.cloud/ipfs';

export interface ServiceMetadata {
  description: string;
  category: 'inference' | 'image' | 'compute' | 'data' | 'other';
  tags: string[];
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  iconUrl?: string;
  version?: string;
}

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

/**
 * Upload service metadata to IPFS via Pinata
 */
export async function uploadMetadata(
  metadata: ServiceMetadata,
  serviceName: string
): Promise<string> {
  if (!PINATA_JWT) {
    throw new Error('PINATA_JWT must be set in environment variables');
  }

  const response = await fetch(`${PINATA_API_URL}/pinJSONToIPFS`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: {
        name: `agentpay-service-${serviceName}`,
      },
      pinataOptions: {
        cidVersion: 1,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinata upload failed: ${error}`);
  }

  const result: PinataResponse = await response.json();
  return `ipfs://${result.IpfsHash}`;
}

/**
 * Fetch metadata from IPFS
 */
export async function fetchMetadata(ipfsUri: string): Promise<ServiceMetadata> {
  const cid = ipfsUri.replace('ipfs://', '');

  // Try Pinata gateway first, fall back to public gateways
  const gateways = [
    `${PINATA_GATEWAY_URL}/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
  ];

  let lastError: Error | null = null;

  for (const url of gateways) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError || new Error(`Failed to fetch metadata from ${ipfsUri}`);
}

/**
 * Update metadata on IPFS (upload new version, return new URI)
 * Note: IPFS is immutable, so this creates a new CID
 */
export async function updateMetadata(
  metadata: ServiceMetadata,
  serviceName: string
): Promise<string> {
  return uploadMetadata(metadata, serviceName);
}

/**
 * Validate metadata schema
 */
export function validateMetadata(metadata: unknown): metadata is ServiceMetadata {
  if (!metadata || typeof metadata !== 'object') return false;

  const m = metadata as Record<string, unknown>;

  if (typeof m.description !== 'string') return false;
  if (!['inference', 'image', 'compute', 'data', 'other'].includes(m.category as string)) return false;
  if (!Array.isArray(m.tags)) return false;
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(m.method as string)) return false;

  return true;
}
