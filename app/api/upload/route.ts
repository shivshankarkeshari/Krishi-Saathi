import { env } from "cloudflare:workers";
import { context, json, errorResponse, getCase, getRole, commit } from "../../../lib/server";
import { DomainError } from "../../../lib/domain";
const allowed = new Set(["application/pdf", "image/jpeg", "image/png", "text/plain", "audio/webm", "audio/ogg", "audio/mp4"]);
export async function POST(request: Request) { try {
  const origin = request.headers.get("origin"); if (origin && origin !== new URL(request.url).origin) throw new DomainError("स्रोत मान्य नहीं है।", 403);
  const ctx = await context(); const role = await getRole(ctx); if (role !== "coordinator") throw new DomainError("दस्तावेज़ जोड़ने के लिए समन्वयक भूमिका चुनें।", 403);
  if (Number(request.headers.get("content-length")) > 6 * 1024 * 1024) throw new DomainError("फ़ाइल 5 MB तक रखें।", 413);
  const form = await request.formData(); const file = form.get("file"); const id = String(form.get("id") ?? "");
  const current = await getCase(ctx, id); if (["approved", "rejected"].includes(current.status)) throw new DomainError("निर्णय के बाद दस्तावेज़ नहीं जोड़े जा सकते।", 409);
  if (Number(form.get("revision")) !== current.revision) throw new DomainError("आवेदन बदल गया है। पुनः लोड करें।", 409);
  if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024 || !allowed.has(file.type)) throw new DomainError("PDF, PNG, JPG, TXT या ऑडियो फ़ाइल चुनें (अधिकतम 5 MB)।");
  if (!env.BUCKET) throw new DomainError("दस्तावेज़ भंडारण उपलब्ध नहीं है।", 503);
  const docId = crypto.randomUUID(); const key = ctx.workspace + "/" + id + "/" + docId; const name = file.name.replace(/[\x00-\x1f]/g, "").slice(0, 160) || "document";
  await env.BUCKET.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  try {
    const extra = ctx.db.prepare("INSERT INTO documents(id, workspace, case_id, name, object_key, content_type, size, created_at) SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE changes() = 1").bind(docId, ctx.workspace, id, name, key, file.type, file.size, new Date().toISOString());
    const next = { ...current, ...(file.type === "text/plain" ? { evidence: (current.evidence + "\n\n" + (await file.text())).slice(0, 12000) } : {}) };
    await commit(ctx, current, next, "document", `साक्ष्य फ़ाइल जोड़ी: ${name}। PDF/फोटो का स्वतः OCR उपलब्ध नहीं; मूल फ़ाइल की मानवीय जाँच आवश्यक।`, role, extra);
  } catch (e) { await env.BUCKET.delete(key); throw e; }
  return json({ id: docId });
} catch (e) { return errorResponse(e); } }
