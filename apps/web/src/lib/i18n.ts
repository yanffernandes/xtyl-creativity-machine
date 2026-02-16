import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

/**
 * i18n Configuration
 *
 * - Loads translations from /locales/{lang}/translation.json via HTTP backend
 * - Default language: pt-BR
 * - Fallback language: en
 */
i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: 'pt-BR',
    fallbackLng: 'en',
    debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
    backend: {
      loadPath: '/locales/{{lng}}/translation.json',
    },
  });

export default i18n;
