/**
 * Runtime Validation Middleware
 *
 * Provides middleware functions to validate data at runtime
 * Ensures all data flowing through the system matches expected contracts
 */

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError, ZodSchema } from 'zod';
import logger from '../logger';

// ============= Validation Result Types =============

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

// ============= Validation Middleware =============

/**
 * Creates a validation middleware for API routes
 */
export function createValidationMiddleware<T>(
  schema: ZodSchema<T>,
  options?: {
    logErrors?: boolean;
    returnDetails?: boolean;
    source?: 'body' | 'query' | 'headers';
  }
) {
  const { logErrors = true, returnDetails = false, source = 'body' } = options || {};

  return async function validateRequest(
    req: NextRequest
  ): Promise<ValidationResult<T>> {
    try {
      let dataToValidate: unknown;

      // Extract data based on source
      switch (source) {
        case 'body':
          dataToValidate = await req.json().catch(() => ({}));
          break;
        case 'query':
          dataToValidate = Object.fromEntries(req.nextUrl.searchParams);
          break;
        case 'headers':
          const headers: Record<string, string> = {};
          req.headers.forEach((value, key) => {
            headers[key] = value;
          });
          dataToValidate = headers;
          break;
      }

      // Validate data
      const validated = schema.parse(dataToValidate);

      return {
        success: true,
        data: validated,
      };
    } catch (error) {
      const errors = formatZodErrors(error as ZodError);

      if (logErrors) {
        logger.warn('validation.failed', {
          path: req.nextUrl.pathname,
          source,
          errors,
        });
      }

      return {
        success: false,
        errors: returnDetails ? errors : undefined,
      };
    }
  };
}

/**
 * Validates webhook signatures and payloads
 */
export function createWebhookValidator(
  provider: 'stripe' | 'paypal',
  secretKey: string
) {
  return async function validateWebhook(
    req: NextRequest
  ): Promise<ValidationResult<any>> {
    try {
      const body = await req.text();
      const signature = req.headers.get(`${provider}-signature`) || '';

      if (!signature) {
        return {
          success: false,
          errors: [
            {
              path: 'headers',
              message: `Missing ${provider} signature`,
              code: 'missing_signature',
            },
          ],
        };
      }

      // Provider-specific signature validation
      let isValid = false;
      let parsedBody: any;

      switch (provider) {
        case 'stripe':
          const stripe = require('stripe');
          const stripeClient = new stripe(secretKey);
          try {
            parsedBody = stripeClient.webhooks.constructEvent(
              body,
              signature,
              process.env.STRIPE_WEBHOOK_SECRET!
            );
            isValid = true;
          } catch {
            isValid = false;
          }
          break;

        case 'paypal':
          // PayPal webhook validation
          const crypto = require('crypto');
          const hash = crypto
            .createHmac('sha256', secretKey)
            .update(body)
            .digest('base64');
          isValid = hash === signature;
          parsedBody = JSON.parse(body);
          break;
      }

      if (!isValid) {
        logger.error('webhook.invalid_signature', {
          provider,
          path: req.nextUrl.pathname,
        });

        return {
          success: false,
          errors: [
            {
              path: 'signature',
              message: 'Invalid webhook signature',
              code: 'invalid_signature',
            },
          ],
        };
      }

      return {
        success: true,
        data: parsedBody,
      };
    } catch (error) {
      logger.error('webhook.validation_error', {
        provider,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        errors: [
          {
            path: 'webhook',
            message: 'Webhook validation failed',
            code: 'validation_failed',
          },
        ],
      };
    }
  };
}

// ============= Data Sanitization =============

/**
 * Sanitizes user input to prevent injection attacks
 */
export function sanitizeInput<T extends Record<string, any>>(
  data: T,
  options?: {
    stripHtml?: boolean;
    maxLength?: number;
    allowedFields?: string[];
  }
): T {
  const { stripHtml = true, maxLength = 1000, allowedFields } = options || {};

  const sanitized: any = {};

  for (const [key, value] of Object.entries(data)) {
    // Skip fields not in allowlist if specified
    if (allowedFields && !allowedFields.includes(key)) {
      continue;
    }

    // Sanitize based on type
    if (typeof value === 'string') {
      let clean = value.trim();

      // Strip HTML if requested
      if (stripHtml) {
        clean = clean.replace(/<[^>]*>/g, '');
      }

      // Enforce max length
      if (clean.length > maxLength) {
        clean = clean.substring(0, maxLength);
      }

      sanitized[key] = clean;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeInput(value, options);
    } else if (Array.isArray(value)) {
      // Sanitize array items
      sanitized[key] = value.map(item =>
        typeof item === 'object' ? sanitizeInput(item, options) : item
      );
    } else {
      // Pass through other types
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

// ============= Rate Limiting =============

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple in-memory rate limiter
 */
export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: NextRequest) => string;
}) {
  const { windowMs, maxRequests, keyGenerator } = options;

  return function rateLimit(req: NextRequest): ValidationResult<void> {
    const key = keyGenerator
      ? keyGenerator(req)
      : req.headers.get('x-forwarded-for') || 'anonymous';

    const now = Date.now();
    const record = rateLimitMap.get(key);

    if (!record || record.resetTime < now) {
      // Create new record
      rateLimitMap.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return { success: true };
    }

    if (record.count >= maxRequests) {
      return {
        success: false,
        errors: [
          {
            path: 'rate_limit',
            message: 'Too many requests',
            code: 'rate_limit_exceeded',
          },
        ],
      };
    }

    // Increment count
    record.count++;
    return { success: true };
  };
}

// ============= Idempotency =============

const idempotencyMap = new Map<string, any>();

/**
 * Ensures idempotent request processing
 */
export function createIdempotencyValidator(
  options?: {
    ttlMs?: number;
    keyHeader?: string;
  }
) {
  const { ttlMs = 86400000, keyHeader = 'idempotency-key' } = options || {};

  return function validateIdempotency(
    req: NextRequest
  ): ValidationResult<{ isNew: boolean; cachedResponse?: any }> {
    const key = req.headers.get(keyHeader);

    if (!key) {
      return {
        success: false,
        errors: [
          {
            path: 'headers',
            message: `Missing ${keyHeader} header`,
            code: 'missing_idempotency_key',
          },
        ],
      };
    }

    const cached = idempotencyMap.get(key);

    if (cached && cached.expiry > Date.now()) {
      return {
        success: true,
        data: {
          isNew: false,
          cachedResponse: cached.response,
        },
      };
    }

    return {
      success: true,
      data: {
        isNew: true,
      },
    };
  };
}

/**
 * Stores idempotent response
 */
export function storeIdempotentResponse(
  key: string,
  response: any,
  ttlMs = 86400000
): void {
  idempotencyMap.set(key, {
    response,
    expiry: Date.now() + ttlMs,
  });
}

// ============= Helper Functions =============

/**
 * Formats Zod validation errors for response
 */
function formatZodErrors(error: ZodError): ValidationError[] {
  return error.errors.map(err => ({
    path: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
}

/**
 * Creates a validation error response
 */
export function validationErrorResponse(
  errors: ValidationError[],
  status = 400
): NextResponse {
  return NextResponse.json(
    {
      error: 'Validation failed',
      details: errors,
    },
    { status }
  );
}

/**
 * Wraps an API handler with validation
 */
export function withValidation<T>(
  schema: ZodSchema<T>,
  handler: (req: NextRequest, validated: T) => Promise<NextResponse>
) {
  return async function wrappedHandler(req: NextRequest): Promise<NextResponse> {
    const validator = createValidationMiddleware(schema);
    const result = await validator(req);

    if (!result.success) {
      return validationErrorResponse(result.errors || []);
    }

    return handler(req, result.data!);
  };
}