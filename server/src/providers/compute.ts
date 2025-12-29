import { randomBytes } from 'crypto';
import type {
  ComputeProvider,
  ComputeRunRequest,
  ComputeJobHandle,
  ComputeJobStatus,
} from './types.js';

// GPU pricing in USD per hour
const GPU_PRICING: Record<string, number> = {
  'A100': 2.50,
  'H100': 4.00,
  '4090': 1.00,
};

// Cleanup interval: 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

interface InternalJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  request: ComputeRunRequest;
  startTime: number;
  completionTime?: number;
  output?: string;
  logs?: string;
  estimatedCost: number;
}

/**
 * Mock compute provider for development/demo
 * Simulates GPU job execution without actual infrastructure
 */
class MockComputeProvider implements ComputeProvider {
  id = 'mock';
  name = 'Mock Compute Provider';
  gpuTypes = Object.keys(GPU_PRICING);

  private jobs: Map<string, InternalJob> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanup();
  }

  /**
   * Start periodic cleanup of old jobs
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      const staleThreshold = CLEANUP_INTERVAL_MS;

      for (const [id, job] of this.jobs.entries()) {
        const age = now - job.startTime;
        if (age > staleThreshold && (job.status === 'completed' || job.status === 'failed')) {
          this.jobs.delete(id);
          console.log(`[MockCompute] Cleaned up job: ${id}`);
        }
      }
    }, CLEANUP_INTERVAL_MS);
  }

  /**
   * Run a compute job (simulated)
   */
  async runJob(request: ComputeRunRequest): Promise<ComputeJobHandle> {
    const jobId = `job_${randomBytes(8).toString('hex')}`;
    const gpuType = request.gpu?.type || 'A100';
    const gpuCount = request.gpu?.count || 1;
    const timeoutSeconds = request.timeout_seconds;

    // Calculate estimated cost based on timeout
    const hoursMax = timeoutSeconds / 3600;
    const pricePerHour = this.getComputePricing(gpuType).perHour;
    const estimatedCost = hoursMax * pricePerHour * gpuCount;

    const job: InternalJob = {
      id: jobId,
      status: 'pending',
      request,
      startTime: Date.now(),
      estimatedCost,
    };

    this.jobs.set(jobId, job);
    console.log(`[MockCompute] Created job: ${jobId} (${gpuType} x${gpuCount})`);

    // Simulate job starting after brief delay
    setTimeout(() => {
      const currentJob = this.jobs.get(jobId);
      if (currentJob && currentJob.status === 'pending') {
        currentJob.status = 'running';
        currentJob.logs = `[${new Date().toISOString()}] Job started\n`;
        console.log(`[MockCompute] Job running: ${jobId}`);
      }
    }, 500);

    // Simulate job completion (use timeout_seconds / 10 for demo)
    const simulatedDurationMs = (timeoutSeconds / 10) * 1000;
    setTimeout(() => {
      const currentJob = this.jobs.get(jobId);
      if (currentJob && currentJob.status === 'running') {
        currentJob.status = 'completed';
        currentJob.completionTime = Date.now();
        currentJob.output = JSON.stringify({
          result: 'mock_computation_complete',
          image: request.image,
          command: request.command,
          gpu: gpuType,
        });
        currentJob.logs += `[${new Date().toISOString()}] Job completed successfully\n`;
        console.log(`[MockCompute] Job completed: ${jobId}`);
      }
    }, simulatedDurationMs);

    return {
      id: jobId,
      status: 'pending',
      estimatedCost: estimatedCost.toFixed(4),
    };
  }

  /**
   * Get current status of a job
   */
  async getJobStatus(jobId: string): Promise<ComputeJobStatus> {
    const job = this.jobs.get(jobId);

    if (!job) {
      return {
        id: jobId,
        status: 'failed',
        output: undefined,
        logs: 'Job not found',
      };
    }

    const durationSeconds = job.completionTime
      ? (job.completionTime - job.startTime) / 1000
      : (Date.now() - job.startTime) / 1000;

    // Calculate actual cost based on duration
    const gpuType = job.request.gpu?.type || 'A100';
    const gpuCount = job.request.gpu?.count || 1;
    const hours = durationSeconds / 3600;
    const actualCost = hours * this.getComputePricing(gpuType).perHour * gpuCount;

    return {
      id: job.id,
      status: job.status,
      output: job.output,
      logs: job.logs,
      duration_seconds: Math.round(durationSeconds),
      cost: job.status === 'completed' ? actualCost.toFixed(6) : undefined,
    };
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status === 'completed' || job.status === 'failed') {
      throw new Error(`Cannot cancel job in ${job.status} state`);
    }

    job.status = 'failed';
    job.logs = (job.logs || '') + `[${new Date().toISOString()}] Job cancelled by user\n`;
    console.log(`[MockCompute] Job cancelled: ${jobId}`);
  }

  /**
   * Get pricing for a GPU type
   */
  getComputePricing(gpuType: string): { perHour: number } {
    const price = GPU_PRICING[gpuType];
    if (!price) {
      console.warn(`[MockCompute] Unknown GPU type: ${gpuType}, using A100 pricing`);
      return { perHour: GPU_PRICING['A100'] };
    }
    return { perHour: price };
  }

  /**
   * Health check - always returns true for mock
   */
  async healthCheck(): Promise<boolean> {
    return true;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.jobs.clear();
  }
}

// Singleton instance
export const mockComputeProvider = new MockComputeProvider();
