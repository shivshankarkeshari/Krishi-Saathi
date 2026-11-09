import { env } from 'cloudflare:workers';
import { context, errorResponse, json } from '../../../lib/server';
import { DomainError } from '../../../lib/domain';
export async function GET() { try {
  await context();
  if (!env.SPEECH_URL) return json({ status: 'unavailable' }, 503);
  const result = await fetch(env.SPEECH_URL + '/health', { signal: AbortSignal.timeout(5000) });
  return json(await result.json());
} catch (e) { return errorResponse(e); } }
export async function POST(request: Request) { try {
  await context();
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new DomainError('इस स्रोत से अनुरोध मान्य नहीं है।', 403);
  if (!env.SPEECH_URL) throw new DomainError('स्थानीय आवाज़ सेवा चालू नहीं है। Docker में speech सेवा शुरू करें।', 503);
  if (Number(request.headers.get('content-length')) > 6 * 1024 * 1024) throw new DomainError('ऑडियो 5 MB तक रखें।', 413);
  const form = await request.formData(); const file = form.get('file'); const language = form.get('language') === 'en' ? 'en' : 'hi';
  if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024 || !(/^(audio\/|video\/webm)/.test(file.type) || /\.(wav|mp3|m4a|webm|ogg|flac)$/i.test(file.name))) throw new DomainError('मान्य ऑडियो फ़ाइल चुनें (5 MB तक)।');
  const forwarded = new FormData(); forwarded.set('file', file); forwarded.set('language', language);
  let response: Response;
  try { response = await fetch(env.SPEECH_URL + '/transcribe', { method: 'POST', body: forwarded, signal: AbortSignal.timeout(120000) }); } catch { throw new DomainError('आवाज़ सेवा उपलब्ध नहीं है। फिर प्रयास करें या पाठ लिखें।', 503); }
  const result = await response.json() as { text?: string; provider?: string; detail?: string; language?: string };
  if (!response.ok) {
    const message = response.status === 503 ? 'आवाज़ का मॉडल तैयार हो रहा है। थोड़ी देर बाद फिर प्रयास करें।' : 'आवाज़ स्पष्ट नहीं मिली। रिकॉर्डिंग सुनें और दोबारा बोलें।';
    throw new DomainError(message, response.status === 503 ? 503 : 422);
  }
  if (!result.text?.trim()) throw new DomainError('आवाज़ स्पष्ट नहीं मिली। रिकॉर्डिंग सुनें और दोबारा बोलें।', 422);
  return json({ text: result.text.trim().slice(0, 4000), provider: result.provider, language: result.language });
} catch (e) { return errorResponse(e); } }
