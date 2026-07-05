import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const broadcastsTable = pgTable("broadcasts", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  status: text("status", { enum: ["sent", "failed"] }).notNull(),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBroadcastSchema = createInsertSchema(broadcastsTable).omit({
  id: true,
  sentAt: true,
});
export type InsertBroadcast = z.infer<typeof insertBroadcastSchema>;
export type BroadcastRow = typeof broadcastsTable.$inferSelect;
