export const registrationFields = ['name', 'village', 'phone', 'crop', 'area', 'purpose'];
export const registrationQuestions = ['आपका नाम क्या है?', 'आपका गाँव कौन सा है?', 'किस मोबाइल पर संपर्क कर सकते हैं?', 'किस फसल को नुकसान हुआ है?', 'कितने हेक्टेयर खेत में नुकसान का दावा है?', 'क्या हुआ था? अपनी बात थोड़ी बताएँ।'];
export function registrationIntent(message) { return /^(register|apply|new application|create (an? )?(new )?application|नया आवेदन|पंजीकरण|आवेदन दर्ज)/i.test(message.trim()); }
export function intakeAnswer(field, raw) {
  let value = raw.trim().replace(/[०-९]/g, digit => String('०१२३४५६७८९'.indexOf(digit)));
  if (field === 'phone') { value = value.replace(/[\s-]/g, ''); if (!/^[6-9]\d{9}$/.test(value)) return { error: 'संपर्क के लिए 10 अंकों का मोबाइल भरें।' }; }
  if (field === 'area') { if (!Number.isFinite(Number(value)) || Number(value) <= 0 || Number(value) > 100) return { error: 'हेक्टेयर में सही रकबा भरें। बीघा जैसे अन्य माप के लिए सहायक से मदद लें।' }; }
  if (field === 'crop') { const crops = { paddy: 'धान', rice: 'धान', maize: 'मक्का', corn: 'मक्का', wheat: 'गेहूँ', other: 'अन्य' }; value = crops[value.toLowerCase()] || value; if (!['धान','मक्का','गेहूँ','अन्य'].includes(value)) return { error: 'दिए गए फसल विकल्पों में से चुनें।' }; }
  if (['name', 'village'].includes(field) && (value.length < 2 || value.length > 100)) return { error: 'पूरा नाम या गाँव लिखें।' };
  if (field === 'purpose' && (value.length < 3 || value.length > 2000)) return { error: 'नुकसान की बात थोड़ा विस्तार से बताएँ।' };
  return { value };
}
