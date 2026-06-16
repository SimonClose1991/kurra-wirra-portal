import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { categoriesTable } from "./categories";

export const formsTable = pgTable("forms", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => categoriesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isRepeatable: boolean("is_repeatable").notNull().default(false),
  notifyAdmins: boolean("notify_admins").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const formFieldsTable = pgTable("form_fields", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").notNull().references(() => formsTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  fieldType: text("field_type").notNull().default("text"),
  required: boolean("required").notNull().default(false),
  placeholder: text("placeholder"),
  options: text("options"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const formSubmissionsTable = pgTable("form_submissions", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").notNull().references(() => formsTable.id, { onDelete: "cascade" }),
  clerkUserId: text("clerk_user_id").notNull(),
  data: text("data").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Form = typeof formsTable.$inferSelect;
export type FormField = typeof formFieldsTable.$inferSelect;
export type FormSubmission = typeof formSubmissionsTable.$inferSelect;
