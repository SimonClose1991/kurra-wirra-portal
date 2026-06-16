import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { documentsTable } from "./documents";

export const completionsTable = pgTable("completions", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull(),
  documentId: integer("document_id").notNull().references(() => documentsTable.id, { onDelete: "cascade" }),
  signatureName: text("signature_name").notNull(),
  documentVersion: integer("document_version").notNull().default(1),
  signedAt: timestamp("signed_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCompletionSchema = createInsertSchema(completionsTable).omit({ id: true, createdAt: true });
export type InsertCompletion = z.infer<typeof insertCompletionSchema>;
export type Completion = typeof completionsTable.$inferSelect;
