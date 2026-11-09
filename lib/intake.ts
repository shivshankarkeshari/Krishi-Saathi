import { z } from "zod";
import { record, type Context } from "./server";
import type { CaseData } from "./domain";
export const intakeSchema = z.object({ requestKey: z.string().uuid(), name: z.string().trim().min(2).max(100), village: z.string().trim().min(2).max(100), phone: z.string().regex(/^[6-9]\d{9}$/), crop: z.enum(["धान", "मक्का", "गेहूँ", "अन्य"]), area: z.number().positive().max(100), source: z.enum(["helpdesk", "whatsapp", "phone"]), consent: z.literal(true), purpose: z.string().trim().min(3).max(2000), evidence: z.string().max(12000).default("") });
export async function registerApplicationTool(ctx: Context, input: z.infer<typeof intakeSchema>) {
  const id = crypto.randomUUID(); const now = new Date().toISOString();
  const data: CaseData = { ...input, panchayat: input.village, district: "वैशाली", block: "राघोपुर", unit: "हेक्टेयर", stage: "documents", status: "pending", fieldNote: "", observedArea: null, reviewNote: "", decisionNote: "", returnReason: "", documentsChecked: false, dueDate: new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) };
  const reference = "KS-DEMO-" + id.slice(0, 6).toUpperCase();
  // One batch makes the new case and its first event atomic; duplicate requests reuse the original.
  await ctx.db.batch([
    ctx.db.prepare("INSERT OR IGNORE INTO cases(id, workspace, reference, data, revision, created_at, request_key) VALUES (?, ?, ?, ?, 1, ?, ?)").bind(id, ctx.workspace, reference, JSON.stringify(data), now, input.requestKey),
    ctx.db.prepare("INSERT INTO events(id, workspace, case_id, revision, kind, actor, note, created_at, snapshot) SELECT ?, ?, ?, 1, 'created', 'सहायता केंद्र / किसान डेमो', ?, ?, ? WHERE changes() = 1").bind(crypto.randomUUID(), ctx.workspace, id, "पढ़कर पुष्टि और सहमति के बाद डेमो अनुरोध दर्ज। सरकारी आवेदन जमा नहीं हुआ है।", now, JSON.stringify({ stage: "documents", before: null, after: data })),
  ]);
  const row = await ctx.db.prepare("SELECT * FROM cases WHERE workspace = ? AND request_key = ?").bind(ctx.workspace, input.requestKey).first();
  return record(row as Parameters<typeof record>[0]);
}
