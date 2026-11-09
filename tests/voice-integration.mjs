import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const base = process.env.BASE_URL || 'http://127.0.0.1:3000';
let ready = false;
for (let i = 0; i < 60; i++) { const r = await fetch(base + '/api/transcribe'); const d = await r.json(); if (d.status === 'ready') { ready = true; break; } await new Promise(resolve => setTimeout(resolve, 1000)); }
assert.ok(ready, 'Local speech model did not become ready');
const form = new FormData(); form.set('file', new Blob([readFileSync(new URL('./fixtures/jfk.flac', import.meta.url))], { type: 'audio/flac' }), 'jfk.flac'); form.set('language', 'en');
const response = await fetch(base + '/api/transcribe', { method: 'POST', body: form }); const result = await response.json();
assert.equal(response.status, 200, JSON.stringify(result)); assert.match(result.text.toLowerCase(), /country/); assert.equal(result.provider, 'faster-whisper:base');
const invalid = new FormData(); invalid.set('file', new Blob(['not audio'], { type: 'text/html' }), 'invalid.html');
assert.equal((await fetch(base + '/api/transcribe', { method: 'POST', body: invalid })).status, 400);
// A valid silent WAV must produce a retry prompt, never an invented transcript.
const sampleRate = 16000; const samples = sampleRate * 2; const wav = Buffer.alloc(44 + samples * 2); wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40);
const silence = new FormData(); silence.set('file', new Blob([wav], { type: 'audio/wav' }), 'silence.wav'); silence.set('language', 'en');
const silentResponse = await fetch(base + '/api/transcribe', { method: 'POST', body: silence }); assert.equal(silentResponse.status, 422);
console.log('PASS: real audio transcription, invalid file rejection, and no-speech handling.');
for (const language of ['hi', 'en']) {
  const response = await fetch(base + '/api/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language, text: language === 'hi' ? 'नमस्ते। आपके आवेदन की जाँच हो रही है।' : 'Hello. Your application is being reviewed.' }) });
  assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'audio/wav');
  const audio = Buffer.from(await response.arrayBuffer()); assert.equal(audio.subarray(0, 4).toString(), 'RIFF'); assert.ok(audio.length > 3000); assert.match(response.headers.get('x-speech-provider'), /^piper:/);
}
console.log('PASS: Hindi and English local read-aloud produce playable WAV audio.');
