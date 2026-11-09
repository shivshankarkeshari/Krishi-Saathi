export function extractReference(message) {
  const normalized = message.replace(/[०-९]/g, digit => String('०१२३४५६७८९'.indexOf(digit))).toUpperCase();
  const exact = normalized.match(/\bKS[\s-]*DEMO[\s-]*([A-Z0-9]{4,12})\b/);
  if (exact) return 'KS-DEMO-' + exact[1];
  const spoken = normalized.match(/के\s*एस\s*डेमो[\s-]*([A-Z0-9]{4,12})\b/);
  return spoken ? 'KS-DEMO-' + spoken[1] : null;
}
const labels = {
  hi: { stages: { documents: 'दस्तावेज़ जाँच', field: 'खेत सत्यापन', review: 'अधिकारी समीक्षा', decision: 'अंतिम निर्णय' }, statuses: { pending: 'प्रक्रिया में', returned: 'सुधार के लिए वापस', approved: 'स्वीकृत · डेमो', rejected: 'अस्वीकृत · डेमो' } },
  en: { stages: { documents: 'Document review', field: 'Field verification', review: 'Officer scrutiny', decision: 'Final decision' }, statuses: { pending: 'In progress', returned: 'Returned for correction', approved: 'Approved · demo', rejected: 'Rejected · demo' } },
};
export function missingReference(language) {
  return language === 'en' ? 'Please share your application number, for example KS-DEMO-1041. I will look up that application before answering.' : 'कृपया अपना आवेदन नंबर बताएँ, जैसे KS-DEMO-1041। उत्तर देने से पहले उसी आवेदन का रिकॉर्ड देखूँगा।';
}
export function applicationAnswer(details, question, language = 'hi') {
  const en = language === 'en'; const c = details.application; const l = labels[language] || labels.hi;
  const q = question.toLowerCase();
  const result = (answer, sources = ['application']) => ({ answer, sources, provider: 'application-tool' });
  if (/weather|capital|recipe|poem|joke|write code|python|politic|मौसम|राजधानी|चुटकुल|कविता|रेसिपी/.test(q)) return result(en ? 'I can only help with this application: its status, documents, corrections, verification and recorded decision.' : 'मैं केवल इस आवेदन की स्थिति, दस्तावेज़, सुधार, सत्यापन और दर्ज निर्णय पर मदद कर सकता हूँ।');
  if (/payment|money|amount|bank|पैस|भुगतान|राशि|बैंक/.test(q)) return result(en ? `${c.reference}: government payment data is not connected. A demo approval is not a payment confirmation. No amount or payment date can be confirmed from this record.` : `${c.reference}: सरकारी भुगतान की जानकारी जुड़ी नहीं है। डेमो स्वीकृति भुगतान की पुष्टि नहीं है। इस रिकॉर्ड से राशि या भुगतान तिथि की पुष्टि नहीं कर सकता।`);
  if (/return|correct|missing|वापस|सुधार|कमी|अधूर|क्यों|why/.test(q)) {
    const reason = c.returnReason || (c.status === 'rejected' ? c.decisionNote : '');
    if (reason) return result(en ? `Recorded reason: ${reason}\nAsk an assistant to add the requested correction to this same application and resubmit it. This does not create a second application.` : `दर्ज कारण: ${reason}\nसहायक से इसी आवेदन में माँगा गया सुधार जोड़कर पुनः प्रस्तुत कराएँ। नया आवेदन बनाने की ज़रूरत नहीं है।`, ['application', 'history']);
    return result(en ? `There is no current return reason recorded. Current status: ${l.statuses[c.status]}; stage: ${l.stages[c.stage]}. I cannot invent a reason for a delay.` : `अभी सुधार के लिए वापस करने का कारण दर्ज नहीं है। स्थिति: ${l.statuses[c.status]}; चरण: ${l.stages[c.stage]}। देरी का कारण रिकॉर्ड में न हो तो बता नहीं सकता।`);
  }
  if (/history|happened|timeline|last update|इतिहास|हुआ|पिछल|कार्यवाही/.test(q)) {
    const history = details.history.slice(0, 5).map(e => `${e.created_at.slice(0, 10)} — ${e.note}`).join('\n');
    return result((en ? 'Latest recorded actions:\n' : 'हाल की दर्ज कार्यवाही:\n') + history, ['history']);
  }
  if (/document|evidence|submitted|shared|दस्तावेज|दस्तावेज़|अभिलेख|साक्ष्य|जमा|भेजा/.test(q)) {
    const names = details.documents.map(d => d.name).join(', ');
    return result(en ? `Attached files: ${names || 'none recorded'}.\nRecorded evidence: ${c.evidence || 'No evidence text recorded.'}\nUploaded PDFs/photos are not automatically verified.` : `जुड़ी फ़ाइलें: ${names || 'अभी कोई फ़ाइल नहीं'}।\nदर्ज साक्ष्य: ${c.evidence || 'साक्ष्य का पाठ दर्ज नहीं है।'}\nPDF/फोटो की स्वतः पुष्टि नहीं होती।`, ['documents', 'application']);
  }
  if (/area|hectare|field|inspect|रकबा|हेक्टेयर|खेत|निरीक्षण/.test(q)) return result(en ? `Claimed area: ${c.area} hectares. Recorded observed area: ${c.observedArea ?? 'not recorded'}${c.observedArea === null ? '' : ' hectares'}.\nField note: ${c.fieldNote || 'No field note recorded.'}` : `दावा: ${c.area} हेक्टेयर। जाँच में दर्ज रकबा: ${c.observedArea === null ? 'अभी नहीं दर्ज' : c.observedArea + ' हेक्टेयर'}।\nस्थल टिप्पणी: ${c.fieldNote || 'अभी दर्ज नहीं है।'}`, ['application', 'field']);
  if (/when|deadline|time|कब|तारीख|समय|दिन/.test(q)) return result(en ? `Internal demo target: ${c.dueDate}. This is not a statutory deadline or a promise of approval. Current stage: ${l.stages[c.stage]}.` : `आंतरिक डेमो लक्ष्य: ${c.dueDate}। यह सरकारी समय-सीमा या स्वीकृति का वादा नहीं है। वर्तमान चरण: ${l.stages[c.stage]}।`);
  if (/approv|reject|decision|स्वीकृत|अस्वीकृत|निर्णय/.test(q)) return result(en ? `Status: ${l.statuses[c.status]}.\nRecorded decision reason: ${c.decisionNote || 'No final decision recorded.'}\nThis application is a demo, not an official sanction.` : `स्थिति: ${l.statuses[c.status]}।\nनिर्णय का कारण: ${c.decisionNote || 'अंतिम निर्णय अभी दर्ज नहीं है।'}\nयह डेमो आवेदन है, सरकारी स्वीकृति नहीं।`, ['application', 'history']);
  if (/status|stage|next|who|pending|update|स्थिति|चरण|अगला|कहाँ|कौन|लंबित/.test(q) || /^ks-demo-/i.test(q.trim())) return result(en ? `${c.reference}\nStatus: ${l.statuses[c.status]}\nCurrent stage: ${l.stages[c.stage]}\n${c.status === 'returned' ? 'Correction needed: ' + c.returnReason : c.status === 'pending' ? 'The responsible worker must complete this stage. No final outcome is confirmed.' : 'Recorded reason: ' + c.decisionNote}` : `${c.reference}\nस्थिति: ${l.statuses[c.status]}\nवर्तमान चरण: ${l.stages[c.stage]}\n${c.status === 'returned' ? 'ज़रूरी सुधार: ' + c.returnReason : c.status === 'pending' ? 'संबंधित कर्मचारी को यह चरण पूरा करना है। अंतिम परिणाम की पुष्टि नहीं है।' : 'दर्ज कारण: ' + c.decisionNote}`);
  if (!/application|case|crop|आवेदन|फसल|मेरा|मेरी|मेरे|इसका|इसमें/.test(q)) return result(en ? 'Please ask about this application: status, documents, corrections, field verification or the recorded decision.' : 'इस आवेदन की स्थिति, दस्तावेज़, सुधार, खेत सत्यापन या दर्ज निर्णय के बारे में पूछें।');
  return null; // A scoped evidence question can use the model after the lookup tool.
}
