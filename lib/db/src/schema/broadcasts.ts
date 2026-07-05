import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const broadcastsTable = pgTable("broadcasts", {
  id: serial("id").primaryKey(),
  kind: text("kind", { enum: ["text", "image", "flex"] }).notNull().default("text"),
  message: text("message"),
  title: text("title"),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  linkLabel: text("link_label"),
  status: text("status", { enum: ["sent", "failed", "scheduled"] }).notNull(),
  errorMessage: text("error_message"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBroadcastSchema = createInsertSchema(broadcastsTable).omit({
  id: true,
  sentAt: true,
});
export type InsertBroadcast = z.infer<typeof insertBroadcastSchema>;
export type BroadcastRow = typeof broadcastsTable.$inferSelect;
