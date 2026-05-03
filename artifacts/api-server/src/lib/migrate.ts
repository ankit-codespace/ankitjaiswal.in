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
  `);
  logger.info("schema: feedback table ensured");
}
