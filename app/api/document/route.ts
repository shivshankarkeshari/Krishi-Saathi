import { env } from "cloudflare:workers";
import { context, json, errorResponse } from "../../../lib/server";
export async function GET(request: Request) { try {
  const ctx = await context(); const id = new URL(request.url).searchParams.get("id");
  const doc = await ctx.db.prepare("SELECT * FROM documents WHERE id = ? AND workspace = ?").bind(id, ctx.workspace).first<{ object_key: string; content_type: string; name: string }>();
  if (!doc) return json({ error: "फ़ाइल नहीं मिली।" }, 404);
  const obj = await env.BUCKET?.get(doc.object_key); if (!obj) return json({ error: "फ़ाइल नहीं मिली।" }, 404);
  return new Response(obj.body, { headers: { "Content-Type": doc.content_type, "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.name)}`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox; default-src 'none'" } });
} catch (e) { return errorResponse(e); } }
