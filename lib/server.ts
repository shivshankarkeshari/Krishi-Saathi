import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../app/chatgpt-auth";
import { DomainError, roleNames, type CaseData, type CaseRecord, type Role } from "./domain";
import { seedCases } from "./seed";

export function database() { if (!env.DB) throw new DomainError("डेटाबेस उपलब्ध नहीं है। स्थानीय migrations चलाएँ।", 503); return env.DB; }
export function json(data: unknown, status = 200) { return Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }); }
export function errorResponse(error: unknown) { if (error instanceof DomainError) return json({ error: error.message }, error.status); console.error("Request failed", error instanceof Error ? error.name : "Unknown"); return json({ error: "सेवा में समस्या आई। पुनः प्रयास करें; आपका पिछला रिकॉर्ड सुरक्षित है।" }, 500); }
export async function body(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new DomainError("इस स्रोत से अनुरोध मान्य नहीं है।", 403);
  const raw = await request.text(); if (raw.length > 40000) throw new DomainError("अनुरोध बहुत बड़ा है।", 413);
  try { return JSON.parse(raw); } catch { throw new DomainError("मान्य JSON भेजें।"); }
}
export async function context() {
  const user = await getChatGPTUser();
  if (!user && env.LOCAL_DEMO !== "1") throw new DomainError("इस कार्यक्षेत्र के लिए साइन इन करें।", 401);
  const workspace = user?.userId ?? "explicit-local-demo";
  return { workspace, displayName: user?.displayName ?? "स्थानीय डेमो", db: database() };
}
export type Context = Awaited<ReturnType<typeof context>>;
export async function getRole(ctx: Context): Promise<Role> {
  const row = await ctx.db.prepare("SELECT role FROM workspaces WHERE id = ?").bind(ctx.workspace).first<{ role: Role }>();
  if (!row) throw new DomainError("पहले कार्यक्षेत्र खोलें।", 409); return row.role;
}
export function record(row: { id: string; reference: string; data: string; revision: number; created_at: string }): CaseRecord { return { ...JSON.parse(row.data), id: row.id, reference: row.reference, revision: row.revision, createdAt: row.created_at }; }
export async function getCase(ctx: Context, id: string) {
  const row = await ctx.db.prepare("SELECT * FROM cases WHERE id = ? AND workspace = ?").bind(id, ctx.workspace).first<{ id: string; reference: string; data: string; revision: number; created_at: string }>();
  if (!row) throw new DomainError("आवेदन नहीं मिला।", 404); return record(row);
}
export async function initialize(ctx: Context) {
  const existing = await ctx.db.prepare("SELECT id FROM workspaces WHERE id = ?").bind(ctx.workspace).first();
  if (existing) return;
  const prefix = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ctx.workspace)))).slice(0, 12).map(x => x.toString(16).padStart(2, "0")).join("");
  const now = new Date().toISOString();
  const statements = [ctx.db.prepare("INSERT OR IGNORE INTO workspaces(id, role, created_at) VALUES (?, 'coordinator', ?)").bind(ctx.workspace, now)];
  for (const c of seedCases()) {
    const id = prefix + "-" + c.id;
    statements.push(ctx.db.prepare("INSERT OR IGNORE INTO cases(id, workspace, reference, data, revision, created_at, request_key) VALUES (?, ?, ?, ?, 1, ?, ?)").bind(id, ctx.workspace, c.reference, JSON.stringify(c), c.createdAt, c.id));
    statements.push(ctx.db.prepare("INSERT OR IGNORE INTO events(id, workspace, case_id, revision, kind, actor, note, created_at) VALUES (?, ?, ?, 1, 'created', 'डेमो सहायक', ?, ?)").bind(id + "-created", ctx.workspace, id, "काल्पनिक उदाहरण जोड़ा गया। पूर्व चरणों का इतिहास उपलब्ध नहीं; वर्तमान स्थिति नमूना है।", c.createdAt));
  }
  await ctx.db.batch(statements);
}
export async function commit(ctx: Context, current: CaseRecord, next: CaseData, kind: string, note: string, role: Role, extra?: D1PreparedStatement) {
  const now = new Date().toISOString();
  const statements = [
    ctx.db.prepare("UPDATE cases SET data = ?, revision = revision + 1 WHERE id = ? AND workspace = ? AND revision = ?").bind(JSON.stringify(next), current.id, ctx.workspace, current.revision),
    ctx.db.prepare("INSERT INTO events(id, workspace, case_id, revision, kind, actor, note, created_at, snapshot) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE changes() = 1").bind(crypto.randomUUID(), ctx.workspace, current.id, current.revision + 1, kind, roleNames[role], note, now, JSON.stringify({ stage: current.stage, before: current, after: next })),
  ];
  if (extra) statements.push(extra);
  const result = await ctx.db.batch(statements);
  if (!result[0].meta.changes) throw new DomainError("किसी और ने यह आवेदन बदला है। ताज़ा जानकारी लोड करके फिर प्रयास करें।", 409);
  return { ...next, id: current.id, reference: current.reference, createdAt: current.createdAt, revision: current.revision + 1 };
}
