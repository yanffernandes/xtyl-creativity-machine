"use client";

import { useLocaleContext } from '@/contexts/LocaleContext';
import { localeConfig, Locale } from '@/i18n/config';

export function useLocale() {
  const { locale, setLocale, isLoading } = useLocaleContext();

  const config = localeConfig[locale];

  return {
    locale,
    setLocale,
    isLoading,
    config,
    locales: Object.entries(localeConfig).map(([code, cfg]) => ({
      code: code as Locale,
      name: cfg.name,
      nativeName: cfg.nativeName
    }))
  };
}
