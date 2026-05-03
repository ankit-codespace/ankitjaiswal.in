import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const workLogs = pgTable("work_logs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  stats: text("stats"),
  tags: text("tags").array(),
  date: timestamp("date").defaultNow(),
});

export const insertWorkLogSchema = createInsertSchema(workLogs).omit({ id: true, date: true });

export type WorkLog = typeof workLogs.$inferSelect;
export type InsertWorkLog = z.infer<typeof insertWorkLogSchema>;
