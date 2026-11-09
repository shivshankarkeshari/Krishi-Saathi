import type { Context } from './server';
import { getCase } from './server';
import { DomainError } from './domain';
export async function getApplicationDetailsTool(ctx: Context, reference: string) {
  const row = await ctx.db.prepare('SELECT id FROM cases WHERE workspace = ? AND reference = ?').bind(ctx.workspace, reference).first<{ id: string }>();
  if (!row) throw new DomainError('इस कार्यक्षेत्र में यह आवेदन नहीं मिला। पूरा आवेदन नंबर जाँचें।', 404);
  const application = await getCase(ctx, row.id);
  const [events, documents] = await Promise.all([
    ctx.db.prepare('SELECT kind, note, actor, created_at, revision FROM events WHERE workspace = ? AND case_id = ? ORDER BY revision DESC LIMIT 12').bind(ctx.workspace, application.id).all(),
    ctx.db.prepare('SELECT id, name, created_at FROM documents WHERE workspace = ? AND case_id = ?').bind(ctx.workspace, application.id).all(),
  ]);
  // Contact details are unnecessary for application Q&A and never sent to the model.
  const { phone: _phone, ...safe } = application;
  return { application: safe, history: events.results, documents: documents.results };
}
