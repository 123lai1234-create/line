import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const profileTable = pgTable("profile", {
  id: serial("id").primaryKey(),
  botName: text("bot_name").notNull(),
  introMessage: text("intro_message").notNull(),
  websiteUrl: text("website_url").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertProfileSchema = createInsertSchema(profileTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type ProfileRow = typeof profileTable.$inferSelect;
