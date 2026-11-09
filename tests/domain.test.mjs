import test from 'node:test';
import assert from 'node:assert/strict';
import { transition, canEdit, ruleAssistance, priority } from '../lib/domain.ts';
const base = { name: 'परीक्षण किसान', village: 'परीक्षण गाँव', panchayat: 'परीक्षण', phone: '9000000099', crop: 'धान', area: 1.5, unit: 'हेक्टेयर', source: 'helpdesk', purpose: 'बाढ़ क्षति', stage: 'documents', status: 'pending', evidence: 'भूमि का नमूना अभिलेख', fieldNote: '', observedArea: null, reviewNote: '', decisionNote: '', returnReason: '', documentsChecked: false, consent: true, dueDate: '2026-11-10', district: 'वैशाली', block: 'राघोपुर' };
test('full journey requires evidence, field verification, review and officer decision', () => {
  assert.throws(() => transition(base, 'coordinator', { action: 'advance', note: 'जाँच पूरी' }));
  let c = transition(base, 'coordinator', { action: 'advance', note: 'अभिलेख देखा', documentsChecked: true }); assert.equal(c.stage, 'field');
  assert.throws(() => transition(c, 'coordinator', { action: 'advance', note: 'आगे भेजें' }));
  c = transition(c, 'coordinator', { action: 'advance', note: 'जाँच की', observedArea: 1.1, fieldNote: 'प्रभावित रकबा कम मिला' });
  assert.equal(c.stage, 'review');
  assert.throws(() => transition(c, 'coordinator', { action: 'advance', note: 'गलत भूमिका' }), e => e.status === 403);
  c = transition(c, 'reviewer', { action: 'advance', note: 'रकबे के अंतर पर विचार किया', reviewNote: 'अंतर का स्पष्टीकरण संलग्न' });
  assert.equal(c.stage, 'decision');
  c = transition(c, 'officer', { action: 'approve', note: 'साक्ष्य आधारित डेमो निर्णय' });
  assert.equal(c.status, 'approved'); assert.throws(() => transition(c, 'officer', { action: 'return', note: 'फिर बदलें' }), e => e.status === 409);
});
test('return and resubmission retain evidence and resume at the returning stage', () => {
  const c = { ...base, stage: 'review', evidence: 'मूल साक्ष्य', documentsChecked: true };
  const returned = transition(c, 'reviewer', { action: 'return', note: 'साफ़ अभिलेख दें' });
  assert.equal(returned.status, 'returned');
  assert.throws(() => transition(returned, 'reviewer', { action: 'resubmit', note: 'सुधार', evidence: 'नई प्रति' }), e => e.status === 403);
  const result = transition(returned, 'coordinator', { action: 'resubmit', note: 'सुधार मिला', evidence: 'नई प्रति' });
  assert.equal(result.stage, 'review'); assert.equal(result.status, 'pending'); assert.match(result.evidence, /मूल साक्ष्य/); assert.match(result.evidence, /नई प्रति/);
});
test('decision cannot skip review, requires reason and officer role', () => {
  assert.throws(() => transition(base, 'officer', { action: 'approve', note: 'सीधी स्वीकृति' }));
  assert.throws(() => transition({ ...base, stage: 'decision' }, 'officer', { action: 'reject', note: ' ' }));
  const result = transition({ ...base, stage: 'decision' }, 'officer', { action: 'reject', note: 'आवश्यक साक्ष्य उपलब्ध नहीं' }); assert.equal(result.status, 'rejected');
});
test('invalid observed area and empty corrections are rejected', () => {
  for (const area of [0, -1, Infinity, NaN, 101]) assert.throws(() => transition({ ...base, stage: 'field' }, 'coordinator', { action: 'advance', note: 'जाँच', fieldNote: 'जाँच', observedArea: area }));
  assert.throws(() => transition({ ...base, status: 'returned' }, 'coordinator', { action: 'resubmit', note: 'सुधार', evidence: ' ' }));
});
test('assistance labels fallback and flags discrepancy without eligibility inference', () => {
  const result = ruleAssistance({ ...base, stage: 'review', observedArea: 1.1 });
  assert.equal(result.provider, 'rules'); assert.match(result.warning, /लाइव AI नहीं/); assert.ok(result.checks.some(c => c.text.includes('अंतर'))); assert.ok(!('decision' in result));
});
test('roles restrict stage actions', () => { assert.ok(canEdit('coordinator', 'field')); assert.ok(!canEdit('officer', 'documents')); assert.ok(canEdit('reviewer', 'review')); assert.ok(canEdit('officer', 'decision')); });
test('priority uses explicit Indian timezone instead of host timezone', () => {
  const result = priority({ ...base, dueDate: '2026-11-09' }, new Date('2026-11-09T08:00:00Z')); assert.equal(result.level, 'urgent');
  assert.equal(priority({ ...base, dueDate: '2026-11-06' }, new Date('2026-11-09T08:00:00Z')).level, 'overdue');
});
