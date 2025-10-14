export const JSON_EMPTY_OBJECT = "{}";

export function toJsonbLiteral(payload?: Record<string, unknown> | null) {
  const json = payload && Object.keys(payload).length > 0 ? JSON.stringify(payload) : JSON_EMPTY_OBJECT;
  return `${json}`;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
