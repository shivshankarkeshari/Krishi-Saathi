const fields = { name: 'नाम', village: 'गाँव', phone: 'संपर्क मोबाइल', crop: 'फसल / रकबा', area: 'आवेदन का रकबा', purpose: 'आवेदन का उद्देश्य', evidence: 'दस्तावेज़ से पढ़ा गया विवरण', documentsChecked: 'दस्तावेज़ जाँच की पुष्टि', fieldNote: 'स्थल निरीक्षण टिप्पणी', observedArea: 'सत्यापित रकबा (हेक्टेयर)', reviewNote: 'समीक्षा टिप्पणी', returnReason: 'सुधार चाहिए', decisionNote: 'कार्यवाही का कारण' };
export function historyDetails(event) {
  if (!event.snapshot) return null;
  try {
    const snapshot = JSON.parse(event.snapshot); if (!snapshot?.after || !['documents','field','review','decision'].includes(snapshot.stage)) return null;
    const relevant = event.kind === 'created' ? ['name','village','phone','crop','area','purpose','evidence'] : snapshot.stage === 'documents' ? ['evidence','documentsChecked','returnReason'] : snapshot.stage === 'field' ? ['fieldNote','observedArea','returnReason'] : snapshot.stage === 'review' ? ['reviewNote','returnReason'] : ['decisionNote','returnReason'];
    for (const key of Object.keys(fields)) if (snapshot.before && JSON.stringify(snapshot.before[key]) !== JSON.stringify(snapshot.after[key]) && !relevant.includes(key)) relevant.push(key);
    return { stage: snapshot.stage, fields: relevant.map(key => ({ key, label: fields[key], before: snapshot.before?.[key] ?? null, after: snapshot.after[key] ?? null, changed: !!snapshot.before && snapshot.before[key] !== snapshot.after[key] })) };
  } catch { return null; }
}
