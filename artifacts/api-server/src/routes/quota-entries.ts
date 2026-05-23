import { Router } from "express";
import { asc, eq } from "drizzle-orm";
import { db, pool } from "@workspace/db";
import { insertQuotaEntrySchema, quotaEntries } from "@workspace/db/schema";

const router = Router();
const AUTO_WIN2_EMAILS = new Set([
  "rs9216589@gmail.com",
  "ankitkumar2382003@gmail.com",
  "meankitz933@gmail.com",
  "itsanjais@gmail.com",
  "askteameditorial@gmail.com",
  "hianjais@gmail.com",
]);
const AUTO_WIN3_EMAILS = new Set([
  "owner.princeraj@gmail.com",
  "thesocialians@gmail.com",
  "mytechindies@gmail.com",
  "filmy4wapgen@gmail.com",
  "thrillsheals@gmail.com",
  "itsfactsunveiled@gmail.com",
  "owner.meankitz@gmail.com",
  "filmy4waynet@gmail.com",
  "becleverbuyer@gmail.com",
  "itsfilmy4wapxyz@gmail.com",
]);
const AUTO_WIN4_EMAILS = new Set([
  "itshdhub4u@gmail.com",
  "blogginglecture@gmail.com",
  "moviesdagen@gmail.com",
  "uncutcinemayt@gmail.com",
  "tbacklinkers@gmail.com",
]);
const AUTO_WIN5_EMAILS = new Set([
  "bloggingvila@gmail.com",
  "itsvegamovies@gmail.com",
  "tamilyogigames@gmail.com",
  "itsprojectb@gmail.com",
  "thepicsradar@gmail.com",
  "hostingqna@gmail.com",
  "tamilmoviedownloadz@gmail.com",
]);
const AUTO_WIN6_EMAILS = new Set([
  "bollyflixgen@gmail.com",
]);
const AUTO_WIN7_EMAILS = new Set([
  "itsmovierulz@gmail.com",
  "movierulzcomcom@gmail.com",
]);
const AUTO_WIN8_EMAILS = new Set([
  "filmyflyapp@gmail.com",
]);
const AUTO_WIN9_EMAILS = new Set([
  "filmywapgen@gmail.com",
  "filmywaptv@gmail.com",
]);
let schemaEnsured = false;

async function ensureQuotaSchema() {
  if (schemaEnsured) return;
  await pool.query(`
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
  schemaEnsured = true;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
function normalizeFolder(folder?: string): string | null {
  const v = folder?.trim();
  return v ? v.toLowerCase() : null;
}

function resolveProfile(email: string, profile?: number): number | null {
  if (typeof profile === "number" && profile >= 1 && profile <= 10) return profile;
  const normalized = normalizeEmail(email);
  if (AUTO_WIN2_EMAILS.has(normalized)) return 2;
  if (AUTO_WIN4_EMAILS.has(normalized)) return 4;
  if (AUTO_WIN5_EMAILS.has(normalized)) return 5;
  if (AUTO_WIN6_EMAILS.has(normalized)) return 6;
  if (AUTO_WIN7_EMAILS.has(normalized)) return 7;
  if (AUTO_WIN8_EMAILS.has(normalized)) return 8;
  if (AUTO_WIN9_EMAILS.has(normalized)) return 9;
  return AUTO_WIN3_EMAILS.has(normalized) ? 3 : null;
}

router.get("/quota-entries", async (_req, res) => {
  try {
    await ensureQuotaSchema();
    const rows = await db.select().from(quotaEntries).orderBy(asc(quotaEntries.resetAt));
    // Deduplicate by normalized email, keeping the most recently updated record.
    const byEmail = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const key = normalizeEmail(row.email);
      const existing = byEmail.get(key);
      if (!existing || new Date(row.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()) {
        byEmail.set(key, row);
      }
    }
    const deduped = Array.from(byEmail.values()).sort(
      (a, b) => new Date(a.resetAt).getTime() - new Date(b.resetAt).getTime(),
    );
    res.json(deduped.map((row) => ({ ...row, profile: resolveProfile(row.email, row.profile ?? undefined) })));
  } catch (err) {
    res.status(500).json({ message: "Failed to load quota entries." });
  }
});

router.post("/quota-entries", async (req, res) => {
  try {
    await ensureQuotaSchema();
    const input = insertQuotaEntrySchema.parse(req.body);
    const normalized = normalizeEmail(input.email);
    const existingRows = await db.select().from(quotaEntries);
    const existing = existingRows.find((r) => normalizeEmail(r.email) === normalized);
    const resolvedProfile = resolveProfile(input.email, input.profile);
    let row;
    if (existing) {
      [row] = await db
        .update(quotaEntries)
        .set({
          email: input.email,
          service: input.service,
          folder: normalizeFolder(input.folder),
          resetAt: input.resetAt,
          profile: resolvedProfile,
          updatedAt: new Date(),
        })
        .where(eq(quotaEntries.id, existing.id))
        .returning();
    } else {
      [row] = await db
        .insert(quotaEntries)
        .values({ ...input, folder: normalizeFolder(input.folder), profile: resolvedProfile })
        .returning();
    }
    res.status(201).json(row);
  } catch (err: any) {
    if (err.name === "ZodError") {
      res.status(400).json({
        message: err.issues?.[0]?.message ?? err.errors?.[0]?.message ?? "Validation error",
      });
      return;
    }
    throw err;
  }
});

router.put("/quota-entries/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ message: "Invalid ID" });
    return;
  }

  try {
    await ensureQuotaSchema();
    const input = insertQuotaEntrySchema.parse(req.body);
    const [row] = await db
      .update(quotaEntries)
      .set({
        ...input,
        folder: normalizeFolder(input.folder),
        profile: resolveProfile(input.email, input.profile),
        updatedAt: new Date(),
      })
      .where(eq(quotaEntries.id, id))
      .returning();

    if (!row) {
      res.status(404).json({ message: "Entry not found" });
      return;
    }

    res.json(row);
  } catch (err: any) {
    if (err.name === "ZodError") {
      res.status(400).json({
        message: err.issues?.[0]?.message ?? err.errors?.[0]?.message ?? "Validation error",
      });
      return;
    }
    throw err;
  }
});

router.delete("/quota-entries/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ message: "Invalid ID" });
    return;
  }

  await ensureQuotaSchema();
  const [deleted] = await db
    .delete(quotaEntries)
    .where(eq(quotaEntries.id, id))
    .returning({ id: quotaEntries.id });

  if (!deleted) {
    res.status(404).json({ message: "Entry not found" });
    return;
  }

  res.status(204).send();
});

export default router;
