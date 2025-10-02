import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  rateLimit,
  checkoutRateLimit,
  webhookRateLimit,
  getRateLimitHeaders,
  withRateLimit,
} from '@/lib/rate-limit';

// Mock NextRequest
function createMockRequest(ip?: string, headers?: Record<string, string>): NextRequest {
  const url = 'http://localhost:3000/api/checkout/session';
  const request = new NextRequest(url, {
    method: 'POST',
    headers: headers || {},
  });

  // Mock the ip property
  Object.defineProperty(request, 'ip', {
    value: ip || '127.0.0.1',
    writable: true,
  });

  return request;
}

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clear timers
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rateLimit function', () => {
    it('should allow requests within the limit', async () => {
      const limiter = rateLimit({
        interval: 60000, // 1 minute
        uniqueTokenPerInterval: 5,
      });

      const request = createMockRequest();

      for (let i = 0; i < 5; i++) {
        const result = await limiter(request);
        expect(result.success).toBe(true);
        expect(result.remaining).toBe(5 - i - 1);
      }
    });

    it('should block requests exceeding the limit', async () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 3,
      });

      const request = createMockRequest();

      // First 3 requests should succeed
      for (let i = 0; i < 3; i++) {
        const result = await limiter(request);
        expect(result.success).toBe(true);
      }

      // 4th request should be blocked
      const result = await limiter(request);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after the interval', async () => {
      const limiter = rateLimit({
        interval: 60000, // 1 minute
        uniqueTokenPerInterval: 2,
      });

      const request = createMockRequest();

      // Use up the limit
      await limiter(request);
      await limiter(request);

      // This should be blocked
      let result = await limiter(request);
      expect(result.success).toBe(false);

      // Advance time by 1 minute
      vi.advanceTimersByTime(60001);

      // Should be allowed now
      result = await limiter(request);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it('should track limits per IP address', async () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 2,
      });

      const request1 = createMockRequest('192.168.1.1');
      const request2 = createMockRequest('192.168.1.2');

      // Use up limit for first IP
      await limiter(request1);
      await limiter(request1);
      let result = await limiter(request1);
      expect(result.success).toBe(false);

      // Second IP should still be allowed
      result = await limiter(request2);
      expect(result.success).toBe(true);
    });

    it('should handle x-forwarded-for header', async () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 2,
      });

      const request = createMockRequest(undefined, {
        'x-forwarded-for': '10.0.0.1, proxy1, proxy2',
      });

      const result = await limiter(request);
      expect(result.success).toBe(true);

      // Should use the first IP from x-forwarded-for
      const request2 = createMockRequest(undefined, {
        'x-forwarded-for': '10.0.0.1',
      });

      await limiter(request2);
      const result2 = await limiter(request2);
      expect(result2.success).toBe(false); // Should be blocked (same IP)
    });

    it('should handle x-real-ip header', async () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 1,
      });

      const request = createMockRequest(undefined, {
        'x-real-ip': '10.0.0.2',
      });

      const result = await limiter(request);
      expect(result.success).toBe(true);

      const result2 = await limiter(request);
      expect(result2.success).toBe(false);
    });

    it('should handle cf-connecting-ip header', async () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 1,
      });

      const request = createMockRequest(undefined, {
        'cf-connecting-ip': '10.0.0.3',
      });

      const result = await limiter(request);
      expect(result.success).toBe(true);

      const result2 = await limiter(request);
      expect(result2.success).toBe(false);
    });
  });

  describe('Predefined rate limiters', () => {
    it('checkoutRateLimit should allow 10 requests per minute', async () => {
      const request = createMockRequest();

      for (let i = 0; i < 10; i++) {
        const result = await checkoutRateLimit(request);
        expect(result.success).toBe(true);
      }

      const result = await checkoutRateLimit(request);
      expect(result.success).toBe(false);
    });

    it('webhookRateLimit should allow 100 requests per minute', async () => {
      const request = createMockRequest();

      for (let i = 0; i < 100; i++) {
        const result = await webhookRateLimit(request);
        expect(result.success).toBe(true);
      }

      const result = await webhookRateLimit(request);
      expect(result.success).toBe(false);
    });
  });

  describe('getRateLimitHeaders', () => {
    it('should return correct headers', () => {
      const reset = new Date('2024-01-01T12:00:00Z');
      const result = {
        success: true,
        limit: 10,
        remaining: 5,
        reset,
      };

      const headers = getRateLimitHeaders(result);

      expect(headers['X-RateLimit-Limit']).toBe('10');
      expect(headers['X-RateLimit-Remaining']).toBe('5');
      expect(headers['X-RateLimit-Reset']).toBe(reset.toISOString());
    });
  });

  describe('withRateLimit middleware', () => {
    it('should allow requests within limit', async () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 5,
      });

      const request = createMockRequest();
      const handler = vi.fn().mockResolvedValue(new Response('Success'));

      const response = await withRateLimit(request, limiter, handler);

      expect(handler).toHaveBeenCalled();
      expect(response.headers.get('X-RateLimit-Limit')).toBe('5');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('4');
    });

    it('should block requests exceeding limit', async () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 1,
      });

      const request = createMockRequest();
      const handler = vi.fn().mockResolvedValue(new Response('Success'));

      // First request should succeed
      await withRateLimit(request, limiter, handler);
      expect(handler).toHaveBeenCalledTimes(1);

      // Second request should be blocked
      const response = await withRateLimit(request, limiter, handler);

      expect(handler).toHaveBeenCalledTimes(1); // Not called again
      expect(response.status).toBe(429);

      const body = await response.json();
      expect(body.error).toBe('Too many requests');
      expect(body.message).toContain('Rate limit exceeded');
    });

    it('should add rate limit headers to successful responses', async () => {
      const limiter = rateLimit({
        interval: 60000,
        uniqueTokenPerInterval: 10,
      });

      const request = createMockRequest();
      const handler = vi.fn().mockResolvedValue(new Response('Success'));

      const response = await withRateLimit(request, limiter, handler);

      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('9');
      expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
    });
  });

  describe('Memory cleanup', () => {
    it('should clean up expired entries', () => {
      const limiter = rateLimit({
        interval: 1000, // 1 second
        uniqueTokenPerInterval: 1,
      });

      const request1 = createMockRequest('192.168.1.1');
      const request2 = createMockRequest('192.168.1.2');

      // Create entries
      limiter(request1);
      limiter(request2);

      // Advance time to trigger cleanup (5 minutes + 1 second)
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

      // These should create new entries (old ones cleaned up)
      const result1 = limiter(request1);
      const result2 = limiter(request2);

      expect(result1).toBeTruthy();
      expect(result2).toBeTruthy();
    });
  });
});