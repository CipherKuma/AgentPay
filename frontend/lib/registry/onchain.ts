/**
 * On-chain registry client for reading service data from Movement
 * Server-side only - uses Shinami RPC
 */

import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { getServerRpcUrl } from '../shinami/config';

// Deployed contract address on Movement Testnet
const REGISTRY_ADDRESS = '0xe00efe7a91236e0dee4b9479fe0677bf6c5f2cecc6f628ffd8d81cc6e617e386';
const MODULE_NAME = 'registry';

// Lazy-init Aptos client
let _aptos: Aptos | null = null;

function getAptos(): Aptos {
  if (_aptos) return _aptos;

  const config = new AptosConfig({
    fullnode: getServerRpcUrl(),
    network: Network.CUSTOM,
  });

  _aptos = new Aptos(config);
  return _aptos;
}

export interface OnChainService {
  serviceId: number;
  owner: string;
  name: string;
  endpointUrl: string;
  metadataUri: string;
  pricePerRequest: bigint;
  isVerified: boolean;
  isActive: boolean;
}

/**
 * Get service from on-chain registry
 */
export async function getServiceOnChain(serviceId: number): Promise<OnChainService | null> {
  if (!REGISTRY_ADDRESS || REGISTRY_ADDRESS === '0x0') {
    throw new Error('REGISTRY_ADDRESS not configured - deploy contract first');
  }

  const aptos = getAptos();

  try {
    const result = await aptos.view({
      payload: {
        function: `${REGISTRY_ADDRESS}::${MODULE_NAME}::get_service`,
        functionArguments: [REGISTRY_ADDRESS, serviceId.toString()],
      },
    });

    // Result: [owner, name, endpoint_url, metadata_uri, price, is_verified, is_active]
    const [owner, name, endpointUrl, metadataUri, price, isVerified, isActive] = result as [
      string,
      string,
      string,
      string,
      string,
      boolean,
      boolean
    ];

    return {
      serviceId,
      owner,
      name,
      endpointUrl,
      metadataUri,
      pricePerRequest: BigInt(price),
      isVerified,
      isActive,
    };
  } catch (error) {
    // Service not found or other error
    console.error('[Registry] Error fetching service:', error);
    return null;
  }
}

/**
 * Get service price from on-chain
 */
export async function getServicePrice(serviceId: number): Promise<bigint | null> {
  if (!REGISTRY_ADDRESS || REGISTRY_ADDRESS === '0x0') {
    throw new Error('REGISTRY_ADDRESS not configured - deploy contract first');
  }

  const aptos = getAptos();

  try {
    const result = await aptos.view({
      payload: {
        function: `${REGISTRY_ADDRESS}::${MODULE_NAME}::get_service_price`,
        functionArguments: [REGISTRY_ADDRESS, serviceId.toString()],
      },
    });

    return BigInt(result[0] as string);
  } catch {
    return null;
  }
}

/**
 * Get service owner from on-chain
 */
export async function getServiceOwner(serviceId: number): Promise<string | null> {
  if (!REGISTRY_ADDRESS || REGISTRY_ADDRESS === '0x0') {
    throw new Error('REGISTRY_ADDRESS not configured - deploy contract first');
  }

  const aptos = getAptos();

  try {
    const result = await aptos.view({
      payload: {
        function: `${REGISTRY_ADDRESS}::${MODULE_NAME}::get_service_owner`,
        functionArguments: [REGISTRY_ADDRESS, serviceId.toString()],
      },
    });

    return result[0] as string;
  } catch {
    return null;
  }
}

/**
 * Check if service exists on-chain
 */
export async function serviceExists(serviceId: number): Promise<boolean> {
  if (!REGISTRY_ADDRESS || REGISTRY_ADDRESS === '0x0') {
    throw new Error('REGISTRY_ADDRESS not configured - deploy contract first');
  }

  const aptos = getAptos();

  try {
    const result = await aptos.view({
      payload: {
        function: `${REGISTRY_ADDRESS}::${MODULE_NAME}::service_exists`,
        functionArguments: [REGISTRY_ADDRESS, serviceId.toString()],
      },
    });

    return result[0] as boolean;
  } catch {
    return false;
  }
}

/**
 * Check if service is active on-chain
 */
export async function isServiceActive(serviceId: number): Promise<boolean> {
  if (!REGISTRY_ADDRESS || REGISTRY_ADDRESS === '0x0') {
    throw new Error('REGISTRY_ADDRESS not configured - deploy contract first');
  }

  const aptos = getAptos();

  try {
    const result = await aptos.view({
      payload: {
        function: `${REGISTRY_ADDRESS}::${MODULE_NAME}::is_active`,
        functionArguments: [REGISTRY_ADDRESS, serviceId.toString()],
      },
    });

    return result[0] as boolean;
  } catch {
    return false;
  }
}

/**
 * Get total service count
 */
export async function getServiceCount(): Promise<number> {
  if (!REGISTRY_ADDRESS || REGISTRY_ADDRESS === '0x0') {
    throw new Error('REGISTRY_ADDRESS not configured - deploy contract first');
  }

  const aptos = getAptos();

  try {
    const result = await aptos.view({
      payload: {
        function: `${REGISTRY_ADDRESS}::${MODULE_NAME}::get_service_count`,
        functionArguments: [REGISTRY_ADDRESS],
      },
    });

    return Number(result[0]);
  } catch {
    return 0;
  }
}

/**
 * Get services owned by an address
 */
export async function getOwnerServices(ownerAddress: string): Promise<number[]> {
  if (!REGISTRY_ADDRESS || REGISTRY_ADDRESS === '0x0') {
    throw new Error('REGISTRY_ADDRESS not configured - deploy contract first');
  }

  const aptos = getAptos();

  try {
    const result = await aptos.view({
      payload: {
        function: `${REGISTRY_ADDRESS}::${MODULE_NAME}::get_owner_services`,
        functionArguments: [REGISTRY_ADDRESS, ownerAddress],
      },
    });

    return (result[0] as string[]).map((id) => Number(id));
  } catch {
    return [];
  }
}
