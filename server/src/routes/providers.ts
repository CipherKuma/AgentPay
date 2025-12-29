import { Router, Request, Response } from 'express';
import { listProviders, getProvider } from '../providers/index.js';
import { routingEngine } from '../routing/index.js';

const router = Router();

/**
 * GET /v1/providers
 * List all available compute providers with health status
 */
router.get('/providers', async (_req: Request, res: Response) => {
  try {
    const providers = listProviders();
    const statuses = routingEngine.getProviderStatuses();
    const statusMap = new Map(statuses.map((s) => [s.id, s]));

    const providersWithStatus = providers.map((info) => {
      const status = statusMap.get(info.id);

      return {
        id: info.id,
        name: info.name,
        models: info.models,
        model_count: info.models.length,
        status: status?.available !== false ? 'available' : 'unavailable',
        health: status
          ? {
              latency_p50: Math.round(status.latency_p50),
              availability: Math.round(status.availability * 100) / 100,
              last_check: status.lastCheck.toISOString(),
            }
          : {
              latency_p50: null,
              availability: 1.0,
              last_check: null,
            },
      };
    });

    res.json({
      providers: providersWithStatus,
      meta: {
        count: providersWithStatus.length,
        available: providersWithStatus.filter((p) => p.status === 'available').length,
      },
    });
  } catch (error) {
    console.error('[Providers] Error listing providers:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list providers',
      },
    });
  }
});

/**
 * GET /v1/providers/:id
 * Get a specific provider details with health status
 */
router.get('/providers/:id', async (req: Request, res: Response) => {
  try {
    const provider = getProvider(req.params.id);

    if (!provider) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Provider not found: ${req.params.id}`,
        },
      });
    }

    const status = routingEngine.getProviderStatus(provider.id);

    const models = provider.models.map((modelId) => ({
      id: modelId,
      pricing: provider.getPricing(modelId),
    }));

    res.json({
      id: provider.id,
      name: provider.name,
      status: status?.available !== false ? 'available' : 'unavailable',
      health: status
        ? {
            latency_p50: Math.round(status.latency_p50),
            availability: Math.round(status.availability * 100) / 100,
            last_check: status.lastCheck.toISOString(),
          }
        : {
            latency_p50: null,
            availability: 1.0,
            last_check: null,
          },
      models,
      model_count: models.length,
    });
  } catch (error) {
    console.error('[Providers] Error getting provider:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get provider',
      },
    });
  }
});

export default router;
