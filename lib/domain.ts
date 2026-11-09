export const STAGES = ["documents", "field", "review", "decision"] as const;
export type Stage = typeof STAGES[number];
export type Role = "coordinator" | "reviewer" | "officer";
export type Status = "pending" | "returned" | "approved" | "rejected";
export const stageNames: Record<Stage, string> = { documents: "दस्तावेज़ जाँच", field: "खेत सत्यापन", review: "अधिकारी समीक्षा", decision: "अंतिम निर्णय" };
export const roleNames: Record<Role, string> = { coordinator: "कृषि समन्वयक", reviewer: "समीक्षा अधिकारी", officer: "निर्णय अधिकारी" };
export const statusNames: Record<Status, string> = { pending: "प्रक्रिया में", returned: "सुधार के लिए वापस", approved: "स्वीकृत · डेमो", rejected: "अस्वीकृत · डेमो" };
export type CaseData = {
  name: string; village: string; panchayat: string; phone: string; crop: string; area: number;
  unit: "हेक्टेयर"; source: "helpdesk" | "whatsapp" | "phone"; purpose: string;
  stage: Stage; status: Status; evidence: string; fieldNote: string; observedArea: number | null;
  reviewNote: string; decisionNote: string; returnReason: string; documentsChecked: boolean;
  consent: boolean; dueDate: string; district: string; block: string;
};
export type CaseRecord = CaseData & { id: string; reference: string; revision: number; createdAt: string };
export type CaseEvent = { id: string; case_id: string; revision: number; kind: string; actor: string; note: string; created_at: string; snapshot?: string | null };
export type Attachment = { id: string; case_id: string; name: string; content_type: string; size: number; created_at: string };
export type Callback = { id: string; name: string; phone: string; village: string; note: string; status: string; created_at: string };
export class DomainError extends Error { status: number; constructor(message: string, status = 400) { super(message); this.status = status; } }
export function canEdit(role: Role, stage: Stage) {
  return (stage === "documents" || stage === "field") ? role === "coordinator" : stage === "review" ? role === "reviewer" : role === "officer";
}
export function priority(c: CaseRecord, now = new Date()) {
  const days = Math.ceil((Date.parse(c.dueDate + "T18:00:00+05:30") - now.getTime()) / 86400000);
  return { days, level: days < 0 ? "overdue" : days <= 2 ? "urgent" : "normal", label: days < 0 ? `${Math.abs(days)} दिन से लंबित` : days === 0 ? "आज ध्यान दें" : `${days} दिन बाकी` };
}
export type ActionInput = { action: "advance" | "return" | "approve" | "reject" | "resubmit"; note: string; evidence?: string; documentsChecked?: boolean; fieldNote?: string; observedArea?: number | null; reviewNote?: string };
export function transition(current: CaseData, role: Role, input: ActionInput): CaseData {
  if (!input.note?.trim() || input.note.length > 4000) throw new DomainError("कार्यवाही का कारण लिखें (अधिकतम 4000 अक्षर)।");
  if (current.status === "approved" || current.status === "rejected") throw new DomainError("इस आवेदन का निर्णय हो चुका है।", 409);
  if (input.action === "resubmit") {
    if (role !== "coordinator") throw new DomainError("पुनः प्रस्तुत करने के लिए समन्वयक भूमिका चुनें।", 403);
    if (current.status !== "returned") throw new DomainError("केवल वापस किया गया आवेदन पुनः प्रस्तुत हो सकता है।");
    if (!input.evidence?.trim()) throw new DomainError("सुधार का विवरण या दस्तावेज़ का पाठ जोड़ें।");
    return { ...current, status: "pending", evidence: current.evidence + "\n\nसुधार: " + input.evidence.trim(), returnReason: "", documentsChecked: current.stage === "documents" ? false : current.documentsChecked };
  }
  if (current.status !== "pending") throw new DomainError("पहले सुधार जोड़कर आवेदन पुनः प्रस्तुत करें।", 409);
  if (!canEdit(role, current.stage)) throw new DomainError("इस चरण की कार्यवाही के लिए सही डेमो भूमिका चुनें।", 403);
  const next = { ...current };
  if (typeof input.evidence === "string") next.evidence = input.evidence.slice(0, 12000);
  if (typeof input.documentsChecked === "boolean") next.documentsChecked = input.documentsChecked;
  if (typeof input.fieldNote === "string") next.fieldNote = input.fieldNote.slice(0, 4000);
  if (input.observedArea !== undefined) {
    if (input.observedArea !== null && (!Number.isFinite(input.observedArea) || input.observedArea <= 0 || input.observedArea > 100)) throw new DomainError("सत्यापित रकबा 0 से अधिक और 100 हेक्टेयर तक लिखें।");
    next.observedArea = input.observedArea;
  }
  if (typeof input.reviewNote === "string") next.reviewNote = input.reviewNote.slice(0, 4000);
  if (input.action === "return") return { ...next, status: "returned", returnReason: input.note.trim() };
  if (input.action === "approve" || input.action === "reject") {
    if (current.stage !== "decision" || role !== "officer") throw new DomainError("अंतिम निर्णय केवल निर्णय अधिकारी के चरण में संभव है।", 403);
    return { ...next, status: input.action === "approve" ? "approved" : "rejected", decisionNote: input.note.trim() };
  }
  if (input.action !== "advance") throw new DomainError("कार्यवाही मान्य नहीं है।");
  if (current.stage === "documents" && (!next.documentsChecked || !next.evidence.trim())) throw new DomainError("दस्तावेज़ का विवरण और मानवीय जाँच की पुष्टि आवश्यक है।");
  if (current.stage === "field" && (!next.fieldNote.trim() || next.observedArea === null)) throw new DomainError("स्थल जाँच टिप्पणी और सत्यापित रकबा भरें।");
  if (current.stage === "review" && !next.reviewNote.trim()) throw new DomainError("समीक्षा टिप्पणी लिखें; अंतर हो तो उसका समाधान बताएँ।");
  if (current.stage === "decision") throw new DomainError("स्वीकृत, अस्वीकृत या वापस करने का विकल्प चुनें।");
  return { ...next, stage: STAGES[STAGES.indexOf(current.stage) + 1] };
}
export const SOURCES = [
  { id: "DBT-FAQ", title: "बिहार कृषि DBT · सत्यापन और दस्तावेज़", url: "https://dbtagriculture.bihar.gov.in/", note: "योजना के अनुसार दस्तावेज़ और अधिकारी स्तर बदलते हैं।" },
  { id: "DEMO-POLICY", title: "डेमो प्रक्रिया · सीमाएँ", url: "/guide", note: "प्रदर्शन के चार चरण; कोई सरकारी पात्रता नियम, राशि या भुगतान निर्धारित नहीं करता।" },
];
export type Assistance = { summary: string; checks: { text: string; source: string }[]; questions: string[]; draft: string; provider: string; warning: string };
export function ruleAssistance(c: CaseData, language: 'hi' | 'en' = 'hi'): Assistance {
  if (language === 'en') {
    const checks = [{ text: `Claimed area: ${c.area} hectares. This is the applicant's statement, not a verified finding.`, source: 'Application' }];
    checks.push({ text: c.evidence.trim() ? 'Evidence text is available. Check it against the original records and current scheme notification.' : 'No evidence text is recorded. Review the originals and record the details.', source: 'Evidence details' });
    if (c.observedArea !== null && Math.abs(c.area - c.observedArea) > 0.001) checks.push({ text: `Claimed area (${c.area} ha) differs from observed area (${c.observedArea} ha). Record the explanation.`, source: 'Application + field verification' });
    return { summary: `The ${c.crop} assistance request is at the ${c.stage} stage.`, checks, questions: ['Do the original records support the stated details?', 'Have missing evidence and any area discrepancy been resolved?'], draft: `Draft for review: claimed area is ${c.area} hectares. Observed area: ${c.observedArea ?? 'not recorded'}. Review the original evidence and current notification before recording a reasoned decision.`, provider: 'rules', warning: 'Rules-based assistance, not live AI. The officer decides.' };
  }
  const checks = [{ text: `आवेदित रकबा ${c.area} हेक्टेयर है। यह आवेदक का कथन है।`, source: "आवेदन" }];
  if (!c.evidence.trim()) checks.push({ text: "दस्तावेज़ का पाठ उपलब्ध नहीं है। मूल दस्तावेज़ देखकर विवरण जोड़ें।", source: "दस्तावेज़ विवरण" });
  else checks.push({ text: "दस्तावेज़ विवरण उपलब्ध है; मूल अभिलेख से मिलान और योजना-विशिष्ट जाँच अधिकारी करेगा।", source: "दस्तावेज़ विवरण" });
  if (c.observedArea !== null && Math.abs(c.observedArea - c.area) > 0.001) checks.push({ text: `आवेदन (${c.area} ha) और स्थल जाँच (${c.observedArea} ha) में अंतर है। स्पष्टीकरण दर्ज करें।`, source: "आवेदन + स्थल जाँच" });
  if (c.stage === "field" && !c.fieldNote) checks.push({ text: "स्थल निरीक्षण अभी दर्ज नहीं है। फोटो से नुकसान की स्वतः पुष्टि नहीं होती।", source: "स्थल जाँच" });
  const questions = c.stage === "documents" ? ["क्या उपलब्ध भूमि/खेती के प्रमाण मूल अभिलेख से मिलते हैं?", "चुनी हुई योजना की वर्तमान अधिसूचना और क्षेत्र की पुष्टि हुई?"] : c.stage === "field" ? ["निरीक्षण में कितना रकबा मिला और किस इकाई में?", "क्या दर्ज टिप्पणियाँ और उपलब्ध साक्ष्य आपस में मेल खाते हैं?"] : ["क्या रकबे के अंतर और अधूरे अभिलेखों का समाधान दर्ज है?", "क्या निष्कर्ष उपलब्ध साक्ष्य और लागू अधिसूचना से समर्थित है?"];
  return { summary: `${c.name} का ${c.village} से ${c.crop} क्षति संबंधी डेमो आवेदन ${stageNames[c.stage]} चरण में है।`, checks, questions,
    draft: c.stage === "field" ? `स्थल जाँच मसौदा: ${c.fieldNote || "स्थल निरीक्षण का विवरण अभी उपलब्ध नहीं है।"} सत्यापित रकबा: ${c.observedArea ?? "दर्ज करना बाकी"} हेक्टेयर। अंतिम जाँच अधिकारी द्वारा आवश्यक है।` : `समीक्षा मसौदा: ${c.crop} क्षति का दावा ${c.area} हेक्टेयर के लिए है। ${c.observedArea !== null ? `स्थल जाँच में ${c.observedArea} हेक्टेयर दर्ज है।` : "स्थल जाँच का रकबा दर्ज नहीं है।"} उपलब्ध अभिलेख और वर्तमान अधिसूचना देखकर कारण सहित निर्णय दर्ज करें।`, provider: "rules", warning: "नियम-आधारित सहायता · लाइव AI नहीं। अंतिम निर्णय अधिकारी का है।" };
}
