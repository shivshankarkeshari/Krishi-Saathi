import test from 'node:test';
import assert from 'node:assert/strict';
import { compatibleAssistance, compatibleModelId } from '../lib/openai-compatible.mjs';
const config = { OPENAI_BASE_URL: 'http://host.docker.internal:1234/v1/', OPENAI_API_KEY: 'lm-studio', OPENAI_MODEL: 'openai/lfm3-omni-2b' };
test('LM Studio adapter preserves endpoint, passes configured auth, and maps provider model syntax', async () => {
  const expected = { summary: 'जाँच बाकी है।', checks: [], questions: [], draft: 'मसौदा' };
  const result = await compatibleAssistance({ claimedAreaHa: 1.5 }, config, async (url, request) => {
    assert.equal(url, 'http://host.docker.internal:1234/v1/chat/completions');
    assert.equal(request.headers.Authorization, 'Bearer lm-studio');
    const body = JSON.parse(request.body);
    assert.equal(body.model, 'lfm3-omni-2b');
    assert.equal(body.response_format.type, 'json_schema');
    assert.equal(body.response_format.json_schema.strict, true);
    assert.equal(body.stream, false);
    assert.equal(JSON.parse(body.messages[1].content).claimedAreaHa, 1.5);
    return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(expected) } }] });
  });
  assert.deepEqual(result.output, expected); assert.equal(result.provider, 'lm-studio:lfm3-omni-2b');
  assert.equal(compatibleModelId('lfm3-omni-2b'), 'lfm3-omni-2b');
});
test('provider failures, missing content, truncated and malformed JSON are rejected', async () => {
  for (const response of [new Response('unavailable', { status: 503 }), Response.json({ choices: [] }), Response.json({ choices: [{ finish_reason: 'length', message: { content: '{}' } }] }), Response.json({ choices: [{ finish_reason: 'stop', message: { content: 'invalid JSON' } }] })]) {
    await assert.rejects(compatibleAssistance({}, config, async () => response));
  }
});
