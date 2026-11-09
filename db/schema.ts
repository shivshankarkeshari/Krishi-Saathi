import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(), role: text("role").notNull().default("coordinator"), createdAt: text("created_at").notNull(),
});
export const cases = sqliteTable("cases", {
  id: text("id").primaryKey(), workspace: text("workspace").notNull(), reference: text("reference").notNull(),
  data: text("data").notNull(), revision: integer("revision").notNull().default(1),
  createdAt: text("created_at").notNull(), requestKey: text("request_key").notNull(),
}, t => [uniqueIndex("cases_request").on(t.workspace, t.requestKey)]);
export const events = sqliteTable("events", {
  id: text("id").primaryKey(), workspace: text("workspace").notNull(), caseId: text("case_id").notNull(),
  revision: integer("revision").notNull(), kind: text("kind").notNull(), actor: text("actor").notNull(), note: text("note").notNull(), createdAt: text("created_at").notNull(),
  snapshot: text("snapshot"),
}, t => [uniqueIndex("events_revision").on(t.caseId, t.revision)]);
export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(), workspace: text("workspace").notNull(), caseId: text("case_id").notNull(), name: text("name").notNull(),
  objectKey: text("object_key").notNull(), contentType: text("content_type").notNull(), size: integer("size").notNull(), createdAt: text("created_at").notNull(),
});
export const callbacks = sqliteTable("callbacks", {
  id: text("id").primaryKey(), workspace: text("workspace").notNull(), name: text("name").notNull(), phone: text("phone").notNull(),
  village: text("village").notNull(), note: text("note").notNull(), status: text("status").notNull().default("pending"), createdAt: text("created_at").notNull(),
});
export const assistance = sqliteTable("assistance", {
  id: text("id").primaryKey(), workspace: text("workspace").notNull(), caseId: text("case_id").notNull(), revision: integer("revision").notNull(),
  stage: text("stage").notNull(), provider: text("provider").notNull(), result: text("result").notNull(), createdAt: text("created_at").notNull(),
});
