import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, locales, Locale } from './config';

const COOKIE_NAME = 'NEXT_LOCALE';

export default getRequestConfig(async () => {
  // Read locale from cookie (set by client)
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(COOKIE_NAME)?.value;

  // Validate and use cookie locale, or fallback to default
  const locale: Locale = cookieLocale && locales.includes(cookieLocale as Locale)
    ? (cookieLocale as Locale)
    : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
