import { z } from "zod";
import { context, initialize, getRole, record, json, body, errorResponse } from "../../../lib/server";
export async function GET() { try {
  const ctx = await context(); await initialize(ctx);
  const [rows, eventRows, docRows, calls, role] = await Promise.all([
    ctx.db.prepare("SELECT * FROM cases WHERE workspace = ? ORDER BY created_at DESC").bind(ctx.workspace).all(),
    ctx.db.prepare("SELECT * FROM events WHERE workspace = ? ORDER BY created_at DESC, revision DESC").bind(ctx.workspace).all(),
    ctx.db.prepare("SELECT id, case_id, name, content_type, size, created_at FROM documents WHERE workspace = ?").bind(ctx.workspace).all(),
    ctx.db.prepare("SELECT * FROM callbacks WHERE workspace = ? ORDER BY created_at DESC").bind(ctx.workspace).all(), getRole(ctx),
  ]);
  return json({ cases: rows.results.map(r => record(r as Parameters<typeof record>[0])), events: eventRows.results, documents: docRows.results, callbacks: calls.results, role, user: ctx.displayName });
} catch (e) { return errorResponse(e); } }
export async function POST(request: Request) { try {
  const ctx = await context(); const parsed = z.object({ role: z.enum(["coordinator", "reviewer", "officer"]) }).safeParse(await body(request));
  if (!parsed.success) return json({ error: "मान्य डेमो भूमिका चुनें।" }, 400);
  await ctx.db.prepare("UPDATE workspaces SET role = ? WHERE id = ?").bind(parsed.data.role, ctx.workspace).run(); return json({ role: parsed.data.role });
} catch (e) { return errorResponse(e); } }
