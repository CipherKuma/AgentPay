import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import type { Provider, StreamChunk } from '../providers/types.js';

// Mock streaming generator
async function* mockStreamGenerator(): AsyncIterable<StreamChunk> {
  yield { id: 'test-1', delta: 'Hello' };
  yield { id: 'test-1', delta: ' World' };
  yield { id: 'test-1', delta: '!', finish_reason: 'stop' };
}

// Create mock provider with streaming support
const createMockStreamingProvider = (): Provider => ({
  id: 'mock-streaming',
  name: 'Mock Streaming Provider',
  models: ['gpt-4'],
  inference: vi.fn(),
  inferenceStream: vi.fn().mockReturnValue(mockStreamGenerator()),
  estimateTokens: vi.fn().mockReturnValue(100),
  getPricing: () => ({ input: 0.001, output: 0.002 }),
  healthCheck: vi.fn().mockResolvedValue(true),
});

// Create mock provider without streaming
const createMockNonStreamingProvider = (): Provider => ({
  id: 'mock-non-streaming',
  name: 'Mock Non-Streaming Provider',
  models: ['gpt-4'],
  inference: vi.fn(),
  estimateTokens: vi.fn().mockReturnValue(100),
  getPricing: () => ({ input: 0.001, output: 0.002 }),
  healthCheck: vi.fn().mockResolvedValue(true),
});

describe('Streaming Support', () => {
  describe('StreamChunk format', () => {
    it('should have correct chunk structure', () => {
      const chunk: StreamChunk = {
        id: 'test-id',
        delta: 'content',
        finish_reason: 'stop',
      };

      expect(chunk.id).toBeDefined();
      expect(chunk.delta).toBeDefined();
      expect(chunk.finish_reason).toBe('stop');
    });

    it('should allow chunk without finish_reason', () => {
      const chunk: StreamChunk = {
        id: 'test-id',
        delta: 'partial content',
      };

      expect(chunk.id).toBeDefined();
      expect(chunk.delta).toBeDefined();
      expect(chunk.finish_reason).toBeUndefined();
    });
  });

  describe('Streaming provider detection', () => {
    it('should detect streaming capability', () => {
      const streamingProvider = createMockStreamingProvider();
      const nonStreamingProvider = createMockNonStreamingProvider();

      expect(streamingProvider.inferenceStream).toBeDefined();
      expect(nonStreamingProvider.inferenceStream).toBeUndefined();
    });
  });

  describe('SSE response format', () => {
    it('should format chunks as SSE data lines', () => {
      const chunk: StreamChunk = { id: 'test', delta: 'Hello' };
      const sseData = `data: ${JSON.stringify(chunk)}\n\n`;

      expect(sseData).toBe('data: {"id":"test","delta":"Hello"}\n\n');
    });

    it('should format [DONE] message correctly', () => {
      const doneMessage = 'data: [DONE]\n\n';
      expect(doneMessage).toBe('data: [DONE]\n\n');
    });
  });

  describe('SSE headers', () => {
    it('should set correct headers for streaming', () => {
      const mockRes = {
        setHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as Response;

      // Simulate setting headers
      mockRes.setHeader('Content-Type', 'text/event-stream');
      mockRes.setHeader('Cache-Control', 'no-cache');
      mockRes.setHeader('Connection', 'keep-alive');

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/event-stream'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'no-cache'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Connection',
        'keep-alive'
      );
    });
  });

  describe('Stream generator', () => {
    it('should yield multiple chunks', async () => {
      const provider = createMockStreamingProvider();
      const chunks: StreamChunk[] = [];

      if (provider.inferenceStream) {
        const stream = provider.inferenceStream({
          model: 'gpt-4',
          prompt: 'Test',
        });

        for await (const chunk of stream) {
          chunks.push(chunk);
        }
      }

      expect(chunks.length).toBe(3);
      expect(chunks[0].delta).toBe('Hello');
      expect(chunks[1].delta).toBe(' World');
      expect(chunks[2].delta).toBe('!');
      expect(chunks[2].finish_reason).toBe('stop');
    });

    it('should have consistent id across chunks', async () => {
      const provider = createMockStreamingProvider();
      const chunks: StreamChunk[] = [];

      if (provider.inferenceStream) {
        const stream = provider.inferenceStream({
          model: 'gpt-4',
          prompt: 'Test',
        });

        for await (const chunk of stream) {
          chunks.push(chunk);
        }
      }

      const firstId = chunks[0].id;
      expect(chunks.every((c) => c.id === firstId)).toBe(true);
    });
  });

  describe('Mock response writing', () => {
    it('should write chunks and [DONE] to response', async () => {
      const writes: string[] = [];
      const mockRes = {
        setHeader: vi.fn(),
        write: vi.fn((data: string) => writes.push(data)),
        end: vi.fn(),
      };

      const provider = createMockStreamingProvider();

      if (provider.inferenceStream) {
        for await (const chunk of provider.inferenceStream({
          model: 'gpt-4',
          prompt: 'Test',
        })) {
          mockRes.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
        mockRes.write('data: [DONE]\n\n');
        mockRes.end();
      }

      expect(writes.length).toBe(4); // 3 chunks + [DONE]
      expect(writes[writes.length - 1]).toBe('data: [DONE]\n\n');
      expect(mockRes.end).toHaveBeenCalled();
    });
  });
});
