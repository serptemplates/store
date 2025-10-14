import { setTimeout as sleep } from "node:timers/promises";

import logger from "@/lib/logger";

import { ensureConfigured, GHL_API_VERSION, GHL_AUTH_TOKEN, GHL_BASE_URL } from "./config";
import { GhlRequestError } from "./errors";

export const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 250;

type GhlRequestInit = RequestInit & {
  retryDescription?: string;
  suppressErrorLogStatuses?: number[];
};

export async function ghlRequest<T>(
  path: string,
  init: GhlRequestInit = {},
  attempt = 1,
): Promise<T> {
  ensureConfigured();

  const url = `${GHL_BASE_URL}${path}`;
  const { suppressErrorLogStatuses, ...requestInit } = init;
  const headers = new Headers(requestInit.headers ?? {});
  headers.set("Authorization", `Bearer ${GHL_AUTH_TOKEN!}`);
  headers.set("Version", GHL_API_VERSION);
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");

  const response = await fetch(url, {
    ...requestInit,
    headers,
  });

  if (response.ok) {
    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }

  if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < MAX_ATTEMPTS) {
    const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
    logger.warn("ghl.request_retry", {
      attempt,
      status: response.status,
      path,
      delayMs: delay,
    });
    await sleep(delay);
    return ghlRequest(path, init, attempt + 1);
  }

  const body = await response.text();
  if (suppressErrorLogStatuses?.includes(response.status)) {
    logger.debug("ghl.request_failed_suppressed", {
      status: response.status,
      path,
      responseBody: body,
      request: requestInit.body,
    });
  } else {
    logger.error("ghl.request_failed", {
      status: response.status,
      path,
      responseBody: body,
      request: requestInit.body,
    });
  }
  throw new GhlRequestError(
    `GHL request failed with status ${response.status}: ${body}`,
    response.status,
    body,
  );
}

