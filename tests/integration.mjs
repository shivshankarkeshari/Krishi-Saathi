import assert from 'node:assert/strict';
const base = process.env.BASE_URL || 'http://127.0.0.1:5173';
async function call(path, payload, status = 200, method = 'POST') {
  const r = await fetch(base + path, payload === undefined ? {} : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const data = await r.json(); assert.equal(r.status, status, path + ': ' + JSON.stringify(data)); return data;
}
let w = await call('/api/workspace'); assert.ok(w.cases.length >= 6);
await call('/api/workspace', { role: 'coordinator' });
const payload = { requestKey: crypto.randomUUID(), name: 'एकीकरण परीक्षण', village: 'परीक्षण गाँव', phone: '9000000088', crop: 'धान', area: 1.2, source: 'phone', consent: true, purpose: 'काल्पनिक बाढ़ क्षति; स्वचालित परीक्षण', evidence: 'नमूना भूमि अभिलेख: 1.2 हेक्टेयर' };
let c = (await call('/api/cases', payload, 201)).case;
assert.equal((await call('/api/cases', payload, 201)).case.id, c.id);
await call('/api/cases', { ...payload, requestKey: crypto.randomUUID(), consent: false }, 400);
const badOrigin = await fetch(base + '/api/workspace', { method: 'POST', headers: { Origin: 'https://untrusted.example', 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'officer' }) }); assert.equal(badOrigin.status, 403);
const assist = await call('/api/assist', { id: c.id }); assert.ok(assist.assistance.summary); assert.ok(assist.assistance.provider);
await call('/api/action', { id: c.id, revision: c.revision, action: 'approve', note: 'अनुमति नहीं' }, 403);
// Persist and download actual evidence; revision/history must advance atomically.
const form = new FormData(); form.set('id', c.id); form.set('revision', String(c.revision)); form.set('file', new Blob(['नया परीक्षण अभिलेख'], { type: 'text/plain' }), 'evidence.txt');
const uploaded = await fetch(base + '/api/upload', { method: 'POST', body: form }); const doc = await uploaded.json(); assert.equal(uploaded.status, 200, JSON.stringify(doc));
const downloaded = await fetch(base + '/api/document?id=' + doc.id); assert.match(await downloaded.text(), /परीक्षण अभिलेख/); assert.match(downloaded.headers.get('content-disposition'), /attachment/);
await call('/api/document?id=missing', undefined, 404);
const otherWorkspace = { 'oai-authenticated-user-id': 'integration-isolation-probe', 'oai-authenticated-user-email': 'fictional@example.invalid' };
const foreignDoc = await fetch(base + '/api/document?id=' + doc.id, { headers: otherWorkspace });
// In dev, the Sites mock strips identity headers. In the built Docker Worker,
// these simulate a different identity asserted by the trusted hosting proxy.
if (process.env.TEST_PROXY_IDENTITY === '1') assert.equal(foreignDoc.status, 404);

w = await call('/api/workspace'); c = w.cases.find(x => x.id === c.id); assert.equal(c.revision, 2);
const action = { id: c.id, revision: c.revision, action: 'advance', note: 'दस्तावेज़ जाँच पूरी', documentsChecked: true };
const race = await Promise.all([fetch(base + '/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action) }), fetch(base + '/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action) })]);
assert.deepEqual(race.map(x => x.status).sort(), [200, 409]);
w = await call('/api/workspace'); c = w.cases.find(x => x.id === c.id); assert.equal(c.stage, 'field');
c = (await call('/api/action', { id: c.id, revision: c.revision, action: 'return', note: 'साफ़ भू-अभिलेख दें' })).case;
assert.equal(c.status, 'returned');
c = (await call('/api/action', { id: c.id, revision: c.revision, action: 'resubmit', note: 'सुधार की पुष्टि', evidence: 'नई साफ़ प्रति उपलब्ध' })).case;
assert.equal(c.stage, 'field'); assert.match(c.evidence, /नई साफ़ प्रति/);
c = (await call('/api/action', { id: c.id, revision: c.revision, action: 'advance', note: 'निरीक्षण हुआ', fieldNote: 'डेमो स्थल निरीक्षण पूरा', observedArea: 1.1 })).case;
await call('/api/action', { id: c.id, revision: c.revision, action: 'advance', note: 'गलत भूमिका', reviewNote: 'जाँच' }, 403);
await call('/api/workspace', { role: 'reviewer' });
c = (await call('/api/action', { id: c.id, revision: c.revision, action: 'advance', note: 'अंतर की समीक्षा', reviewNote: 'नमूना साक्ष्य से अंतर का स्पष्टीकरण दर्ज' })).case;
await call('/api/workspace', { role: 'officer' });
c = (await call('/api/action', { id: c.id, revision: c.revision, action: 'approve', note: 'काल्पनिक साक्ष्य पर डेमो निर्णय; भुगतान नहीं' })).case;
assert.equal(c.status, 'approved');
await call('/api/action', { id: c.id, revision: c.revision, action: 'reject', note: 'बंद आवेदन' }, 409);
const callback = await call('/api/callbacks', { name: 'परीक्षण', village: 'गाँव', phone: '9000000088', note: 'मदद चाहिए', consent: true });
await call('/api/callbacks', { id: callback.id, status: 'completed' }, 200, 'PATCH');
w = await call('/api/workspace'); const history = w.events.filter(e => e.case_id === c.id);
assert.equal(history.length, c.revision); assert.equal(new Set(history.map(e => e.revision)).size, c.revision);
assert.ok(history.every(e => e.snapshot));
const snapshot = JSON.parse(history.find(e => e.kind === 'approve').snapshot);
assert.equal(snapshot.before.status, 'pending'); assert.equal(snapshot.after.status, 'approved');
const needsNumber = await call('/api/chat', { message: 'hello', language: 'en' });
assert.equal(needsNumber.needsReference, true); assert.equal(needsNumber.toolCalls.length, 0);
const statusChat = await call('/api/chat', { message: 'What is my status?', reference: c.reference, language: 'en' });
assert.equal(statusChat.toolCalls[0].name, 'get_application_details');
assert.equal(statusChat.application.revision, c.revision); assert.match(statusChat.answer, /Approved/);
const unrelated = await call('/api/chat', { message: 'What is the capital of France?', reference: c.reference, language: 'en' });
assert.match(unrelated.answer, /only help with this application/);
const foreignChat = await fetch(base + '/api/chat', { method: 'POST', headers: { ...otherWorkspace, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'status', reference: c.reference, language: 'en' }) });
if (process.env.TEST_PROXY_IDENTITY === '1') assert.equal(foreignChat.status, 404);
await call('/api/chat', { message: 'status KS-DEMO-NOCASE', language: 'en' }, 404);

assert.ok(w.callbacks.some(x => x.id === callback.id && x.status === 'completed'));
await call('/api/workspace', { role: 'coordinator' });
const registrationPayload = { ...payload, requestKey: crypto.randomUUID(), action: 'register', language: 'en', source: 'helpdesk', confirmed: true };
await call('/api/chat', { ...registrationPayload, confirmed: false }, 400);
await call('/api/chat', { ...registrationPayload, consent: false }, 400);
const registration = await call('/api/chat', registrationPayload);
assert.equal(registration.toolCalls[0].name, 'register_application');
assert.equal(registration.toolCalls[1].name, 'get_application_details');
assert.equal(registration.application.stage, 'documents');
assert.equal((await call('/api/chat', registrationPayload)).application.id, registration.application.id);
const registeredStatus = await call('/api/chat', { message: 'What is the status?', reference: registration.reference, language: 'en' });
assert.match(registeredStatus.answer, /Document review/);
console.log('PASS: intake, consent, idempotency, CSRF, assistance, uploads, concurrency, correction, roles, decisions, snapshots, callback queue, application lookup and confirmed chat registration.');
console.log('Created fictional integration case:', c.reference);
