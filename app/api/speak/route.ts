import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { context, body, errorResponse, json } from '../../../lib/server';
export async function POST(request: Request) { try {
  await context();
  const parsed = z.object({ text: z.string().trim().min(1).max(3000), language: z.enum(['hi', 'en']).default('hi') }).safeParse(await body(request));
  if (!parsed.success) return json({ error: 'सुनाने के लिए छोटा पाठ चुनें।' }, 400);
  if (!env.SPEECH_URL) return json({ error: 'स्थानीय आवाज़ सेवा चालू नहीं है। Docker में speech सेवा शुरू करें।' }, 503);
  const response = await fetch(env.SPEECH_URL + '/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data), signal: AbortSignal.timeout(120000) });
  if (!response.ok) return json({ error: 'स्थानीय आवाज़ तैयार हो रही है। थोड़ी देर बाद फिर सुनें।' }, 503);
  return new Response(await response.arrayBuffer(), { headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Speech-Provider': response.headers.get('X-Speech-Provider') || 'piper' } });
} catch (e) { return errorResponse(e); } }
