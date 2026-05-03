import { pgTable, text, serial, timestamp, varchar, inet } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * `feedback` — every bug report / feature request submitted from the public
 * site lands here. Captured both for durable record-keeping (so nothing is
 * ever lost if email delivery fails) and for future analytics ("most-asked
 * features", spam pattern detection, etc.).
 */
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  // bug | feature | other — kept as text (not enum) so we can add new
  // categories without a migration. Validated at the route layer.
  type: varchar("type", { length: 24 }).notNull(),
  // Optional reply-to email. Blank string is allowed but normalised to NULL.
  email: varchar("email", { length: 320 }),
  // The actual message. Hard-capped at 5000 chars at the validation layer
  // — text column is unbounded for safety but realistic notes are tiny.
  message: text("message").notNull(),
  // Page the user was on when they hit "Send feedback". Helps me reproduce.
  pageUrl: text("page_url"),
  // Forensics in case of abuse. IP is stored as INET, UA truncated to 512.
  ipAddress: inet("ip_address"),
  userAgent: varchar("user_agent", { length: 512 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// drizzle-zod gives us the base shape; we tighten it in the route handler
// with stricter rules (length caps, email format, honeypot check).
export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
  ipAddress: true,
  userAgent: true,
});

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
