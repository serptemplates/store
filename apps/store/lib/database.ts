import { createClient, createPool, type QueryResult, type QueryResultRow } from "@vercel/postgres";

type Primitive = string | number | boolean | null | undefined;

type DatabaseConnection = ReturnType<typeof createClient> | ReturnType<typeof createPool>;

let clientPromise: Promise<DatabaseConnection> | null;
let schemaPromise: Promise<void> | null;
let missingLogged = false;

let connectionOverride: string | null = null;
let currentConnectionString: string | null = null;

function log(message: string, extra?: Record<string, unknown>) {
  const payload = extra ? ` ${JSON.stringify(extra)}` : "";
  console.info(`[checkout-db] ${message}${payload}`);
}

function resolveConnectionStringFromEnv(): string {
  return (
    process.env.CHECKOUT_DATABASE_URL_UNPOOLED ??
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.CHECKOUT_DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.SUPABASE_DB_URL ??
    ""
  );
}

function isUnpooledConnection(): boolean {
  // Check if we explicitly have unpooled connection strings
  return Boolean(
    process.env.CHECKOUT_DATABASE_URL_UNPOOLED ??
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.POSTGRES_URL_NON_POOLING
  );
}

function getEffectiveConnectionString(): string {
  const override = connectionOverride?.trim();
  const fromEnv = resolveConnectionStringFromEnv()?.trim();
  const next = override && override.length > 0 ? override : fromEnv;

  if (next !== currentConnectionString) {
    clientPromise = null;
    schemaPromise = null;
    currentConnectionString = next ?? null;
  }

  return next ?? "";
}

export function isDatabaseConfigured(): boolean {
  const connectionString = getEffectiveConnectionString();
  return Boolean(connectionString);
}

const MAX_CONNECT_ATTEMPTS = Number(process.env.CHECKOUT_DB_CONNECT_ATTEMPTS ?? 3);
const RETRY_DELAY_MS = Number(process.env.CHECKOUT_DB_RETRY_DELAY_MS ?? 500);

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectWithRetry(connectionString: string) {
  let attempt = 0;
  let lastError: unknown;

  const totalAttempts = Math.max(1, MAX_CONNECT_ATTEMPTS);
  const usePool = !isUnpooledConnection();

  while (attempt < totalAttempts) {
    attempt += 1;

    try {
      const connection = usePool 
        ? createPool({ connectionString })
        : createClient({ connectionString });
      
      await connection.connect();

      if (attempt > 1) {
        log("Connected after retries", { attempt });
      }

      return connection;
    } catch (error) {
      lastError = error;
      log("Failed to connect", {
        attempt,
        error: error instanceof Error ? error.message : String(error),
      });

      if (attempt < totalAttempts) {
        await delay(RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw lastError ?? new Error("Unknown database connection failure");
}

async function getClient() {
  const connectionString = getEffectiveConnectionString();

  if (!connectionString) {
    return null;
  }

  if (!clientPromise) {
    clientPromise = connectWithRetry(connectionString).catch((error) => {
      clientPromise = null;
      throw error;
    });
  }

  return clientPromise;
}

async function runMigrations() {
  const client = await getClient();

  if (!client) {
    return;
  }

  await client.sql`
    CREATE TABLE IF NOT EXISTS checkout_sessions (
      id UUID PRIMARY KEY,
      stripe_session_id TEXT UNIQUE NOT NULL,
      stripe_payment_intent_id TEXT,
      offer_id TEXT NOT NULL,
      lander_id TEXT,
      customer_email TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'abandoned')),
      source TEXT NOT NULL DEFAULT 'stripe' CHECK (source IN ('stripe', 'paypal', 'ghl')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await client.sql`
    CREATE INDEX IF NOT EXISTS idx_checkout_sessions_payment_intent
      ON checkout_sessions (stripe_payment_intent_id);
  `;

  await client.sql`
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY,
      checkout_session_id UUID REFERENCES checkout_sessions (id) ON DELETE SET NULL,
      stripe_session_id TEXT,
      stripe_payment_intent_id TEXT UNIQUE,
      stripe_charge_id TEXT,
      amount_total BIGINT,
      currency TEXT,
      offer_id TEXT,
      lander_id TEXT,
      customer_email TEXT,
      customer_name TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      payment_status TEXT,
      payment_method TEXT,
      source TEXT NOT NULL DEFAULT 'stripe' CHECK (source IN ('stripe', 'paypal', 'ghl')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await client.sql`
    CREATE INDEX IF NOT EXISTS idx_orders_offer_id ON orders (offer_id);
  `;

  await client.sql`
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
  `;

  await client.sql`
    CREATE TABLE IF NOT EXISTS webhook_logs (
      id UUID PRIMARY KEY,
      payment_intent_id TEXT UNIQUE NOT NULL,
      stripe_session_id TEXT,
      event_type TEXT,
      offer_id TEXT,
      lander_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error')),
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_success_at TIMESTAMPTZ,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await client.sql`
    CREATE INDEX IF NOT EXISTS idx_webhook_logs_updated_at ON webhook_logs (updated_at DESC);
  `;

  await client.sql`
    CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs (status);
  `;
  await client.sql`
    ALTER TABLE checkout_sessions
      DROP CONSTRAINT IF EXISTS checkout_sessions_source_check;
  `;

  await client.sql`
    ALTER TABLE checkout_sessions
      ADD CONSTRAINT checkout_sessions_source_check
      CHECK (source IN ('stripe', 'paypal', 'ghl'));
  `;

  await client.sql`
    ALTER TABLE orders
      DROP CONSTRAINT IF EXISTS orders_source_check;
  `;

  await client.sql`
    ALTER TABLE orders
      ADD CONSTRAINT orders_source_check
      CHECK (source IN ('stripe', 'paypal', 'ghl'));
  `;
}

export async function ensureDatabase(): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    if (!missingLogged) {
      log("Database connection string missing; persistence disabled");
      missingLogged = true;
    }
    return false;
  }

  if (!schemaPromise) {
    schemaPromise = runMigrations().catch((error) => {
      schemaPromise = null;
      log("Failed to run migrations", { error: error instanceof Error ? error.message : error });
      throw error;
    });
  }

  await schemaPromise;
  missingLogged = false;
  return true;
}

export async function query<O extends QueryResultRow>(
  strings: TemplateStringsArray,
  ...values: Primitive[]
): Promise<QueryResult<O> | null> {
  const client = await getClient();

  if (!client) {
    return null;
  }

  return client.sql<O>(strings, ...values);
}

export function setDatabaseConnectionOverride(connectionString: string | null) {
  const normalized = connectionString?.trim() ?? null;

  if (normalized === connectionOverride) {
    return;
  }

  connectionOverride = normalized;
  clientPromise = null;
  schemaPromise = null;
  currentConnectionString = null;
}
