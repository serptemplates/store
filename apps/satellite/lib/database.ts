import { createClient, type QueryResult, type QueryResultRow } from "@vercel/postgres";

const connectionString =
  process.env.CHECKOUT_DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.SUPABASE_DB_URL ??
  "";

type Primitive = string | number | boolean | null | undefined;

let clientPromise: Promise<ReturnType<typeof createClient>> | null;
let schemaPromise: Promise<void> | null;
let missingLogged = false;

function log(message: string, extra?: Record<string, unknown>) {
  const payload = extra ? ` ${JSON.stringify(extra)}` : "";
  // eslint-disable-next-line no-console -- Operational logging for database availability.
  console.info(`[checkout-db] ${message}${payload}`);
}

export function isDatabaseConfigured(): boolean {
  return Boolean(connectionString);
}

async function getClient() {
  if (!connectionString) {
    return null;
  }

  if (!clientPromise) {
    clientPromise = (async () => {
      const client = createClient({ connectionString });
      await client.connect();
      return client;
    })().catch((error) => {
      clientPromise = null;
      log("Failed to connect", { error: error instanceof Error ? error.message : error });
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
      source TEXT NOT NULL DEFAULT 'stripe' CHECK (source IN ('stripe', 'paypal')),
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
      source TEXT NOT NULL DEFAULT 'stripe' CHECK (source IN ('stripe', 'paypal')),
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
