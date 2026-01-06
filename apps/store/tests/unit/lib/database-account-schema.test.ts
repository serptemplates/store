import { describe, expect, it, vi } from "vitest";

import { ensureAccountSchema } from "@/lib/database";

describe("ensureAccountSchema", () => {
  it("creates accounts and verification tables with indexes", async () => {
    const sql = vi.fn(async () => null);
    const mockClient = { sql };

    await ensureAccountSchema(mockClient as never);

    expect(sql).toHaveBeenCalledTimes(9);

    const statements = sql.mock.calls.map((call) => {
      const [strings] = call as [TemplateStringsArray?];
      return String(strings?.[0] ?? "");
    });

    expect(statements[0]).toContain("CREATE TABLE IF NOT EXISTS accounts");
    expect(statements[1]).toContain("CREATE INDEX IF NOT EXISTS idx_accounts_status");
    expect(statements[2]).toContain("CREATE TABLE IF NOT EXISTS account_verification_tokens");
    expect(statements[3]).toContain("CREATE INDEX IF NOT EXISTS idx_account_verification_tokens_account");
    expect(statements[4]).toContain("CREATE INDEX IF NOT EXISTS idx_account_verification_tokens_expires");
    expect(statements[5]).toContain("CREATE TABLE IF NOT EXISTS account_email_change_tokens");
    expect(statements[6]).toContain("CREATE INDEX IF NOT EXISTS idx_account_email_change_tokens_account");
    expect(statements[7]).toContain("CREATE INDEX IF NOT EXISTS idx_account_email_change_tokens_expires");
    expect(statements[8]).toContain("CREATE INDEX IF NOT EXISTS idx_account_email_change_tokens_email");
  });
});
