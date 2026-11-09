import type { CaseData, CaseRecord, Stage } from "./domain";
export function seedCases(): CaseRecord[] {
  const today = new Date();
  const date = (offset: number) => new Date(today.getTime() + offset * 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const people: [string, string, string, Stage, number, number | null, number][] = [
    ["रामेश्वर यादव", "बिशुनपुर", "धान", "documents", 1.2, null, -2], ["सुनीता देवी", "चाँदपुरा", "मक्का", "field", 0.8, null, 1],
    ["मोहन पासवान", "राघोपुर", "धान", "review", 1.5, 1.1, 2], ["रीना कुमारी", "बिशुनपुर", "मक्का", "decision", 0.6, 0.6, 3],
    ["अब्दुल रहमान", "चाँदपुरा", "धान", "documents", 1, null, 4], ["किरण देवी", "राघोपुर", "धान", "field", 0.4, null, 5],
  ];
  return people.map(([name, village, crop, stage, area, observedArea, due], i) => {
    const data: CaseData = { name, village, crop, stage, area, observedArea, unit: "हेक्टेयर", phone: "90000000" + String(10 + i), panchayat: village, district: "वैशाली", block: "राघोपुर", source: i % 2 ? "helpdesk" : "whatsapp", purpose: "बाढ़ से फसल क्षति सहायता · काल्पनिक उदाहरण", status: "pending", consent: true, dueDate: date(due), evidence: i === 0 ? "आवेदन में 1.2 हेक्टेयर धान की क्षति का कथन। भूमि अभिलेख का स्पष्ट पाठ अभी उपलब्ध नहीं है।" : `नमूना भूमि अभिलेख: ${name}, ग्राम ${village}, रकबा ${area} हेक्टेयर। यह काल्पनिक पाठ है; वास्तविक सरकारी अभिलेख नहीं।`, fieldNote: observedArea === null ? "" : `डेमो निरीक्षण में ${observedArea} हेक्टेयर प्रभावित क्षेत्र दर्ज किया गया। फोटो और मूल अभिलेख की पुष्टि आवश्यक।`, reviewNote: stage === "decision" ? "डेमो में आवेदन और निरीक्षण का रकबा समान है। वर्तमान अधिसूचना का वास्तविक सत्यापन इस डेमो का हिस्सा नहीं है।" : "", decisionNote: "", returnReason: "", documentsChecked: stage !== "documents" };
    return { ...data, id: `seed-${i + 1}`, reference: `KS-DEMO-${String(1041 + i)}`, revision: 1, createdAt: new Date(today.getTime() - (8 - i) * 86400000).toISOString() };
  });
}
