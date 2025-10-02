import { NextRequest } from "next/server";

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max number of unique tokens per interval
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
}

// In-memory store for rate limiting (replace with Redis in production)
const rateLimitStore = new Map<string, {
  tokens: Set<string>;
  resetTime: number;
}>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function rateLimit(config: RateLimitConfig) {
  return async function checkRateLimit(
    request: NextRequest,
    identifier?: string
  ): Promise<RateLimitResult> {
    // Get identifier from IP address or custom identifier
    const id = identifier || getClientIp(request) || "anonymous";
    const now = Date.now();
    const resetTime = now + config.interval;

    // Get or create rate limit entry
    let entry = rateLimitStore.get(id);

    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired one
      entry = {
        tokens: new Set(),
        resetTime: resetTime,
      };
      rateLimitStore.set(id, entry);
    }

    // Generate unique token for this request
    const token = `${now}-${Math.random()}`;
    entry.tokens.add(token);

    const tokensUsed = entry.tokens.size;
    const remaining = Math.max(0, config.uniqueTokenPerInterval - tokensUsed);
    const success = tokensUsed <= config.uniqueTokenPerInterval;

    return {
      success,
      limit: config.uniqueTokenPerInterval,
      remaining,
      reset: new Date(entry.resetTime),
    };
  };
}

// Helper function to get client IP from request
function getClientIp(request: NextRequest): string | null {
  // Check various headers that might contain the real IP
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  // No IP found
  return null;
}

// Predefined rate limiters for different use cases
export const checkoutRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 10, // 10 requests per minute
});

export const webhookRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 100, // 100 requests per minute
});

export const apiRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 30, // 30 requests per minute
});

// Helper to format rate limit headers
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toISOString(),
  };
}

// Middleware helper for rate limiting
export async function withRateLimit(
  request: NextRequest,
  rateLimiter: ReturnType<typeof rateLimit>,
  handler: () => Promise<Response>
): Promise<Response> {
  const result = await rateLimiter(request);

  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: "Too many requests",
        message: `Rate limit exceeded. Please try again after ${result.reset.toISOString()}`,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...getRateLimitHeaders(result),
        },
      }
    );
  }

  const response = await handler();

  // Add rate limit headers to successful responses
  Object.entries(getRateLimitHeaders(result)).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}