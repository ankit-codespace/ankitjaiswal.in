import { pool } from "@workspace/db";
import { logger } from "./logger";

/**
 * Idempotent table bootstrap. We don't yet have a Drizzle migration
 * pipeline wired up in CI, and the agent's local network can't reach the
 * dev DB to run `drizzle-kit push`, so we make the api-server itself
 * responsible for ensuring the tables it depends on exist before serving
 * traffic.
 *
 * Every statement here uses `IF NOT EXISTS` and is safe to re-run on every
 * boot. When we eventually adopt drizzle-kit migrations this file becomes
 * a no-op and can be removed.
 */
export async function ensureSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id          SERIAL PRIMARY KEY,
      type        VARCHAR(24) NOT NULL,
      email       VARCHAR(320),
      message     TEXT NOT NULL,
      page_url    TEXT,
      ip_address  INET,
      user_agent  VARCHAR(512),
      created_at  TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON feedback (created_at DESC);
    CREATE INDEX IF NOT EXISTS feedback_type_idx ON feedback (type);
    CREATE TABLE IF NOT EXISTS quota_entries (
      id          SERIAL PRIMARY KEY,
      email       TEXT NOT NULL,
      service     TEXT NOT NULL,
      folder      TEXT,
      profile     SMALLINT,
      reset_at    TIMESTAMPTZ NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
    ALTER TABLE quota_entries ADD COLUMN IF NOT EXISTS folder TEXT;
    ALTER TABLE quota_entries ADD COLUMN IF NOT EXISTS profile SMALLINT;
    CREATE INDEX IF NOT EXISTS quota_entries_reset_at_idx ON quota_entries (reset_at ASC);
    CREATE INDEX IF NOT EXISTS quota_entries_service_idx ON quota_entries (service);
  `);
  logger.info("schema: feedback + quota_entries tables ensured");
}
