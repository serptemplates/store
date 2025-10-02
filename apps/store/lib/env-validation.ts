/**
 * Environment Variable Validation
 * 
 * Validates required environment variables at startup to catch configuration
 * issues before they cause runtime failures.
 */

import logger from "./logger";

interface EnvConfig {
  name: string;
  required: boolean;
  description: string;
  validate?: (value: string) => boolean;
}

const ENV_CONFIGS: EnvConfig[] = [
  // Database
  {
    name: "DATABASE_URL",
    required: false, // Optional as app can work without DB
    description: "PostgreSQL connection string for order persistence",
  },
  
  // Stripe (required for payments)
  {
    name: "STRIPE_SECRET_KEY",
    required: true,
    description: "Stripe secret key (sk_live_* or sk_test_*)",
    validate: (value) => value.startsWith("sk_"),
  },
  {
    name: "STRIPE_WEBHOOK_SECRET",
    required: true,
    description: "Stripe webhook signing secret (whsec_*)",
    validate: (value) => value.startsWith("whsec_"),
  },
  {
    name: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    required: true,
    description: "Stripe publishable key (pk_live_* or pk_test_*)",
    validate: (value) => value.startsWith("pk_"),
  },
  
  // GHL (optional but recommended)
  {
    name: "GHL_PAT_LOCATION",
    required: false,
    description: "GoHighLevel Personal Access Token",
  },
  {
    name: "GHL_LOCATION_ID",
    required: false,
    description: "GoHighLevel Location ID",
  },
  
  // Site Configuration
  {
    name: "NEXT_PUBLIC_SITE_URL",
    required: true,
    description: "Full site URL (https://yourdomain.com)",
    validate: (value) => value.startsWith("http://") || value.startsWith("https://"),
  },
  {
    name: "NEXT_PUBLIC_CHECKOUT_URL",
    required: true,
    description: "Checkout API URL",
    validate: (value) => value.includes("/api/checkout/session"),
  },
  
  // Monitoring (optional)
  {
    name: "SLACK_ALERT_WEBHOOK_URL",
    required: false,
    description: "Slack webhook URL for ops alerts",
    validate: (value) => value.startsWith("https://hooks.slack.com/"),
  },
];

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate all environment variables
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const config of ENV_CONFIGS) {
    const value = process.env[config.name];

    // Check if required variable is missing
    if (config.required && !value) {
      errors.push(
        `Missing required environment variable: ${config.name} - ${config.description}`
      );
      continue;
    }

    // Warn about optional missing variables
    if (!config.required && !value) {
      warnings.push(
        `Optional environment variable not set: ${config.name} - ${config.description}`
      );
      continue;
    }

    // Run custom validation if provided
    if (value && config.validate && !config.validate(value)) {
      errors.push(
        `Invalid value for ${config.name}: ${config.description}`
      );
    }
  }

  // Additional validation checks
  if (process.env.NODE_ENV === "production") {
    // In production, ensure we're using live Stripe keys
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey && stripeKey.startsWith("sk_test_")) {
      warnings.push(
        "WARNING: Using Stripe test keys in production environment!"
      );
    }

    // Ensure HTTPS is used in production
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (siteUrl && !siteUrl.startsWith("https://")) {
      errors.push(
        "NEXT_PUBLIC_SITE_URL must use HTTPS in production"
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate and log results at startup
 * Throws error if validation fails
 */
export function validateEnvironmentOrThrow(): void {
  const result = validateEnvironment();

  // Log warnings
  if (result.warnings.length > 0) {
    result.warnings.forEach((warning) => {
      logger.warn("env.validation_warning", { warning });
    });
  }

  // Log and throw errors
  if (!result.valid) {
    result.errors.forEach((error) => {
      logger.error("env.validation_error", { error });
    });
    
    throw new Error(
      `Environment validation failed:\n${result.errors.join("\n")}`
    );
  }

  logger.info("env.validation_success", {
    checkedVariables: ENV_CONFIGS.length,
    warnings: result.warnings.length,
  });
}

/**
 * Get redacted environment info for debugging
 */
export function getEnvironmentInfo(): Record<string, string | boolean> {
  return {
    nodeEnv: process.env.NODE_ENV || "unknown",
    stripeMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")
      ? "test"
      : "live",
    databaseConfigured: !!process.env.DATABASE_URL,
    ghlConfigured: !!(
      process.env.GHL_PAT_LOCATION && process.env.GHL_LOCATION_ID
    ),
    paypalConfigured: !!(
      process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET
    ),
    monitoringConfigured: !!process.env.SLACK_ALERT_WEBHOOK_URL,
  };
}
