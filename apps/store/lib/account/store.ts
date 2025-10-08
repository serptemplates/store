import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";

import { ensureDatabase, query } from "@/lib/database";

export type AccountStatus = "pending" | "active" | "disabled";

export interface AccountRecord {
  id: string;
  email: string;
  name: string | null;
  status: AccountStatus;
  verifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountVerificationTokenRecord {
  id: string;
  accountId: string;
  tokenHash: string;
  codeHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function mapAccountRow(row?: {
  id: string;
  email: string;
  name: string | null;
  status: AccountStatus;
  verified_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
} | null): AccountRecord | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    status: row.status,
    verifiedAt: row.verified_at ? new Date(row.verified_at) : null,
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapVerificationRow(row?: {
  id: string;
  account_id: string;
  token_hash: string;
  code_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
} | null): AccountVerificationTokenRecord | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    accountId: row.account_id,
    tokenHash: row.token_hash,
    codeHash: row.code_hash,
    expiresAt: new Date(row.expires_at),
    usedAt: row.used_at ? new Date(row.used_at) : null,
    createdAt: new Date(row.created_at),
  };
}

export async function findAccountByEmail(email: string): Promise<AccountRecord | null> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return null;
  }

  const normalizedEmail = normalizeEmail(email);

  const result = await query<{
    id: string;
    email: string;
    name: string | null;
    status: AccountStatus;
    verified_at: string | null;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
  }>`
    SELECT id,
           email,
           name,
           status,
           verified_at,
           last_login_at,
           created_at,
           updated_at
      FROM accounts
     WHERE email = ${normalizedEmail}
     LIMIT 1;
  `;

  return mapAccountRow(result?.rows?.[0] ?? null);
}

export async function findAccountById(accountId: string): Promise<AccountRecord | null> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return null;
  }

  const result = await query<{
    id: string;
    email: string;
    name: string | null;
    status: AccountStatus;
    verified_at: string | null;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
  }>`
    SELECT id,
           email,
           name,
           status,
           verified_at,
           last_login_at,
           created_at,
           updated_at
      FROM accounts
     WHERE id = ${accountId}
     LIMIT 1;
  `;

  return mapAccountRow(result?.rows?.[0] ?? null);
}

export async function upsertAccount(params: {
  email: string;
  name?: string | null;
}): Promise<AccountRecord | null> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return null;
  }

  const normalizedEmail = normalizeEmail(params.email);
  const name = params.name?.trim() || null;

  const result = await query<{
    id: string;
    email: string;
    name: string | null;
    status: AccountStatus;
    verified_at: string | null;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
  }>`
    INSERT INTO accounts (
      id,
      email,
      name,
      status
    ) VALUES (
      ${randomUUID()},
      ${normalizedEmail},
      ${name},
      'pending'
    )
    ON CONFLICT (email) DO UPDATE SET
      name = COALESCE(EXCLUDED.name, accounts.name),
      updated_at = NOW()
    RETURNING id,
              email,
              name,
              status,
              verified_at,
              last_login_at,
              created_at,
              updated_at;
  `;

  return mapAccountRow(result?.rows?.[0] ?? null);
}

export interface VerificationCreationResult {
  token: string;
  code: string;
  expiresAt: Date;
  record: AccountVerificationTokenRecord;
}

export async function createVerificationToken(
  accountId: string,
  options?: { expiresInMinutes?: number },
): Promise<VerificationCreationResult | null> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return null;
  }

  const expiresInMinutes = Math.max(options?.expiresInMinutes ?? 30, 1);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  const token = randomBytes(32).toString("hex");
  const codeNumber = randomInt(0, 1_000_000);
  const code = codeNumber.toString().padStart(6, "0");

  const tokenHash = hashValue(token);
  const codeHash = hashValue(code);

  await query`
    UPDATE account_verification_tokens
       SET used_at = NOW()
     WHERE account_id = ${accountId}
       AND used_at IS NULL;
  `;

  const result = await query<{
    id: string;
    account_id: string;
    token_hash: string;
    code_hash: string;
    expires_at: string;
    used_at: string | null;
    created_at: string;
  }>`
    INSERT INTO account_verification_tokens (
      id,
      account_id,
      token_hash,
      code_hash,
      expires_at
    ) VALUES (
      ${randomUUID()},
      ${accountId},
      ${tokenHash},
      ${codeHash},
      ${expiresAt.toISOString()}
    )
    RETURNING id,
              account_id,
              token_hash,
              code_hash,
              expires_at,
              used_at,
              created_at;
  `;

  const record = mapVerificationRow(result?.rows?.[0] ?? null);

  if (!record) {
    return null;
  }

  return {
    token,
    code,
    expiresAt,
    record,
  };
}

export async function findActiveVerificationByToken(token: string): Promise<AccountVerificationTokenRecord | null> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return null;
  }

  const tokenHash = hashValue(token);

  const result = await query<{
    id: string;
    account_id: string;
    token_hash: string;
    code_hash: string;
    expires_at: string;
    used_at: string | null;
    created_at: string;
  }>`
    SELECT id,
           account_id,
           token_hash,
           code_hash,
           expires_at,
           used_at,
           created_at
      FROM account_verification_tokens
     WHERE token_hash = ${tokenHash}
       AND used_at IS NULL
       AND expires_at > NOW()
     LIMIT 1;
  `;

  return mapVerificationRow(result?.rows?.[0] ?? null);
}

export async function findActiveVerificationByCode(accountId: string, code: string): Promise<AccountVerificationTokenRecord | null> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return null;
  }

  const codeHash = hashValue(code);

  const result = await query<{
    id: string;
    account_id: string;
    token_hash: string;
    code_hash: string;
    expires_at: string;
    used_at: string | null;
    created_at: string;
  }>`
    SELECT id,
           account_id,
           token_hash,
           code_hash,
           expires_at,
           used_at,
           created_at
      FROM account_verification_tokens
     WHERE account_id = ${accountId}
       AND code_hash = ${codeHash}
       AND used_at IS NULL
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1;
  `;

  return mapVerificationRow(result?.rows?.[0] ?? null);
}

export async function markVerificationTokenUsed(tokenId: string): Promise<void> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return;
  }

  await query`
    UPDATE account_verification_tokens
       SET used_at = NOW()
     WHERE id = ${tokenId};
  `;
}

export async function markAccountVerified(accountId: string): Promise<void> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return;
  }

  await query`
    UPDATE accounts
       SET status = 'active',
           verified_at = COALESCE(verified_at, NOW()),
           updated_at = NOW()
     WHERE id = ${accountId};
  `;
}

export async function recordAccountLogin(accountId: string): Promise<void> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return;
  }

  await query`
    UPDATE accounts
       SET last_login_at = NOW(),
           updated_at = NOW()
     WHERE id = ${accountId};
  `;
}

export function getAccountEmailForSession(account: AccountRecord | null): string | null {
  return account?.email ?? null;
}

export function getAccountId(account: AccountRecord | null): string | null {
  return account?.id ?? null;
}
