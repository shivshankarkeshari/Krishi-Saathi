import type { Attachment, Callback, CaseEvent, CaseRecord, Role } from './domain';
export type Workspace = { cases: CaseRecord[]; events: CaseEvent[]; documents: Attachment[]; callbacks: Callback[]; role: Role; user: string };
export async function api<T = Record<string, unknown>>(path: string, payload?: unknown, method = 'POST'): Promise<T> {
  const response = await fetch(path, payload === undefined ? { cache: 'no-store' } : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await response.json() as T & { error?: string }; if (!response.ok) throw new Error(data.error || 'सेवा उपलब्ध नहीं है।'); return data;
}
export const dateTime = (value: string, language: 'hi' | 'en' = 'hi') => new Date(value).toLocaleString(language === 'en' ? 'en-IN' : 'hi-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
