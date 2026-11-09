'use client';
import { ChevronDown } from 'lucide-react';
import { historyDetails } from '../lib/history.mjs';
import { stageNames, type CaseEvent } from '../lib/domain';
import { useLanguage } from './language';
export default function HistoryDetails({ event }: { event: CaseEvent }) {
  const { localize, t } = useLanguage(); const details = historyDetails(event);
  const format = (value: unknown) => value === true ? t('हाँ') : value === false ? t('नहीं') : value === null || value === '' ? t('जानकारी उपलब्ध नहीं') : String(value);
  return localize(<details className="history-details"><summary><ChevronDown size={14} />इस चरण का विवरण देखें</summary>{!details ? <p>पुराने रिकॉर्ड में विस्तृत चरण विवरण सहेजा नहीं गया था।</p> : <div><strong>{stageNames[details.stage as keyof typeof stageNames]} · उस समय दर्ज विवरण</strong><small>मूल विवरण अपनी दर्ज भाषा में हैं।</small><dl>{details.fields.map(field => <div key={field.key}><dt>{field.label}</dt><dd data-original>{field.changed && <div className="history-before"><span>{t('पहले')}: </span>{format(field.before)}</div>}<div><span>{t('इस कार्यवाही के बाद')}: </span>{format(field.after)}</div></dd></div>)}</dl></div>}</details>);
}
