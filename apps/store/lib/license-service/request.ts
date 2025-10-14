export interface JsonRequestInit extends RequestInit {
  timeout?: number;
}

export async function requestJson(
  url: string,
  options: JsonRequestInit = {},
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout ?? 5000);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const error = new Error(`Request failed (${response.status}) ${url}`);
      (error as Error & { status?: number; body?: string }).status = response.status;
      (error as Error & { status?: number; body?: string }).body = body;
      throw error;
    }

    const text = await response.text();
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } finally {
    clearTimeout(timeout);
  }
}

