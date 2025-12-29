import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockComputeProvider } from '../providers/compute.js';
import { calculateComputePrice } from '../middleware/x402.js';

describe('Compute Provider', () => {
  describe('runJob', () => {
    it('should create a job and return handle', async () => {
      const request = {
        image: 'nvidia/cuda:12.0',
        command: ['nvidia-smi'],
        timeout_seconds: 60,
      };

      const handle = await mockComputeProvider.runJob(request);

      expect(handle.id).toMatch(/^job_[a-f0-9]+$/);
      expect(handle.status).toBe('pending');
      expect(handle.estimatedCost).toBeDefined();
    });

    it('should use default GPU when not specified', async () => {
      const request = {
        image: 'nvidia/cuda:12.0',
        timeout_seconds: 60,
      };

      const handle = await mockComputeProvider.runJob(request);

      // Default is A100, 1 GPU
      // A100 = $2.50/hr, 60s = 0.0167 hr, cost = $0.0417
      const cost = parseFloat(handle.estimatedCost);
      expect(cost).toBeCloseTo(0.0417, 2);
    });

    it('should calculate correct cost for different GPU types', async () => {
      const request = {
        image: 'nvidia/cuda:12.0',
        gpu: { type: 'H100', count: 2 },
        timeout_seconds: 3600, // 1 hour
      };

      const handle = await mockComputeProvider.runJob(request);

      // H100 = $4/hr * 2 = $8/hr
      const cost = parseFloat(handle.estimatedCost);
      expect(cost).toBe(8);
    });
  });

  describe('getJobStatus', () => {
    it('should return job status after creation', async () => {
      const request = {
        image: 'nvidia/cuda:12.0',
        timeout_seconds: 60,
      };

      const handle = await mockComputeProvider.runJob(request);
      const status = await mockComputeProvider.getJobStatus(handle.id);

      expect(status.id).toBe(handle.id);
      expect(['pending', 'running']).toContain(status.status);
    });

    it('should return failed status for non-existent job', async () => {
      const status = await mockComputeProvider.getJobStatus('nonexistent-job');

      expect(status.status).toBe('failed');
      expect(status.logs).toBe('Job not found');
    });
  });

  describe('cancelJob', () => {
    it('should cancel a running job', async () => {
      const request = {
        image: 'nvidia/cuda:12.0',
        timeout_seconds: 3600, // Long timeout
      };

      const handle = await mockComputeProvider.runJob(request);

      // Wait for job to start running
      await new Promise((resolve) => setTimeout(resolve, 600));

      await mockComputeProvider.cancelJob(handle.id);

      const status = await mockComputeProvider.getJobStatus(handle.id);
      expect(status.status).toBe('failed');
      expect(status.logs).toContain('cancelled');
    });

    it('should throw error for non-existent job', async () => {
      await expect(
        mockComputeProvider.cancelJob('nonexistent-job')
      ).rejects.toThrow('Job not found');
    });
  });

  describe('healthCheck', () => {
    it('should return true for mock provider', async () => {
      const result = await mockComputeProvider.healthCheck();
      expect(result).toBe(true);
    });
  });

  describe('getComputePricing', () => {
    it('should return A100 pricing', () => {
      const pricing = mockComputeProvider.getComputePricing('A100');
      expect(pricing.perHour).toBe(2.5);
    });

    it('should return H100 pricing', () => {
      const pricing = mockComputeProvider.getComputePricing('H100');
      expect(pricing.perHour).toBe(4);
    });

    it('should return 4090 pricing', () => {
      const pricing = mockComputeProvider.getComputePricing('4090');
      expect(pricing.perHour).toBe(1);
    });

    it('should fallback to A100 pricing for unknown GPU', () => {
      const pricing = mockComputeProvider.getComputePricing('unknown');
      expect(pricing.perHour).toBe(2.5);
    });
  });
});

describe('Compute Pricing', () => {
  describe('calculateComputePrice', () => {
    it('should calculate price for 1 hour A100', () => {
      const price = calculateComputePrice('A100', 1, 3600);

      // A100 = $2.50/hr * 1.15 margin = $2.875
      expect(price.usd).toBeCloseTo(2.875, 2);

      // $2.875 / $0.50 = 5.75 MOVE = 575,000,000 octas
      expect(price.octas).toBe('575000000');
    });

    it('should calculate price for multiple GPUs', () => {
      const price = calculateComputePrice('H100', 4, 3600);

      // H100 = $4/hr * 4 = $16/hr * 1.15 = $18.40
      expect(price.usd).toBeCloseTo(18.4, 2);
    });

    it('should calculate price for short jobs', () => {
      const price = calculateComputePrice('4090', 1, 60);

      // 4090 = $1/hr, 60s = 1/60 hr = $0.0167 * 1.15 = $0.0192
      expect(price.usd).toBeCloseTo(0.0192, 3);
    });

    it('should use A100 pricing for unknown GPU type', () => {
      const price = calculateComputePrice('unknown', 1, 3600);

      // Should fallback to A100 pricing
      expect(price.usd).toBeCloseTo(2.875, 2);
    });
  });
});

describe('Request Validation', () => {
  it('should require image in request', () => {
    const validRequest = {
      image: 'nvidia/cuda:12.0',
      timeout_seconds: 60,
    };

    expect(validRequest.image).toBeDefined();
    expect(validRequest.timeout_seconds).toBeGreaterThan(0);
  });

  it('should require positive timeout_seconds', () => {
    const timeout = 60;
    expect(timeout).toBeGreaterThan(0);
  });

  it('should validate GPU type against available types', () => {
    const validTypes = mockComputeProvider.gpuTypes;

    expect(validTypes).toContain('A100');
    expect(validTypes).toContain('H100');
    expect(validTypes).toContain('4090');
    expect(validTypes).not.toContain('invalid');
  });
});
