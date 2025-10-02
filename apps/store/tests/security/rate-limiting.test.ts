import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

describe("Rate Limiting Security", () => {
  beforeEach(() => {
    // Clear any existing rate limit data
    // Note: In production, use Redis instead of in-memory storage
  });

  it("should allow requests within rate limit", async () => {
    const limiter = rateLimit({
      interval: 60 * 1000,
      uniqueTokenPerInterval: 10,
    });

    const request = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "192.168.1.1" },
    });

    for (let i = 0; i < 10; i++) {
      const result = await limiter(request);
      expect(result.success).toBe(true);
    }
  });

  it("should block requests exceeding rate limit", async () => {
    const limiter = rateLimit({
      interval: 60 * 1000,
      uniqueTokenPerInterval: 5,
    });

    const request = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "192.168.1.2" },
    });

    // Make 5 successful requests
    for (let i = 0; i < 5; i++) {
      const result = await limiter(request);
      expect(result.success).toBe(true);
    }

    // 6th request should fail
    const result = await limiter(request);
    expect(result.success).toBe(false);
  });

  it("should track different IPs separately", async () => {
    const limiter = rateLimit({
      interval: 60 * 1000,
      uniqueTokenPerInterval: 3,
    });

    const request1 = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "10.0.0.1" },
    });

    const request2 = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "10.0.0.2" },
    });

    // Make requests from IP1
    for (let i = 0; i < 3; i++) {
      const result1 = await limiter(request1);
      expect(result1.success).toBe(true);
    }
    
    // Make requests from IP2
    for (let i = 0; i < 3; i++) {
      const result2 = await limiter(request2);
      expect(result2.success).toBe(true);
    }

    // Both should be at limit now
    const result1 = await limiter(request1);
    const result2 = await limiter(request2);
    expect(result1.success).toBe(false);
    expect(result2.success).toBe(false);
  });

  it("should return correct rate limit headers", async () => {
    const limiter = rateLimit({
      interval: 60 * 1000,
      uniqueTokenPerInterval: 10,
    });

    const request = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "192.168.1.3" },
    });

    const result = await limiter(request);
    
    expect(result.limit).toBe(10);
    expect(result.remaining).toBeLessThanOrEqual(10);
    expect(result.reset).toBeInstanceOf(Date);
  });

  it("should handle requests without IP address", async () => {
    const limiter = rateLimit({
      interval: 60 * 1000,
      uniqueTokenPerInterval: 5,
    });

    const request = new NextRequest("http://localhost:3000/api/test");

    // Should use 'anonymous' as identifier
    const result = await limiter(request);
    expect(result.success).toBe(true);
  });

  it("should support custom identifiers", async () => {
    const limiter = rateLimit({
      interval: 60 * 1000,
      uniqueTokenPerInterval: 3,
    });

    const request = new NextRequest("http://localhost:3000/api/test");

    // Use custom identifier (e.g., API key)
    for (let i = 0; i < 3; i++) {
      const result = await limiter(request, "custom-api-key-123");
      expect(result.success).toBe(true);
    }

    const result = await limiter(request, "custom-api-key-123");
    expect(result.success).toBe(false);
  });

  it("should handle IPv6 addresses", async () => {
    const limiter = rateLimit({
      interval: 60 * 1000,
      uniqueTokenPerInterval: 5,
    });

    const request = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "2001:0db8:85a3:0000:0000:8a2e:0370:7334" },
    });

    const result = await limiter(request);
    expect(result.success).toBe(true);
  });

  it("should prevent distributed attack from same IP with different tokens", async () => {
    const limiter = rateLimit({
      interval: 60 * 1000,
      uniqueTokenPerInterval: 5,
    });

    const ip = "192.168.1.100";
    
    // Try to bypass rate limit with rapid requests
    for (let i = 0; i < 5; i++) {
      const request = new NextRequest(`http://localhost:3000/api/test?r=${i}`, {
        headers: { "x-forwarded-for": ip },
      });
      const result = await limiter(request);
      expect(result.success).toBe(true);
    }

    // Next request should fail
    const request = new NextRequest("http://localhost:3000/api/test?r=6", {
      headers: { "x-forwarded-for": ip },
    });
    const result = await limiter(request);
    expect(result.success).toBe(false);
  });
});
