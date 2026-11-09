'use client';
import { useState } from 'react';
import { MessageCircle, Send, Volume2, Database, ArrowRight, RefreshCw, Plus, CheckCircle2 } from 'lucide-react';
import { useLanguage } from './language';
import { useLocalSpeech } from './local-speech';
import { api } from '../lib/client';
import { registrationFields, registrationQuestions, registrationIntent, intakeAnswer } from '../lib/intake-chat.mjs';
import VoiceInput from './voice-input';
type Reply = { answer: string; reference?: string; provider: string; needsReference: boolean; application?: { id: string; revision: number }; toolCalls: { name: string; reference: string; revision: number; status: string }[]; sources: string[] };
type Message = { role: 'user' | 'assistant'; text: string; reply?: Reply };
type Registration = { step: number; values: Record<string, string>; requestKey: string };
const example = { name: 'सावित्री देवी', village: 'बिशुनपुर', phone: '9000000099', crop: 'धान', area: '0.75', purpose: 'बाढ़ से धान की फसल को नुकसान हुआ। जाँच और सहायता का डेमो अनुरोध।' };
export default function ApplicationChat({ onOpen, onCreated }: { onOpen: (id: string) => void; onCreated: () => Promise<void> }) {
  const { language, t, localize } = useLanguage(); const audio = useLocalSpeech();
  const [messages, setMessages] = useState<Message[]>([]); const [reference, setReference] = useState(''); const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [readAloud, setReadAloud] = useState(false); const [registration, setRegistration] = useState<Registration | null>(null); const [consent, setConsent] = useState(false);
  function speak(text: string) { audio.speak(text, language); }
  function bot(text: string, reply?: Reply) { setMessages(m => [...m, { role: 'assistant', text, reply }]); if (readAloud) speak(text); }
  function startRegistration() { setRegistration({ step: 0, values: {}, requestKey: crypto.randomUUID() }); setConsent(false); setError(''); setText(''); bot(t(registrationQuestions[0])); }
  async function send(value = text) {
    if (!value.trim() || busy) return;
    if (!registration && registrationIntent(value)) { setMessages(m => [...m, { role: 'user', text: value }]); startRegistration(); return; }
    if (registration) {
      if (registration.step >= registrationFields.length) { setError(t('पूरा विवरण जाँचें और सहमति के साथ पंजीकरण की पुष्टि करें।')); return; }
      const field = registrationFields[registration.step]; const result = intakeAnswer(field, value);
      if (result.error) { setError(t(result.error)); return; }
      setMessages(m => [...m, { role: 'user', text: value }]); setError(''); setText('');
      const next = registration.step + 1; setRegistration({ ...registration, step: next, values: { ...registration.values, [field]: result.value! } });
      bot(next < registrationFields.length ? t(registrationQuestions[next]) : t('अब विवरण की पुष्टि करें।'));
      return;
    }
    setBusy(true); setError(''); setText(''); setMessages(m => [...m, { role: 'user', text: value }]);
    try { const reply = await api<Reply>('/api/chat', { message: value, reference, language }); if (reply.reference) setReference(reply.reference); bot(reply.answer, reply); }
    catch (e) { setError(t((e as Error).message)); } finally { setBusy(false); }
  }
  async function confirmRegistration() {
    if (!registration || !consent || busy) return; setBusy(true); setError('');
    try {
      await api('/api/workspace', { role: 'coordinator' });
      const reply = await api<Reply>('/api/chat', { action: 'register', ...registration.values, area: Number(registration.values.area), requestKey: registration.requestKey, source: 'helpdesk', evidence: '', confirmed: true, consent: true, language });
      if (reply.reference) setReference(reply.reference); setRegistration(null); setConsent(false); bot(reply.answer, reply); await onCreated();
    } catch (e) { setError(t((e as Error).message)); } finally { setBusy(false); }
  }
  const confirming = !!registration && registration.step === registrationFields.length;
  return localize(<><div className="page-heading"><div><div className="eyebrow">केवल अपने आवेदन के बारे में पूछें</div><h1>आवेदन सहायक</h1><p>नया अनुरोध दर्ज करें या आवेदन नंबर से स्थिति और दस्तावेज़ पूछें।</p></div><div className="button-row"><button className="button primary" disabled={busy || !!registration} onClick={startRegistration}><Plus size={16} />नया आवेदन दर्ज करें</button><button className="button secondary" disabled={busy} onClick={() => { setMessages([]); setReference(''); setText(''); setError(''); setRegistration(null); setConsent(false); audio.stop(); }}>नया आवेदन देखें</button></div></div><section className="panel application-chat"><div className="application-chat-header"><MessageCircle size={22} /><div><strong>कृषि साथी</strong><small>पंजीकरण में पुष्टि लेता है; सवाल का जवाब रिकॉर्ड देखकर देता है।</small></div>{reference && <span className="badge mono">{reference}</span>}</div><div className="application-chat-messages" aria-live="polite"><div className="chat-message assistant"><p>{language === 'en' ? 'Register a new demo request using the button above, or share an application number such as KS-DEMO-1041. I will retrieve that application before answering questions.' : 'ऊपर के बटन से नया डेमो अनुरोध दर्ज कर सकते हैं। पहले से आवेदन है तो उसका नंबर बताएँ, जैसे KS-DEMO-1041। जवाब से पहले उसी आवेदन का रिकॉर्ड देखूँगा।'}</p><button className="text-button" onClick={() => speak(language === 'en' ? 'You can register a new request, or share your application number to check its status.' : 'नया अनुरोध दर्ज कर सकते हैं, या स्थिति जानने के लिए अपना आवेदन नंबर बताएँ।')}><Volume2 size={14} />स्वागत सुनें</button></div>{messages.map((m, i) => <article key={i} className={'chat-message ' + m.role}><p data-original>{m.text}</p>{m.reply?.toolCalls.map((tool, j) => <details className="tool-trace" key={j}><summary><Database size={13} />{tool.name === 'register_application' ? 'अनुरोध दर्ज' : 'रिकॉर्ड देखा गया'}<span>{tool.reference} · v{tool.revision}</span></summary><code>{tool.name}({JSON.stringify({ reference: tool.reference })}) → {tool.status}</code></details>)}{m.role === 'assistant' && <div className="chat-message-actions"><button className="text-button" onClick={() => speak(m.text)}><Volume2 size={14} />जवाब सुनें</button>{m.reply?.application && <button className="text-button" onClick={() => onOpen(m.reply!.application!.id)}>आवेदन खोलें <ArrowRight size={14} /></button>}<small>{m.reply?.provider || 'Guided intake'}</small></div>}</article>)}{busy && <p className="chat-busy" role="status"><RefreshCw size={15} className="spin" />खोज रहे हैं…</p>}</div>{error && <div className="inline-error" role="alert">{error}</div>}<div className="application-chat-compose">
  {registration && !confirming && <div className="registration-progress"><span>{language === 'en' ? `Registration · question ${registration.step + 1} of 6` : `पंजीकरण · सवाल ${registration.step + 1} / 6`}</span><button className="text-button" onClick={() => { setRegistration({ ...registration, step: 6, values: example }); bot(t('अब विवरण की पुष्टि करें।')); }}>पूरा उदाहरण भरें</button><button className="text-button" onClick={() => { setRegistration(null); setConsent(false); setText(''); }}>रद्द करें</button></div>}
  {confirming && registration && <div className="registration-confirm"><div className="section-title"><h3>पढ़कर पुष्टि करें</h3><button className="icon-button" aria-label={t('विवरण सुनें')} onClick={() => speak(`${t('नाम')}: ${registration.values.name}. ${t('गाँव')}: ${registration.values.village}. ${t('संपर्क')}: ${registration.values.phone}. ${t('फसल / रकबा')}: ${t(registration.values.crop)}, ${registration.values.area} ${t('हेक्टेयर')}. ${registration.values.purpose}`)}><Volume2 size={18} /></button></div><dl className="intake-summary">{registrationFields.map((key, i) => <div key={key}><dt>{['नाम','गाँव','संपर्क मोबाइल','फसल / रकबा','आवेदन का रकबा','आवेदन का उद्देश्य'][i]}</dt><dd data-original>{key === 'crop' ? t(registration.values[key]) : registration.values[key]}{key === 'area' ? ' ha' : ''}</dd></div>)}</dl><label className="checkbox-label"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />विवरण पढ़कर/सुनकर सही पाया। इस डेमो में जानकारी रखने और संपर्क कार्य बनाने की अनुमति है। केवल काल्पनिक डेटा दिया है।</label><div className="button-row"><button className="button primary" disabled={busy || !consent} onClick={() => void confirmRegistration()}><CheckCircle2 size={16} />पुष्टि करें · डेमो अनुरोध दर्ज करें</button><button className="button secondary" disabled={busy} onClick={() => { setRegistration(null); setConsent(false); setText(''); }}>रद्द करें</button></div><small className="field-help">समन्वयक की डेमो भूमिका से दर्ज होगा। लक्ष्य: 7 दिन; सरकारी समय-सीमा नहीं।</small></div>}
  {!registration && reference && <div className="chat-suggestions">{['स्थिति क्या है?', 'कौन से दस्तावेज़ जमा हैं?', 'सुधार क्यों चाहिए?', 'पिछली कार्यवाही क्या थी?'].map(q => <button disabled={busy} key={q} onClick={() => void send(t(q))}>{q}</button>)}</div>}
  {registration?.step === 3 && <div className="chat-suggestions">{['धान','मक्का','गेहूँ','अन्य'].map(crop => <button key={crop} onClick={() => void send(crop)}>{crop}</button>)}</div>}
  {!confirming && <><form className="application-chat-form" onSubmit={e => { e.preventDefault(); void send(); }}><input aria-label={t('आवेदन नंबर या सवाल लिखें…')} placeholder={registration ? t(registrationQuestions[registration.step]) : t('आवेदन नंबर या सवाल लिखें…')} value={text} maxLength={2000} disabled={busy} onChange={e => setText(e.target.value)} /><button className="button primary" disabled={busy || !text.trim()} aria-label={t('संदेश भेजें')}><Send size={16} />संदेश भेजें</button></form><VoiceInput onTranscript={setText} /></>}
  <label className="checkbox-label"><input type="checkbox" checked={readAloud} onChange={e => setReadAloud(e.target.checked)} />उत्तर अपने-आप सुनाएँ</label><small className="field-help">मूल टिप्पणियाँ दर्ज भाषा में रहेंगी।</small></div></section></>);
}
