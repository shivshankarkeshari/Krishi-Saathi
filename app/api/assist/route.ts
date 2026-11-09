import { env } from "cloudflare:workers";
import { z } from "zod";
import { context, body, json, errorResponse, getCase } from "../../../lib/server";
import { generateAssistance } from "../../../lib/ai";
export async function POST(request: Request) { try {
  const ctx = await context(); const p = z.object({ id: z.string().min(1).max(100), language: z.enum(["hi", "en"]).default("hi") }).safeParse(await body(request)); if (!p.success) return json({ error: "आवेदन चुनें।" }, 400);
  const c = await getCase(ctx, p.data.id);
  const recent = await ctx.db.prepare("SELECT result FROM assistance WHERE case_id = ? AND workspace = ? AND revision = ? AND json_extract(result, '$.language') = ? AND created_at > ? ORDER BY created_at DESC LIMIT 1").bind(c.id, ctx.workspace, c.revision, p.data.language, new Date(Date.now() - 30000).toISOString()).first<{ result: string }>();
  if (recent) return json({ assistance: JSON.parse(recent.result), revision: c.revision });
  const result = { ...await generateAssistance(c, env, p.data.language), language: p.data.language };
  await ctx.db.prepare("INSERT INTO assistance(id, workspace, case_id, revision, stage, provider, result, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), ctx.workspace, c.id, c.revision, c.stage, result.provider, JSON.stringify(result), new Date().toISOString()).run();
  return json({ assistance: result, revision: c.revision });
} catch (e) { return errorResponse(e); } }
