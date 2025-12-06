export const locales = ['pt-BR', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'pt-BR';

export const localeConfig: Record<Locale, {
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  dateFormat: string;
}> = {
  'pt-BR': {
    name: 'Português (Brasil)',
    nativeName: 'Português',
    direction: 'ltr',
    dateFormat: 'dd/MM/yyyy'
  },
  'en': {
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    dateFormat: 'MM/dd/yyyy'
  }
};

export function detectBrowserLocale(): Locale {
  if (typeof window === 'undefined') return defaultLocale;

  const browserLang = navigator.language;
  const detected = locales.find(l => browserLang.startsWith(l.split('-')[0]));
  return detected || defaultLocale;
}
