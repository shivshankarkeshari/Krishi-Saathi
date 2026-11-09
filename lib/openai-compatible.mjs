import { outputSchema, instructions, englishInstructions } from './ai-contract.mjs';

// "openai/" is a provider selector in the supplied CLI notation. LM Studio's
// /models endpoint advertises the underlying identifier without that prefix.
export function compatibleModelId(value) {
  return (value || 'openai/lfm3-omni-2b').replace(/^openai\//, '');
}

export async function compatibleAssistance(context, config, fetchImpl = fetch) {
  const model = compatibleModelId(config.OPENAI_MODEL);
  const response = await fetchImpl(config.OPENAI_BASE_URL.replace(/\/$/, '') + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.OPENAI_API_KEY ? { Authorization: `Bearer ${config.OPENAI_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      model,
      stream: false,
      temperature: 0.1,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: (context.responseLanguage === 'en' ? englishInstructions : instructions) + ' Keep it brief: a two-sentence summary, at most 4 checks and 3 questions, and a short draft. Write the summary, checks, questions and draft in ' + (context.responseLanguage === 'en' ? 'English' : 'Hindi') + '. Keep the source enum labels unchanged.' },
        { role: 'user', content: JSON.stringify(context) },
      ],
      response_format: { type: 'json_schema', json_schema: { name: 'case_assistance', strict: true, schema: outputSchema } },
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`compatible_provider_http_${response.status}`);
  const result = await response.json();
  const choice = result.choices?.[0];
  if (choice?.finish_reason === 'length') throw new Error('compatible_provider_truncated');
  if (typeof choice?.message?.content !== 'string') throw new Error('compatible_provider_no_content');
  return { output: JSON.parse(choice.message.content), provider: 'lm-studio:' + model };
}
