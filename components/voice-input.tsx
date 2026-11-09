'use client';
import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Upload, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useLocalSpeech } from './local-speech';
import { useLanguage } from './language';
export default function VoiceInput({ onTranscript }: { onTranscript: (text: string) => void }) {
  const { language, t, localize } = useLanguage(); const audio = useLocalSpeech();
  const [mode, setMode] = useState<'idle' | 'requesting' | 'recording' | 'transcribing'>('idle');
  const [url, setUrl] = useState(''); const [text, setText] = useState(''); const [error, setError] = useState(''); const [seconds, setSeconds] = useState(0); const [provider, setProvider] = useState('');
  const recorder = useRef<MediaRecorder | null>(null); const stream = useRef<MediaStream | null>(null); const timer = useRef<ReturnType<typeof setInterval> | null>(null); const blobUrl = useRef(''); const mounted = useRef(true); const abort = useRef<AbortController | null>(null); const duration = useRef(0);
  function stopTracks() { stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; if (timer.current) clearInterval(timer.current); timer.current = null; }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; abort.current?.abort(); if (recorder.current?.state === 'recording') recorder.current.stop(); stopTracks(); if (blobUrl.current) URL.revokeObjectURL(blobUrl.current); }; }, []);
  async function transcribe(blob: Blob, name = 'recording.webm') {
    if (blob.size > 5 * 1024 * 1024) { setError('ऑडियो 5 MB तक रखें।'); return; }
    if (blobUrl.current) URL.revokeObjectURL(blobUrl.current); blobUrl.current = URL.createObjectURL(blob); setUrl(blobUrl.current); setText(''); setError(''); setMode('transcribing');
    abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
    try {
      const form = new FormData(); form.set('file', blob, name); form.set('language', language);
      const response = await fetch('/api/transcribe', { method: 'POST', body: form, signal: controller.signal });
      const result = await response.json() as { text?: string; provider?: string; error?: string };
      if (!response.ok || !result.text) throw new Error(result.error || 'आवाज़ स्पष्ट नहीं मिली। रिकॉर्डिंग सुनें और दोबारा बोलें।');
      if (mounted.current) { setText(result.text); setProvider(result.provider || 'local transcription'); }
    } catch (e) { if (mounted.current && !controller.signal.aborted) setError((e as Error).message); }
    finally { if (mounted.current) setMode('idle'); }
  }
  async function start() {
    audio.stop();
    if (!window.isSecureContext) { setError('रिकॉर्डिंग के लिए localhost या HTTPS पर ऐप खोलें।'); return; }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { setError('इस ब्राउज़र में रिकॉर्डिंग उपलब्ध नहीं। ऑडियो फ़ाइल चुनें।'); return; }
    setError(''); setMode('requesting');
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (!mounted.current) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media; const mime = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find(value => MediaRecorder.isTypeSupported(value));
      const r = new MediaRecorder(media, mime ? { mimeType: mime } : undefined); recorder.current = r; const chunks: Blob[] = []; let bytes = 0;
      r.ondataavailable = e => { if (e.data.size) { chunks.push(e.data); bytes += e.data.size; if (bytes > 5 * 1024 * 1024 && r.state === 'recording') r.stop(); } };
      r.onerror = () => { stopTracks(); if (mounted.current) { setMode('idle'); setError('रिकॉर्डिंग शुरू नहीं हुई। माइक्रोफ़ोन की अनुमति जाँचें।'); } };
      r.onstop = () => { stopTracks(); if (!mounted.current) return; const blob = new Blob(chunks, { type: r.mimeType || 'audio/webm' }); if (blob.size < 128 || duration.current < 1) { setMode('idle'); setError('रिकॉर्डिंग बहुत छोटी है। एक पूरा वाक्य बोलें।'); return; } void transcribe(blob, r.mimeType.includes('mp4') ? 'recording.m4a' : r.mimeType.includes('ogg') ? 'recording.ogg' : 'recording.webm'); };
      duration.current = 0; setSeconds(0); setMode('recording'); r.start(250);
      timer.current = setInterval(() => { duration.current += 1; setSeconds(duration.current); if (duration.current >= 60 && r.state === 'recording') r.stop(); }, 1000);
    } catch (e) {
      stopTracks(); setMode('idle'); const name = (e as DOMException).name;
      setError(name === 'NotAllowedError' ? 'माइक्रोफ़ोन की अनुमति दें। अनुमति बंद हो तो ब्राउज़र सेटिंग में चालू करें।' : name === 'NotFoundError' ? 'माइक्रोफ़ोन नहीं मिला। ऑडियो फ़ाइल चुनें या पाठ लिखें।' : name === 'NotReadableError' ? 'माइक्रोफ़ोन किसी और ऐप में व्यस्त है। उसे बंद करके फिर प्रयास करें।' : 'रिकॉर्डिंग शुरू नहीं हुई। माइक्रोफ़ोन की अनुमति जाँचें।');
    }
  }
  return localize(<div className="voice-input"><div className="voice-actions"><button type="button" className={'button secondary ' + (mode === 'recording' ? 'recording' : '')} disabled={mode === 'requesting' || mode === 'transcribing'} onClick={() => { if (mode === 'recording') recorder.current?.stop(); else void start(); }}>{mode === 'recording' ? <Square size={14} /> : mode === 'requesting' ? <RefreshCw className="spin" size={14} /> : <Mic size={15} />}{mode === 'recording' ? `${t('रिकॉर्डिंग रोकें')} · ${seconds}s` : 'रिकॉर्ड करें'}</button><label className="voice-upload"><Upload size={14} />ऑडियो फ़ाइल चुनें<input type="file" accept="audio/*,.webm,.m4a,.flac" disabled={mode !== 'idle'} onChange={e => { const file = e.target.files?.[0]; if (file) void transcribe(file, file.name); e.target.value = ''; }} /></label><small>अधिकतम 60 सेकंड</small></div>
    {url && <audio className="voice-playback" controls src={url} aria-label={t('रिकॉर्डिंग सुनें')} />}
    {mode === 'transcribing' && <p className="voice-progress" role="status"><RefreshCw size={14} className="spin" />आवाज़ को पाठ में बदल रहे हैं…</p>}
    {error && <p className="voice-error" role="alert"><AlertCircle size={15} />{error}</p>}
    {text && <div className="voice-transcript"><label className="field-label">पाठ की जाँच करें<textarea aria-label={t('पाठ की जाँच करें')} rows={3} value={text} onChange={e => setText(e.target.value)} maxLength={4000} /></label><button type="button" className="button secondary" onClick={() => onTranscript(text)} disabled={!text.trim()}><Check size={14} />इस पाठ का उपयोग करें</button><small>{provider}</small></div>}
    <small className="voice-privacy">केवल पुष्टि के बाद पाठ भेजा जाएगा। ऑडियो स्थानीय सेवा में संसाधित होता है।</small>
  </div>);
}
