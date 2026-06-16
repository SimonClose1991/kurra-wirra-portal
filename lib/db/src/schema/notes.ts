import { pgTable, text, serial, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { categoriesTable } from "./categories";
import { documentsTable } from "./documents";

export const categoryNotesTable = pgTable("category_notes", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => categoriesTable.id, { onDelete: "cascade" }),
  clerkUserId: text("clerk_user_id").notNull(),
  content: text("content").notNull(),
  isAdminNote: boolean("is_admin_note").notNull().default(false),
  isVisibleToStaff: boolean("is_visible_to_staff").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  unique("category_notes_unique").on(table.categoryId, table.clerkUserId, table.isAdminNote),
]);

export type CategoryNote = typeof categoryNotesTable.$inferSelect;

export const documentNotesTable = pgTable("document_notes", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documentsTable.id, { onDelete: "cascade" }),
  clerkUserId: text("clerk_user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DocumentNote = typeof documentNotesTable.$inferSelect;
