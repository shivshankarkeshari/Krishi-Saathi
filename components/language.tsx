'use client';
import { createContext, useContext, useEffect, useState, Children, cloneElement, isValidElement, type ReactNode, type ReactElement } from 'react';
import { Languages } from 'lucide-react';
import { translateText } from '../lib/translations.mjs';
export type Language = 'hi' | 'en';
const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => void }>({ language: 'hi', setLanguage: () => {} });
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, update] = useState<Language>('hi');
  useEffect(() => { try { if (localStorage.getItem('krishi-language') === 'en') update('en'); } catch {} }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  function setLanguage(value: Language) { update(value); try { localStorage.setItem('krishi-language', value); } catch {} }
  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}
// Translate rendered UI labels only. Input values, event handlers, identifiers
// and stored farmer evidence remain unchanged. No DOM mutation or remote translation.
export function localizeTree(node: ReactNode, language: Language): ReactNode {
  if (language === 'hi') return node;
  return Children.map(node, child => {
    if (typeof child === 'string') return translateText(child, language);
    if (!isValidElement(child)) return child;
    const element = child as ReactElement<Record<string, unknown>>;
    if (element.props['data-original']) return element;
    const updates: Record<string, unknown> = {};
    for (const prop of ['title', 'placeholder', 'aria-label']) if (typeof element.props[prop] === 'string') updates[prop] = translateText(element.props[prop], language);
    if ('children' in element.props) updates.children = localizeTree(element.props.children as ReactNode, language);
    return cloneElement(element, updates);
  });
}
export function useLanguage() {
  const context = useContext(LanguageContext);
  return { ...context, t: (text: string) => translateText(text, context.language) as string, localize: (node: ReactNode) => localizeTree(node, context.language) };
}
export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  return <button className="language-toggle" onClick={() => setLanguage(language === 'hi' ? 'en' : 'hi')} aria-label={language === 'hi' ? 'Switch to English' : 'हिन्दी में बदलें'}><Languages size={16} />{language === 'hi' ? 'English' : 'हिन्दी'}</button>;
}
