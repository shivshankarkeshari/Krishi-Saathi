import { z } from "zod";
import { context, body, json, errorResponse, getCase, getRole, commit } from "../../../lib/server";
import { transition, DomainError } from "../../../lib/domain";
const schema = z.object({ id: z.string().min(1).max(100), revision: z.number().int().positive(), action: z.enum(["advance", "return", "approve", "reject", "resubmit"]), note: z.string().trim().min(1).max(4000), evidence: z.string().max(12000).optional(), documentsChecked: z.boolean().optional(), fieldNote: z.string().max(4000).optional(), observedArea: z.number().positive().max(100).nullable().optional(), reviewNote: z.string().max(4000).optional() });
export async function POST(request: Request) { try {
  const ctx = await context(); const parsed = schema.safeParse(await body(request)); if (!parsed.success) return json({ error: "कार्यवाही का विवरण और कारण जाँचें।" }, 400);
  const input = parsed.data; const current = await getCase(ctx, input.id); if (input.revision !== current.revision) throw new DomainError("आवेदन बदल गया है। ताज़ा जानकारी लोड करें।", 409);
  const role = await getRole(ctx); const next = transition(current, role, input);
  return json({ case: await commit(ctx, current, next, input.action, input.note, role) });
} catch (e) { return errorResponse(e); } }
