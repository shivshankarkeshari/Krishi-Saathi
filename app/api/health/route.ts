import { database, json } from "../../../lib/server";
export async function GET() { try { await database().prepare("SELECT id FROM workspaces LIMIT 1").first(); return json({ status: "ok", service: "krishi-saathi", demo: true }); } catch { return json({ status: "unavailable", hint: "Apply database migrations" }, 503); } }
