import logger from "@/lib/logger";

const OPS_ALERT_WEBHOOK_URL = process.env.OPS_ALERT_WEBHOOK_URL ?? process.env.SLACK_ALERT_WEBHOOK_URL ?? null;

export async function sendOpsAlert(message: string, context?: Record<string, unknown>): Promise<void> {
  if (!OPS_ALERT_WEBHOOK_URL) {
    logger.debug("ops.alert_skipped", { reason: "webhook_url_missing", message, context });
    return;
  }

  try {
    await fetch(OPS_ALERT_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: message,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Checkout Alert*\n${message}`,
            },
          },
          context
            ? {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `\`
${JSON.stringify(context, null, 2)}\`
`,
                },
              }
            : undefined,
        ].filter(Boolean),
      }),
    });
    logger.info("ops.alert_sent", { message });
  } catch (error) {
    logger.error("ops.alert_failed", {
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
  }
}

export default sendOpsAlert;
