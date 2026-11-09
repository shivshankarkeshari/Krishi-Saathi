'use client';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Volume2, X, RefreshCw } from 'lucide-react';
import { useLanguage, type Language } from './language';
const SpeechContext = createContext<{ speak: (text: string, language: Language) => void; stop: () => void }>({ speak: () => {}, stop: () => {} });
export function LocalSpeechProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage(); const [url, setUrl] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const player = useRef<HTMLAudioElement>(null); const objectUrl = useRef(''); const controller = useRef<AbortController | null>(null); const generation = useRef(0);
  function stop() { generation.current++; controller.current?.abort(); player.current?.pause(); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); objectUrl.current = ''; setUrl(''); setBusy(false); setError(''); }
  useEffect(() => () => { controller.current?.abort(); player.current?.pause(); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }, []);
  function speak(text: string, responseLanguage: Language) {
    stop(); const requestId = generation.current; const abort = new AbortController(); controller.current = abort; setBusy(true);
    void (async () => {
      try {
        const response = await fetch('/api/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text.slice(0, 3000), language: responseLanguage }), signal: abort.signal });
        if (!response.ok) { const failure = await response.json() as { error?: string }; throw new Error(failure.error || 'Voice unavailable'); }
        const blob = await response.blob(); if (abort.signal.aborted || generation.current !== requestId) return;
        const next = URL.createObjectURL(blob); objectUrl.current = next; setUrl(next); setBusy(false);
        if (player.current) { player.current.src = next; player.current.load(); try { await player.current.play(); } catch { setError(responseLanguage === 'en' ? 'Audio is ready. Press Play below.' : 'आवाज़ तैयार है। नीचे Play दबाएँ।'); } }
      } catch (e) { if (!abort.signal.aborted) { setBusy(false); setError(responseLanguage === 'en' ? 'Local voice is unavailable or warming up. Please retry shortly.' : (e as Error).message); } }
    })();
  }
  return <SpeechContext.Provider value={{ speak, stop }}>{children}<section className="speech-player" hidden={!busy && !url && !error} aria-label={language === 'en' ? 'Local audio playback' : 'स्थानीय आवाज़ सुनें'}><div><Volume2 size={17} /><strong>{language === 'en' ? 'Listen · local voice' : 'सुनें · स्थानीय आवाज़'}</strong><button className="icon-button" onClick={stop} aria-label={language === 'en' ? 'Stop audio' : 'आवाज़ बंद करें'}><X size={17} /></button></div>{busy && <p role="status"><RefreshCw size={14} className="spin" />{language === 'en' ? 'Preparing audio… first use downloads the voice.' : 'आवाज़ तैयार हो रही है… पहली बार मॉडल डाउनलोड होगा।'}</p>}{error && <p role="status">{error}</p>}<audio ref={player} controls src={url || undefined} hidden={!url} /></section></SpeechContext.Provider>;
}
export const useLocalSpeech = () => useContext(SpeechContext);
