import { z } from "zod";
import type { CaseData, Assistance } from "./domain";
import { ruleAssistance, SOURCES } from "./domain";
import { compatibleAssistance } from "./openai-compatible.mjs";
export const assistSchema = z.object({ summary: z.string().min(1).max(2000), checks: z.array(z.object({ text: z.string().max(1200), source: z.enum(["आवेदन", "दस्तावेज़ विवरण", "स्थल जाँच", "समीक्षा", "DBT-FAQ", "DEMO-POLICY"]) })).max(8), questions: z.array(z.string().max(500)).max(5), draft: z.string().max(4000) });
import { outputSchema, instructions } from "./ai-contract.mjs";
export function aiContext(c: CaseData, language: "hi" | "en" = "hi") { return { responseLanguage: language, stage: c.stage, crop: c.crop, claimedAreaHa: c.area, observedAreaHa: c.observedArea, evidence: c.evidence.slice(0, 10000), fieldNote: c.fieldNote, reviewNote: c.reviewNote, sources: SOURCES }; }
export async function generateAssistance(c: CaseData, config: { AI_BRIDGE_URL?: string; AI_BRIDGE_TOKEN?: string; OLLAMA_URL?: string; OLLAMA_MODEL?: string; OPENAI_BASE_URL?: string; OPENAI_API_KEY?: string; OPENAI_MODEL?: string }, language: "hi" | "en" = "hi"): Promise<Assistance> {
  if (!config.OPENAI_BASE_URL && !config.AI_BRIDGE_URL && !config.OLLAMA_URL) return ruleAssistance(c, language);
  try {
    let output: unknown; let provider: string;
    if (config.OPENAI_BASE_URL) {
      const result = await compatibleAssistance(aiContext(c, language), config);
      output = result.output; provider = result.provider;
    } else if (config.AI_BRIDGE_URL) {
      const response = await fetch(config.AI_BRIDGE_URL.replace(/\/$/, "") + "/assist", { method: "POST", headers: { "Content-Type": "application/json", ...(config.AI_BRIDGE_TOKEN ? { Authorization: `Bearer ${config.AI_BRIDGE_TOKEN}` } : {}) }, body: JSON.stringify({ context: aiContext(c, language) }), signal: AbortSignal.timeout(65000) });
      if (!response.ok) throw new Error("bridge_unavailable"); const result = await response.json() as { output: unknown; provider: string }; output = result.output; provider = result.provider;
    } else {
      const model = config.OLLAMA_MODEL || "qwen3:4b";
      const response = await fetch(config.OLLAMA_URL!.replace(/\/$/, "") + "/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model, stream: false, think: false, format: outputSchema, options: { temperature: 0.1, num_predict: 1400 }, messages: [{ role: "system", content: instructions }, { role: "user", content: JSON.stringify(aiContext(c, language)) }] }), signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error("ollama_unavailable"); const result = await response.json() as { message: { content: string } }; output = JSON.parse(result.message.content); provider = "ollama:" + model;
    }
    return { ...assistSchema.parse(output), provider, warning: language === "en" ? "AI draft: verify against original evidence. The officer decides." : "AI मसौदा · मूल साक्ष्य से जाँचें। अंतिम निर्णय अधिकारी का है।" };
  } catch { return { ...ruleAssistance(c, language), warning: language === "en" ? "Model unavailable or invalid output. Showing rules-based assistance, not live AI." : "मॉडल उपलब्ध नहीं या उत्तर मान्य नहीं। अभी नियम-आधारित सहायता दिखाई गई है; लाइव AI नहीं।" }; }
}
