import type { ServiceRow } from '@/lib/db/types';
import type { PublicServiceInfo, JSONSchema } from '@/lib/types/service';
import { MOVE_USD_RATE, OCTAS_PER_MOVE } from '@/lib/x402/constants';

/**
 * Map database rows to public service info for registry
 */
export function mapToPublicServices(
  services: ServiceRow[]
): PublicServiceInfo[] {
  const network = process.env.MOVEMENT_NETWORK || 'movement-testnet';

  return services.map((s) => {
    const priceMove = Number(s.price_per_request) / Number(OCTAS_PER_MOVE);
    const priceUsd = priceMove * MOVE_USD_RATE;

    return {
      id: s.id,
      name: s.name,
      description: s.description,
      category: s.category || 'other',
      tags: s.tags || [],
      iconUrl: s.icon_url,
      pricePerRequest: s.price_per_request.toString(),
      priceUsd: priceUsd.toFixed(6),
      inputSchema: s.input_schema as JSONSchema | null,
      outputSchema: s.output_schema as JSONSchema | null,
      isVerified: s.is_verified ?? false,
      ownerAddress: s.owner_address,
      stats: {
        totalRequests: s.total_requests ?? 0,
        averageLatency: 0, // TODO: Calculate from usage table
      },
      payTo: s.owner_address,
      network,
    };
  });
}

/**
 * Map single service row to public service info
 */
export function mapToPublicService(service: ServiceRow): PublicServiceInfo {
  return mapToPublicServices([service])[0];
}
