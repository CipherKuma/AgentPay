import { Router, Request, Response } from 'express';
import { mockComputeProvider } from '../providers/compute.js';
import type { ComputeRunRequest } from '../providers/types.js';

const router = Router();

interface RunRequestBody {
  image: string;
  command?: string[];
  env?: Record<string, string>;
  gpu?: { type: string; count: number };
  timeout_seconds: number;
}

/**
 * POST /v1/compute/run
 * Start a GPU compute job (x402 protected)
 */
router.post('/compute/run', async (req: Request, res: Response) => {
  try {
    const body = req.body as RunRequestBody;

    // Validate required fields
    if (!body.image) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'image is required',
        },
      });
    }

    if (!body.timeout_seconds || body.timeout_seconds <= 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'timeout_seconds is required and must be positive',
        },
      });
    }

    // Validate GPU type if provided
    const gpuTypes = mockComputeProvider.gpuTypes;
    if (body.gpu?.type && !gpuTypes.includes(body.gpu.type)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: `Invalid GPU type. Available: ${gpuTypes.join(', ')}`,
        },
      });
    }

    // Build compute request with defaults
    const computeRequest: ComputeRunRequest = {
      image: body.image,
      command: body.command,
      env: body.env,
      gpu: body.gpu || { type: 'A100', count: 1 },
      timeout_seconds: body.timeout_seconds,
    };

    console.log('[Compute] Running job:', {
      image: computeRequest.image,
      gpu: computeRequest.gpu,
      timeout: computeRequest.timeout_seconds,
    });

    // Run the job
    const jobHandle = await mockComputeProvider.runJob(computeRequest);

    res.status(202).json({
      id: jobHandle.id,
      status: jobHandle.status,
      estimatedCost: jobHandle.estimatedCost,
      message: 'Job created successfully',
    });
  } catch (error) {
    console.error('[Compute] Run error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to start compute job',
      },
    });
  }
});

/**
 * GET /v1/compute/:id/status
 * Get status of a compute job (free - no payment required)
 */
router.get('/compute/:id/status', async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id;

    if (!jobId) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Job ID is required',
        },
      });
    }

    const status = await mockComputeProvider.getJobStatus(jobId);

    // If job not found, return 404
    if (status.status === 'failed' && status.logs === 'Job not found') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Job not found: ${jobId}`,
        },
      });
    }

    res.json({
      id: status.id,
      status: status.status,
      output: status.output,
      logs: status.logs,
      duration_seconds: status.duration_seconds,
      cost: status.cost,
    });
  } catch (error) {
    console.error('[Compute] Status error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get job status',
      },
    });
  }
});

/**
 * POST /v1/compute/:id/cancel
 * Cancel a running job (free - no payment required)
 */
router.post('/compute/:id/cancel', async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id;

    if (!jobId) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Job ID is required',
        },
      });
    }

    await mockComputeProvider.cancelJob(jobId);

    res.json({
      id: jobId,
      message: 'Job cancelled successfully',
    });
  } catch (error) {
    console.error('[Compute] Cancel error:', error);

    const message = error instanceof Error ? error.message : 'Failed to cancel job';
    const isNotFound = message.includes('not found');

    res.status(isNotFound ? 404 : 400).json({
      error: {
        code: isNotFound ? 'NOT_FOUND' : 'CANCEL_FAILED',
        message,
      },
    });
  }
});

export default router;
