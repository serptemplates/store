import paypal from "@paypal/checkout-server-sdk";

// PayPal environment configuration
function getPayPalEnvironment() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured");
  }

  // Use sandbox for development/testing, live for production
  if (process.env.NODE_ENV === "production" && !clientId.startsWith("sb")) {
    return new paypal.core.LiveEnvironment(clientId, clientSecret);
  } else {
    return new paypal.core.SandboxEnvironment(clientId, clientSecret);
  }
}

// PayPal client singleton
let paypalClient: paypal.core.PayPalHttpClient | null = null;

export function getPayPalClient() {
  if (!paypalClient) {
    try {
      const environment = getPayPalEnvironment();
      paypalClient = new paypal.core.PayPalHttpClient(environment);
    } catch (error) {
      console.error("Failed to initialize PayPal client:", error);
      throw error;
    }
  }
  return paypalClient;
}

// Check if PayPal is configured
export function isPayPalConfigured(): boolean {
  return Boolean(
    process.env.PAYPAL_CLIENT_ID &&
    process.env.PAYPAL_CLIENT_SECRET
  );
}

// Get PayPal client ID for frontend
export function getPayPalClientId(): string | undefined {
  return process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
}

// Create PayPal order
export async function createPayPalOrder(params: {
  amount: string;
  currency?: string;
  description?: string;
  offerId: string;
  metadata?: Record<string, string>;
}) {
  const client = getPayPalClient();

  const request = new paypal.orders.OrdersCreateRequest();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
    "http://localhost:3000";

  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [{
      amount: {
        currency_code: params.currency || "USD",
        value: params.amount,
      },
      description: params.description,
      custom_id: params.offerId,
      reference_id: `${params.offerId}-${Date.now()}`,
    }],
    application_context: {
      brand_name: "SERP Apps Store",
      landing_page: "BILLING",
      user_action: "PAY_NOW",
      return_url: `${siteUrl}/checkout/success?source=paypal`,
      cancel_url: `${siteUrl}/checkout/cancel`,
    },
  });

  try {
    const response = await client.execute(request);
    return response.result;
  } catch (error) {
    console.error("PayPal order creation failed:", error);
    throw error;
  }
}

// Capture PayPal order
export async function capturePayPalOrder(orderId: string) {
  const client = getPayPalClient();

  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});

  try {
    const response = await client.execute(request);
    return response.result;
  } catch (error) {
    console.error("PayPal order capture failed:", error);
    throw error;
  }
}

// Get PayPal order details
export async function getPayPalOrder(orderId: string) {
  const client = getPayPalClient();

  const request = new paypal.orders.OrdersGetRequest(orderId);

  try {
    const response = await client.execute(request);
    return response.result;
  } catch (error) {
    console.error("Failed to get PayPal order:", error);
    throw error;
  }
}

// Verify PayPal webhook signature
export async function verifyPayPalWebhook(params: {
  headers: Record<string, string>;
  body: string;
  webhookId: string;
}): Promise<boolean> {
  const client = getPayPalClient();

  const request = new paypal.notifications.VerifyWebhookSignatureRequest();
  request.requestBody({
    auth_algo: params.headers["paypal-auth-algo"],
    cert_url: params.headers["paypal-cert-url"],
    transmission_id: params.headers["paypal-transmission-id"],
    transmission_sig: params.headers["paypal-transmission-sig"],
    transmission_time: params.headers["paypal-transmission-time"],
    webhook_id: params.webhookId,
    webhook_event: JSON.parse(params.body),
  });

  try {
    const response = await client.execute(request);
    return response.result.verification_status === "SUCCESS";
  } catch (error) {
    console.error("PayPal webhook verification failed:", error);
    return false;
  }
}
