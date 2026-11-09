import test from 'node:test';
import assert from 'node:assert/strict';
import { applicationAnswer, extractReference, missingReference } from '../lib/application-chat.mjs';
import { historyDetails } from '../lib/history.mjs';
import { translateText } from '../lib/translations.mjs';
const details = { application: { reference: 'KS-DEMO-1041', revision: 3, stage: 'field', status: 'returned', returnReason: 'Clear land record needed', decisionNote: '', area: 1.2, observedArea: null, evidence: 'Recorded evidence', fieldNote: '', dueDate: '2026-11-19' }, history: [{ created_at: '2026-11-09', note: 'Returned for correction' }], documents: [{ name: 'land.pdf' }] };
test('application reference extraction is bounded and case-insensitive', () => { assert.equal(extractReference('check ks-demo-1041 please'), 'KS-DEMO-1041'); assert.equal(extractReference('show everything'), null); assert.equal(extractReference('के एस डेमो १०४१'), 'KS-DEMO-1041'); assert.equal(extractReference('KS DEMO 1041'), 'KS-DEMO-1041'); assert.match(missingReference('en'), /application number/); });
test('scoped answers use retrieved current status and correction reason', () => { const a = applicationAnswer(details, 'What is my status?', 'en'); assert.match(a.answer, /Returned for correction/); assert.match(a.answer, /Clear land record needed/); assert.equal(a.provider, 'application-tool'); assert.match(applicationAnswer(details, 'कौन से दस्तावेज़ हैं?', 'hi').answer, /land.pdf/); });
test('chat refuses general-purpose questions and does not invent payments', () => { assert.match(applicationAnswer(details, 'What is the capital of France?', 'en').answer, /only help with this application/); assert.match(applicationAnswer(details, 'When will I get payment?', 'en').answer, /not connected/); });
test('history snapshots retain earlier values and never fabricate legacy details', () => {
  assert.equal(historyDetails({ snapshot: null }), null); assert.equal(historyDetails({ snapshot: 'invalid' }), null);
  const h = historyDetails({ kind: 'advance', snapshot: JSON.stringify({ stage: 'field', before: { fieldNote: 'Earlier note', observedArea: null }, after: { fieldNote: 'New observation', observedArea: 1.1 } }) });
  const note = h.fields.find(f => f.key === 'fieldNote'); assert.equal(note.before, 'Earlier note'); assert.equal(note.after, 'New observation'); assert.equal(note.changed, true);
});
test('English UI translates labels and dynamic priority while preserving original data', () => {
  assert.equal(translateText('दस्तावेज़ जाँच', 'en'), 'Document review'); assert.equal(translateText('3 दिन बाकी', 'en'), '3 days left');
  assert.equal(translateText('रामेश्वर यादव · मूल टिप्पणी', 'en'), 'रामेश्वर यादव · मूल टिप्पणी'); assert.equal(translateText('दस्तावेज़ जाँच', 'hi'), 'दस्तावेज़ जाँच');
});

import { registrationIntent, intakeAnswer } from '../lib/intake-chat.mjs';
test('guided registration validates contacts, units and canonical crop values', () => {
  assert.ok(registrationIntent('register a new application')); assert.ok(registrationIntent('नया आवेदन दर्ज करें'));
  assert.equal(intakeAnswer('crop', 'Paddy').value, 'धान'); assert.equal(intakeAnswer('phone', '९०००००००९९').value, '9000000099');
  assert.ok(intakeAnswer('phone', '123').error); assert.ok(intakeAnswer('area', 'two bigha').error); assert.ok(intakeAnswer('area', '-1').error);
});
