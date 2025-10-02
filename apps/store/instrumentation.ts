/**
 * Next.js instrumentation hook
 * Runs once when the server starts, before any requests are handled
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Only run on Node.js runtime (not Edge)
    const { validateEnvironmentOrThrow, getEnvironmentInfo } = await import(
      "./lib/env-validation"
    );
    const logger = (await import("./lib/logger")).default;

    try {
      // Validate environment variables
      validateEnvironmentOrThrow();

      // Log environment info (redacted)
      const envInfo = getEnvironmentInfo();
      logger.info("app.startup", {
        message: "Application started successfully",
        environment: envInfo,
      });
    } catch (error) {
      logger.error("app.startup_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      
      // In production, fail fast
      if (process.env.NODE_ENV === "production") {
        throw error;
      }
      
      // In development, log warning but continue
      console.warn(
        "⚠️  Environment validation failed. Some features may not work correctly."
      );
    }
  }
}
