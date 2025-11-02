/**
 * Create a Stripe checkout session with Dub attribution metadata
 * This utility reads the dub_id cookie and calls the checkout API
 * to create a session with proper attribution for the Dub Partner Program
 */

export interface CreateSessionWithDubOptions {
  priceId: string
  quantity?: number
  mode?: "payment" | "subscription"
  successUrl?: string
  cancelUrl?: string
  customerEmail?: string
}

export interface CreateSessionResponse {
  id: string
  url: string | null
  status: string | null
}

/**
 * Get the dub_id cookie value from the browser
 */
function getDubId(): string | null {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null
  }

  try {
    const cookies = document.cookie.split(";").map((c) => c.trim())
    const dubCookie = cookies.find((c) => c.startsWith("dub_id="))
    if (!dubCookie) return null

    const rawValue = decodeURIComponent(dubCookie.split("=")[1] || "").trim()
    if (!rawValue) return null

    // Normalize the dub_id value (ensure it starts with dub_id_)
    return rawValue.startsWith("dub_id_") ? rawValue : `dub_id_${rawValue}`
  } catch {
    return null
  }
}

/**
 * Create a Stripe checkout session with Dub attribution metadata
 * Returns the checkout session URL or null if creation fails
 */
export async function createSessionWithDub(
  options: CreateSessionWithDubOptions,
): Promise<string | null> {
  try {
    const dubId = getDubId()

    const payload: Record<string, unknown> = {
      priceId: options.priceId,
      quantity: options.quantity ?? 1,
      mode: options.mode ?? "payment",
      successUrl: options.successUrl,
      cancelUrl: options.cancelUrl,
      customerEmail: options.customerEmail,
    }

    // Add Dub attribution metadata if cookie is present
    if (dubId) {
      payload.dubCustomerExternalId = dubId
      payload.dubClickId = dubId
      payload.clientReferenceId = dubId
    }

    const response = await fetch("/api/checkout/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error("Failed to create checkout session:", response.status, response.statusText)
      return null
    }

    const data = (await response.json()) as CreateSessionResponse

    if (!data.url) {
      console.error("Checkout session created but no URL returned:", data)
      return null
    }

    return data.url
  } catch (error) {
    console.error("Error creating checkout session with Dub attribution:", error)
    return null
  }
}
