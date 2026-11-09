import { z } from "zod";
import { context, body, json, errorResponse } from "../../../lib/server";
const schema = z.object({ name: z.string().trim().min(2).max(100), phone: z.string().regex(/^[6-9]\d{9}$/), village: z.string().trim().min(2).max(100), note: z.string().trim().min(1).max(2000), consent: z.literal(true) });
export async function POST(request: Request) { try {
  const ctx = await context(); const p = schema.safeParse(await body(request)); if (!p.success) return json({ error: "नाम, गाँव, मोबाइल और संपर्क की सहमति आवश्यक है।" }, 400);
  const id = crypto.randomUUID(); await ctx.db.prepare("INSERT INTO callbacks(id, workspace, name, phone, village, note, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)").bind(id, ctx.workspace, p.data.name, p.data.phone, p.data.village, p.data.note, new Date().toISOString()).run();
  return json({ id });
} catch (e) { return errorResponse(e); } }
export async function PATCH(request: Request) { try {
  const ctx = await context(); const p = z.object({ id: z.string().min(1).max(100), status: z.enum(["pending", "completed"]) }).safeParse(await body(request));
  if (!p.success) return json({ error: "सही संपर्क कार्य चुनें।" }, 400);
  const result = await ctx.db.prepare("UPDATE callbacks SET status = ? WHERE id = ? AND workspace = ?").bind(p.data.status, p.data.id, ctx.workspace).run();
  return result.meta.changes ? json({ ok: true }) : json({ error: "संपर्क कार्य नहीं मिला।" }, 404);
} catch (e) { return errorResponse(e); } }
