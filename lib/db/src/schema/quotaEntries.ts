import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const quotaEntries = pgTable("quota_entries", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  service: text("service").notNull(),
  folder: text("folder"),
  profile: integer("profile"),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertQuotaEntrySchema = createInsertSchema(quotaEntries, {
  email: z.string().trim().min(1, "Email/nickname is required.").max(320, "Email/nickname is too long."),
  service: z.string().trim().min(1, "Service is required.").max(120, "Service is too long."),
  folder: z.string().trim().min(1).max(80).optional(),
  profile: z.coerce.number().int().min(1).max(10).optional(),
  resetAt: z.coerce.date(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type QuotaEntry = typeof quotaEntries.$inferSelect;
export type InsertQuotaEntry = z.infer<typeof insertQuotaEntrySchema>;
