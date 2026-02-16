/**
 * Comprehensive Localization Data Map
 *
 * Maps country codes (ISO 3166-1 alpha-2) to their localization info:
 * - currency: Currency code (ISO 4217)
 * - currency_symbol: Symbol used for display
 * - currency_position: "before" ($ 100) or "after" (100 €)
 * - default_language: Default language for the country
 * - language_name: Full name of the language
 *
 * Used by the Andromeda Creative Diversity System to ensure creatives
 * are 100% accurate for any target country/language combination.
 */

export interface LocalizationInfo {
  country_code: string;
  country_name: string;
  currency_code: string;
  currency_symbol: string;
  currency_position: "before" | "after";
  default_language: string;
  language_name: string;
  locale: string;
}

/**
 * Language code to full name mapping
 */
export const LANGUAGE_NAMES: Record<string, string> = {
  // ISO 639-1 codes
  pt: "Português",
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  nl: "Nederlands",
  pl: "Polski",
  ru: "Русский",
  ja: "日本語",
  ko: "한국어",
  zh: "中文",
  ar: "العربية",
  hi: "हिन्दी",
  tr: "Türkçe",
  vi: "Tiếng Việt",
  th: "ไทย",
  id: "Bahasa Indonesia",
  ms: "Bahasa Melayu",
  sv: "Svenska",
  da: "Dansk",
  no: "Norsk",
  fi: "Suomi",
  el: "Ελληνικά",
  cs: "Čeština",
  ro: "Română",
  hu: "Magyar",
  uk: "Українська",
  he: "עברית",
  bn: "বাংলা",
  ta: "தமிழ்",
  te: "తెలుగు",

  // Extended names (for display)
  portuguese: "Português",
  portugues: "Português",
  english: "English",
  spanish: "Español",
  espanol: "Español",
  french: "Français",
  german: "Deutsch",
  italian: "Italiano",
  dutch: "Nederlands",
  polish: "Polski",
  russian: "Русский",
  japanese: "日本語",
  korean: "한국어",
  chinese: "中文",
  arabic: "العربية",
  hindi: "हिन्दी",
  turkish: "Türkçe",
  vietnamese: "Tiếng Việt",
  thai: "ไทย",
  indonesian: "Bahasa Indonesia",
  malay: "Bahasa Melayu",
  swedish: "Svenska",
  danish: "Dansk",
  norwegian: "Norsk",
  finnish: "Suomi",
  greek: "Ελληνικά",
  czech: "Čeština",
  romanian: "Română",
  hungarian: "Magyar",
  ukrainian: "Українська",
  hebrew: "עברית",
};

/**
 * Country code to localization info mapping
 * ISO 3166-1 alpha-2 country codes
 */
export const COUNTRY_LOCALIZATION: Record<string, LocalizationInfo> = {
  // Americas
  BR: {
    country_code: "BR",
    country_name: "Brasil",
    currency_code: "BRL",
    currency_symbol: "R$",
    currency_position: "before",
    default_language: "pt",
    language_name: "Português",
    locale: "pt-BR",
  },
  US: {
    country_code: "US",
    country_name: "United States",
    currency_code: "USD",
    currency_symbol: "$",
    currency_position: "before",
    default_language: "en",
    language_name: "English",
    locale: "en-US",
  },
  MX: {
    country_code: "MX",
    country_name: "México",
    currency_code: "MXN",
    currency_symbol: "$",
    currency_position: "before",
    default_language: "es",
    language_name: "Español",
    locale: "es-MX",
  },
  AR: {
    country_code: "AR",
    country_name: "Argentina",
    currency_code: "ARS",
    currency_symbol: "$",
    currency_position: "before",
    default_language: "es",
    language_name: "Español",
    locale: "es-AR",
  },
  CO: {
    country_code: "CO",
    country_name: "Colombia",
    currency_code: "COP",
    currency_symbol: "$",
    currency_position: "before",
    default_language: "es",
    language_name: "Español",
    locale: "es-CO",
  },
  CL: {
    country_code: "CL",
    country_name: "Chile",
    currency_code: "CLP",
    currency_symbol: "$",
    currency_position: "before",
    default_language: "es",
    language_name: "Español",
    locale: "es-CL",
  },
  PE: {
    country_code: "PE",
    country_name: "Perú",
    currency_code: "PEN",
    currency_symbol: "S/",
    currency_position: "before",
    default_language: "es",
    language_name: "Español",
    locale: "es-PE",
  },
  CA: {
    country_code: "CA",
    country_name: "Canada",
    currency_code: "CAD",
    currency_symbol: "$",
    currency_position: "before",
    default_language: "en",
    language_name: "English",
    locale: "en-CA",
  },

  // Europe
  PT: {
    country_code: "PT",
    country_name: "Portugal",
    currency_code: "EUR",
    currency_symbol: "€",
    currency_position: "after",
    default_language: "pt",
    language_name: "Português",
    locale: "pt-PT",
  },
  ES: {
    country_code: "ES",
    country_name: "España",
    currency_code: "EUR",
    currency_symbol: "€",
    currency_position: "after",
    default_language: "es",
    language_name: "Español",
    locale: "es-ES",
  },
  FR: {
    country_code: "FR",
    country_name: "France",
    currency_code: "EUR",
    currency_symbol: "€",
    currency_position: "after",
    default_language: "fr",
    language_name: "Français",
    locale: "fr-FR",
  },
  DE: {
    country_code: "DE",
    country_name: "Deutschland",
    currency_code: "EUR",
    currency_symbol: "€",
    currency_position: "after",
    default_language: "de",
    language_name: "Deutsch",
    locale: "de-DE",
  },
  IT: {
    country_code: "IT",
    country_name: "Italia",
    currency_code: "EUR",
    currency_symbol: "€",
    currency_position: "after",
    default_language: "it",
    language_name: "Italiano",
    locale: "it-IT",
  },
  NL: {
    country_code: "NL",
    country_name: "Nederland",
    currency_code: "EUR",
    currency_symbol: "€",
    currency_position: "before",
    default_language: "nl",
    language_name: "Nederlands",
    locale: "nl-NL",
  },
  BE: {
    country_code: "BE",
    country_name: "België",
    currency_code: "EUR",
    currency_symbol: "€",
    currency_position: "after",
    default_language: "nl",
    language_name: "Nederlands",
    locale: "nl-BE",
  },
  AT: {
    country_code: "AT",
    country_name: "Österreich",
    currency_code: "EUR",
    currency_symbol: "€",
    currency_position: "after",
    default_language: "de",
    language_name: "Deutsch",
    locale: "de-AT",
  },
  CH: {
    country_code: "CH",
    country_name: "Schweiz",
    currency_code: "CHF",
    currency_symbol: "CHF",
    currency_position: "before",
    default_language: "de",
    language_name: "Deutsch",
    locale: "de-CH",
  },
  GB: {
    country_code: "GB",
    country_name: "United Kingdom",
    currency_code: "GBP",
    currency_symbol: "£",
    currency_position: "before",
    default_language: "en",
    language_name: "English",
    locale: "en-GB",
  },
  IE: {
    country_code: "IE",
    country_name: "Ireland",
    currency_code: "EUR",
    currency_symbol: "€",
    currency_position: "before",
    default_language: "en",
    language_name: "English",
    locale: "en-IE",
  },
  PL: {
    country_code: "PL",
    country_name: "Polska",
    currency_code: "PLN",
    currency_symbol: "zł",
    currency_position: "after",
    default_language: "pl",
    language_name: "Polski",
    locale: "pl-PL",
  },
  CZ: {
    country_code: "CZ",
    country_name: "Česko",
    currency_code: "CZK",
    currency_symbol: "Kč",
    currency_position: "after",
    default_language: "cs",
    language_name: "Čeština",
    locale: "cs-CZ",
  },
  RO: {
    country_code: "RO",
    country_name: "România",
    currency_code: "RON",
    currency_symbol: "lei",
    currency_position: "after",
    default_language: "ro",
    language_name: "Română",
    locale: "ro-RO",
  },
  HU: {
    country_code: "HU",
    country_name: "Magyarország",
    currency_code: "HUF",
    currency_symbol: "Ft",
    currency_position: "after",
    default_language: "hu",
    language_name: "Magyar",
    locale: "hu-HU",
  },
  GR: {
    country_code: "GR",
    country_name: "Ελλάδα",
    currency_code: "EUR",
    currency_symbol: "€",
    currency_position: "after",
    default_language: "el",
    language_name: "Ελληνικά",
    locale: "el-GR",
  },
  SE: {
    country_code: "SE",
    country_name: "Sverige",
    currency_code: "SEK",
    currency_symbol: "kr",
    currency_position: "after",
    default_language: "sv",
    language_name: "Svenska",
    locale: "sv-SE",
  },
  DK: {
    country_code: "DK",
    country_name: "Danmark",
    currency_code: "DKK",
    currency_symbol: "kr",
    currency_position: "after",
    default_language: "da",
    language_name: "Dansk",
    locale: "da-DK",
  },
  NO: {
    country_code: "NO",
    country_name: "Norge",
    currency_code: "NOK",
    currency_symbol: "kr",
    currency_position: "after",
    default_language: "no",
    language_name: "Norsk",
    locale: "nb-NO",
  },
  FI: {
    country_code: "FI",
    country_name: "Suomi",
    currency_code: "EUR",
    currency_symbol: "€",
    currency_position: "after",
    default_language: "fi",
    language_name: "Suomi",
    locale: "fi-FI",
  },
  RU: {
    country_code: "RU",
    country_name: "Россия",
    currency_code: "RUB",
    currency_symbol: "₽",
    currency_position: "after",
    default_language: "ru",
    language_name: "Русский",
    locale: "ru-RU",
  },
  UA: {
    country_code: "UA",
    country_name: "Україна",
    currency_code: "UAH",
    currency_symbol: "₴",
    currency_position: "after",
    default_language: "uk",
    language_name: "Українська",
    locale: "uk-UA",
  },

  // Middle East & Africa
  SA: {
    country_code: "SA",
    country_name: "المملكة العربية السعودية",
    currency_code: "SAR",
    currency_symbol: "﷼",
    currency_position: "after",
    default_language: "ar",
    language_name: "العربية",
    locale: "ar-SA",
  },
  AE: {
    country_code: "AE",
    country_name: "الإمارات العربية المتحدة",
    currency_code: "AED",
    currency_symbol: "د.إ",
    currency_position: "after",
    default_language: "ar",
    language_name: "العربية",
    locale: "ar-AE",
  },
  EG: {
    country_code: "EG",
    country_name: "مصر",
    currency_code: "EGP",
    currency_symbol: "ج.م",
    currency_position: "after",
    default_language: "ar",
    language_name: "العربية",
    locale: "ar-EG",
  },
  IL: {
    country_code: "IL",
    country_name: "ישראל",
    currency_code: "ILS",
    currency_symbol: "₪",
    currency_position: "before",
    default_language: "he",
    language_name: "עברית",
    locale: "he-IL",
  },
  TR: {
    country_code: "TR",
    country_name: "Türkiye",
    currency_code: "TRY",
    currency_symbol: "₺",
    currency_position: "after",
    default_language: "tr",
    language_name: "Türkçe",
    locale: "tr-TR",
  },
  ZA: {
    country_code: "ZA",
    country_name: "South Africa",
    currency_code: "ZAR",
    currency_symbol: "R",
    currency_position: "before",
    default_language: "en",
    language_name: "English",
    locale: "en-ZA",
  },
  NG: {
    country_code: "NG",
    country_name: "Nigeria",
    currency_code: "NGN",
    currency_symbol: "₦",
    currency_position: "before",
    default_language: "en",
    language_name: "English",
    locale: "en-NG",
  },
  KE: {
    country_code: "KE",
    country_name: "Kenya",
    currency_code: "KES",
    currency_symbol: "KSh",
    currency_position: "before",
    default_language: "en",
    language_name: "English",
    locale: "en-KE",
  },

  // Asia Pacific
  JP: {
    country_code: "JP",
    country_name: "日本",
    currency_code: "JPY",
    currency_symbol: "¥",
    currency_position: "before",
    default_language: "ja",
    language_name: "日本語",
    locale: "ja-JP",
  },
  KR: {
    country_code: "KR",
    country_name: "대한민국",
    currency_code: "KRW",
    currency_symbol: "₩",
    currency_position: "before",
    default_language: "ko",
    language_name: "한국어",
    locale: "ko-KR",
  },
  CN: {
    country_code: "CN",
    country_name: "中国",
    currency_code: "CNY",
    currency_symbol: "¥",
    currency_position: "before",
    default_language: "zh",
    language_name: "中文",
    locale: "zh-CN",
  },
  TW: {
    country_code: "TW",
    country_name: "台灣",
    currency_code: "TWD",
    currency_symbol: "NT$",
    currency_position: "before",
    default_language: "zh",
    language_name: "中文",
    locale: "zh-TW",
  },
  HK: {
    country_code: "HK",
    country_name: "香港",
    currency_code: "HKD",
    currency_symbol: "HK$",
    currency_position: "before",
    default_language: "zh",
    language_name: "中文",
    locale: "zh-HK",
  },
  SG: {
    country_code: "SG",
    country_name: "Singapore",
    currency_code: "SGD",
    currency_symbol: "S$",
    currency_position: "before",
    default_language: "en",
    language_name: "English",
    locale: "en-SG",
  },
  IN: {
    country_code: "IN",
    country_name: "भारत",
    currency_code: "INR",
    currency_symbol: "₹",
    currency_position: "before",
    default_language: "hi",
    language_name: "हिन्दी",
    locale: "hi-IN",
  },
  ID: {
    country_code: "ID",
    country_name: "Indonesia",
    currency_code: "IDR",
    currency_symbol: "Rp",
    currency_position: "before",
    default_language: "id",
    language_name: "Bahasa Indonesia",
    locale: "id-ID",
  },
  MY: {
    country_code: "MY",
    country_name: "Malaysia",
    currency_code: "MYR",
    currency_symbol: "RM",
    currency_position: "before",
    default_language: "ms",
    language_name: "Bahasa Melayu",
    locale: "ms-MY",
  },
  TH: {
    country_code: "TH",
    country_name: "ประเทศไทย",
    currency_code: "THB",
    currency_symbol: "฿",
    currency_position: "before",
    default_language: "th",
    language_name: "ไทย",
    locale: "th-TH",
  },
  VN: {
    country_code: "VN",
    country_name: "Việt Nam",
    currency_code: "VND",
    currency_symbol: "₫",
    currency_position: "after",
    default_language: "vi",
    language_name: "Tiếng Việt",
    locale: "vi-VN",
  },
  PH: {
    country_code: "PH",
    country_name: "Philippines",
    currency_code: "PHP",
    currency_symbol: "₱",
    currency_position: "before",
    default_language: "en",
    language_name: "English",
    locale: "en-PH",
  },
  AU: {
    country_code: "AU",
    country_name: "Australia",
    currency_code: "AUD",
    currency_symbol: "$",
    currency_position: "before",
    default_language: "en",
    language_name: "English",
    locale: "en-AU",
  },
  NZ: {
    country_code: "NZ",
    country_name: "New Zealand",
    currency_code: "NZD",
    currency_symbol: "$",
    currency_position: "before",
    default_language: "en",
    language_name: "English",
    locale: "en-NZ",
  },
  PK: {
    country_code: "PK",
    country_name: "پاکستان",
    currency_code: "PKR",
    currency_symbol: "₨",
    currency_position: "before",
    default_language: "en",
    language_name: "English",
    locale: "en-PK",
  },
  BD: {
    country_code: "BD",
    country_name: "বাংলাদেশ",
    currency_code: "BDT",
    currency_symbol: "৳",
    currency_position: "before",
    default_language: "bn",
    language_name: "বাংলা",
    locale: "bn-BD",
  },
};

/**
 * Default localization (fallback)
 */
export const DEFAULT_LOCALIZATION: LocalizationInfo = {
  country_code: "US",
  country_name: "United States",
  currency_code: "USD",
  currency_symbol: "$",
  currency_position: "before",
  default_language: "en",
  language_name: "English",
  locale: "en-US",
};

/**
 * Get localization info for a country code
 * Falls back to DEFAULT_LOCALIZATION if country not found
 */
export function getLocalizationByCountry(
  countryCode: string | null | undefined,
): LocalizationInfo {
  if (!countryCode) {
    return DEFAULT_LOCALIZATION;
  }

  const upperCode = countryCode.toUpperCase();
  return COUNTRY_LOCALIZATION[upperCode] || DEFAULT_LOCALIZATION;
}

/**
 * Get language name from language code
 * Returns the code itself if not found
 */
export function getLanguageName(
  languageCode: string | null | undefined,
): string {
  if (!languageCode) {
    return "English";
  }

  const lowerCode = languageCode.toLowerCase();
  return LANGUAGE_NAMES[lowerCode] || languageCode;
}

/**
 * Build complete localization context for creative generation
 * Merges country-based defaults with explicit language override
 */
export function buildLocalizationContext(
  countryCode: string | null | undefined,
  languageCode: string | null | undefined,
): LocalizationInfo {
  const countryInfo = getLocalizationByCountry(countryCode);

  // If explicit language is provided, use it instead of country default
  if (languageCode) {
    const languageName = getLanguageName(languageCode);
    return {
      ...countryInfo,
      default_language: languageCode.toLowerCase(),
      language_name: languageName,
    };
  }

  return countryInfo;
}

/**
 * Format a value with the correct currency symbol and position
 * Example: formatCurrency(100, localization) => "R$ 100" or "100 €"
 */
export function formatCurrencyValue(
  value: number | string,
  localization: LocalizationInfo,
): string {
  const { currency_symbol, currency_position } = localization;

  if (currency_position === "before") {
    return `${currency_symbol} ${value}`;
  }
  return `${value} ${currency_symbol}`;
}

/**
 * Get sample monetary values formatted for a country
 * Used in creative generation for value buttons
 */
export function getSampleValues(localization: LocalizationInfo): {
  raw: string[];
  formatted: string[];
} {
  // Common value ranges that work across cultures
  const rawValues = ["5K", "10K", "20K", "50K"];

  const formatted = rawValues.map((val) =>
    formatCurrencyValue(val, localization),
  );

  return { raw: rawValues, formatted };
}
