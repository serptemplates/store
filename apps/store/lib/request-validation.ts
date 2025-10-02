/**
 * Request validation middleware helpers
 * 
 * Provides security utilities for validating incoming requests including
 * payload size limits, content-type validation, and more.
 */

import { NextRequest, NextResponse } from "next/server";
import logger from "./logger";

// Default limits (can be overridden per endpoint)
const DEFAULT_JSON_SIZE_LIMIT = 1024 * 100; // 100KB
const DEFAULT_TEXT_SIZE_LIMIT = 1024 * 50; // 50KB

interface RequestValidationOptions {
  maxJsonSize?: number;
  maxTextSize?: number;
  allowedContentTypes?: string[];
  requireContentType?: boolean;
}

/**
 * Validate request payload size before processing
 */
export async function validateRequestSize(
  request: NextRequest,
  options: RequestValidationOptions = {}
): Promise<{ valid: boolean; error?: string }> {
  const {
    maxJsonSize = DEFAULT_JSON_SIZE_LIMIT,
    maxTextSize = DEFAULT_TEXT_SIZE_LIMIT,
  } = options;

  const contentLength = request.headers.get("content-length");
  const contentType = request.headers.get("content-type");

  // Check if content length is provided
  if (!contentLength) {
    // No content-length header, try to read body and check
    const body = await request.text();
    const size = new TextEncoder().encode(body).length;

    if (size > maxTextSize) {
      logger.warn("request.size_exceeded", {
        size,
        maxSize: maxTextSize,
        path: request.nextUrl.pathname,
      });
      return {
        valid: false,
        error: `Request body too large: ${size} bytes (max: ${maxTextSize})`,
      };
    }

    return { valid: true };
  }

  const size = parseInt(contentLength, 10);

  // Validate based on content type
  if (contentType?.includes("application/json")) {
    if (size > maxJsonSize) {
      logger.warn("request.json_size_exceeded", {
        size,
        maxSize: maxJsonSize,
        path: request.nextUrl.pathname,
      });
      return {
        valid: false,
        error: `JSON payload too large: ${size} bytes (max: ${maxJsonSize})`,
      };
    }
  } else {
    if (size > maxTextSize) {
      logger.warn("request.text_size_exceeded", {
        size,
        maxSize: maxTextSize,
        path: request.nextUrl.pathname,
      });
      return {
        valid: false,
        error: `Request body too large: ${size} bytes (max: ${maxTextSize})`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate content-type header
 */
export function validateContentType(
  request: NextRequest,
  allowedTypes: string[]
): { valid: boolean; error?: string } {
  const contentType = request.headers.get("content-type");

  if (!contentType) {
    logger.warn("request.missing_content_type", {
      path: request.nextUrl.pathname,
    });
    return {
      valid: false,
      error: "Missing Content-Type header",
    };
  }

  const isAllowed = allowedTypes.some((type) =>
    contentType.toLowerCase().includes(type.toLowerCase())
  );

  if (!isAllowed) {
    logger.warn("request.invalid_content_type", {
      contentType,
      allowed: allowedTypes,
      path: request.nextUrl.pathname,
    });
    return {
      valid: false,
      error: `Invalid Content-Type: ${contentType}. Allowed: ${allowedTypes.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Validate request origin for CORS
 */
export function validateOrigin(
  request: NextRequest,
  allowedOrigins: string[]
): { valid: boolean; error?: string } {
  const origin = request.headers.get("origin");

  // No origin header in same-origin requests
  if (!origin) {
    return { valid: true };
  }

  const isAllowed = allowedOrigins.some((allowed) => {
    if (allowed === "*") return true;
    if (allowed.endsWith("*")) {
      const base = allowed.slice(0, -1);
      return origin.startsWith(base);
    }
    return origin === allowed;
  });

  if (!isAllowed) {
    logger.warn("request.origin_not_allowed", {
      origin,
      allowed: allowedOrigins,
      path: request.nextUrl.pathname,
    });
    return {
      valid: false,
      error: `Origin not allowed: ${origin}`,
    };
  }

  return { valid: true };
}

/**
 * Middleware wrapper for request validation
 */
export async function withRequestValidation(
  request: NextRequest,
  options: RequestValidationOptions & {
    allowedOrigins?: string[];
  },
  handler: (request: NextRequest) => Promise<Response>
): Promise<Response> {
  // Validate content type if specified
  if (options.requireContentType !== false && options.allowedContentTypes) {
    const contentTypeResult = validateContentType(
      request,
      options.allowedContentTypes
    );
    if (!contentTypeResult.valid) {
      return NextResponse.json(
        { error: contentTypeResult.error },
        { status: 415 }
      );
    }
  }

  // Validate origin if specified
  if (options.allowedOrigins) {
    const originResult = validateOrigin(request, options.allowedOrigins);
    if (!originResult.valid) {
      return NextResponse.json(
        { error: originResult.error },
        { status: 403 }
      );
    }
  }

  // Validate request size
  const sizeResult = await validateRequestSize(request, options);
  if (!sizeResult.valid) {
    return NextResponse.json(
      { error: sizeResult.error },
      { status: 413 }
    );
  }

  // All validations passed, call handler
  return handler(request);
}

/**
 * Sanitize error messages for production
 */
export function sanitizeErrorMessage(
  error: unknown,
  isDevelopment: boolean = process.env.NODE_ENV === "development"
): string {
  if (isDevelopment) {
    // In development, show full error
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  // In production, return generic message
  if (error instanceof Error) {
    // Only expose specific error types that are safe
    const safeErrors = [
      "Validation error",
      "Invalid request",
      "Not found",
      "Unauthorized",
      "Rate limit exceeded",
    ];

    if (safeErrors.some((safe) => error.message.includes(safe))) {
      return error.message;
    }
  }

  return "An error occurred processing your request";
}
