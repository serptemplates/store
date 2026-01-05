/**
 * Environment Variable Validation
 * 
 * Validates required environment variables at startup to catch configuration
 * issues before they cause runtime failures.
 */

import logger from "./logger";
import {
  getOptionalStripePublishableKey,
  getOptionalStripeSecretKey,
  getOptionalStripeWebhookSecret,
  getRuntimeEnvironment,
  getStripeMode,
} from "@/lib/payments/stripe-environment";

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
  {
    name: "GHL_PAYMENT_WEBHOOK_SECRET",
    required: false,
    description: "Shared secret to validate incoming GHL payment webhooks",
  },
  
  // Site Configuration
  {
    name: "NEXT_PUBLIC_SITE_URL",
    required: true,
    description: "Full site URL (https://yourdomain.com)",
    validate: (value) => value.startsWith("http://") || value.startsWith("https://"),
  },

  // Email delivery (required for verification emails in production)
  {
    name: "SMTP_HOST",
    required: false,
    description: "SMTP host for sending verification emails",
  },
  {
    name: "SMTP_PORT",
    required: false,
    description: "SMTP port for sending verification emails",
    validate: (value) => !Number.isNaN(Number(value)) && Number(value) > 0,
  },
  {
    name: "SMTP_USER",
    required: false,
    description: "SMTP username for sending verification emails",
  },
  {
    name: "SMTP_PASS",
    required: false,
    description: "SMTP password for sending verification emails",
  },
  {
    name: "ACCOUNT_EMAIL_SENDER",
    required: false,
    description: "From address used for account verification emails",
  },
  
  // Monitoring (optional)
  {
    name: "SLACK_ALERT_WEBHOOK_URL",
    required: false,
    description: "Slack webhook URL for ops alerts",
    validate: (value) => value.startsWith("https://hooks.slack.com/"),
  },
  {
    name: "NEXT_PUBLIC_POSTHOG_KEY",
    required: false,
    description: "PostHog project API key for session replay and analytics",
  },
  {
    name: "NEXT_PUBLIC_POSTHOG_HOST",
    required: false,
    description: "PostHog API host (defaults to https://us.i.posthog.com)",
    validate: (value) => value.startsWith("http://") || value.startsWith("https://"),
  },
  {
    name: "POSTHOG_API_KEY",
    required: false,
    description: "Server-side PostHog API key for recording checkout completions",
  },
  {
    name: "POSTHOG_API_HOST",
    required: false,
    description: "Server-side PostHog API host (defaults to https://us.i.posthog.com)",
    validate: (value) => value.startsWith("http://") || value.startsWith("https://"),
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

  const runtimeEnv = getRuntimeEnvironment();
  const stripeMode = getStripeMode();

  const emailVars = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "ACCOUNT_EMAIL_SENDER",
  ];
  const emailDisabledRaw = process.env.ACCOUNT_VERIFICATION_EMAIL_DISABLED ?? "";
  const emailDisabled = ["true", "1", "yes"].includes(emailDisabledRaw.trim().toLowerCase());
  const missingEmailVars = emailVars.filter((name) => !process.env[name]);

  if (!getOptionalStripeSecretKey(stripeMode)) {
    errors.push(
      stripeMode === "live"
        ? "Missing Stripe live secret key. Set STRIPE_SECRET_KEY_LIVE or provide an sk_live_* value in STRIPE_SECRET_KEY."
        : "Missing Stripe test secret key. Set STRIPE_SECRET_KEY_TEST with an sk_test_* value.",
    );
  }

  if (!getOptionalStripePublishableKey(stripeMode)) {
    errors.push(
      stripeMode === "live"
        ? "Missing Stripe live publishable key. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE or provide a pk_live_* value in NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY."
        : "Missing Stripe test publishable key. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST with a pk_test_* value.",
    );
  }

  if (!getOptionalStripeWebhookSecret(stripeMode)) {
    errors.push(
      stripeMode === "live"
        ? "Missing Stripe live webhook secret. Set STRIPE_WEBHOOK_SECRET_LIVE or provide a live secret in STRIPE_WEBHOOK_SECRET."
        : "Missing Stripe test webhook secret. Set STRIPE_WEBHOOK_SECRET_TEST or ensure STRIPE_WEBHOOK_SECRET points to your test endpoint.",
    );
  }

  if (!emailDisabled) {
    if (runtimeEnv === "production") {
      if (missingEmailVars.length > 0) {
        errors.push(`Missing SMTP configuration for verification emails: ${missingEmailVars.join(", ")}`);
      }
    } else if (missingEmailVars.length > 0) {
      warnings.push(
        `SMTP configuration incomplete (missing ${missingEmailVars.join(", ")}). Verification emails will not send without these.`,
      );
    }
  }

  if (runtimeEnv === "production") {
    if (stripeMode !== "live") {
      warnings.push("WARNING: Using Stripe test mode in production environment!");
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    // Allow http for localhost when running a production build locally
    const isLocalhost = siteUrl?.startsWith("http://localhost") || siteUrl?.startsWith("http://127.0.0.1");
    if (siteUrl && !siteUrl.startsWith("https://") && !isLocalhost) {
      errors.push("NEXT_PUBLIC_SITE_URL must use HTTPS in production");
    }
  } else if (stripeMode === "live") {
    warnings.push("Using live Stripe keys outside the production environment.");
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
    runtimeEnv: getRuntimeEnvironment(),
    stripeMode: getStripeMode(),
    databaseConfigured: !!process.env.DATABASE_URL,
    ghlConfigured: !!(
      process.env.GHL_PAT_LOCATION && process.env.GHL_LOCATION_ID
    ),
    monitoringConfigured: !!process.env.SLACK_ALERT_WEBHOOK_URL,
    emailDeliveryConfigured: Boolean(
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.ACCOUNT_EMAIL_SENDER,
    ),
  };
}
