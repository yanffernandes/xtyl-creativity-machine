/**
 * Meta Ads Targeting Constants
 *
 * Complete lists of countries and languages for Meta Ads targeting.
 * Countries use Intl.DisplayNames for automatic Portuguese (Brazilian) names.
 * Languages use Meta's numeric keys with Portuguese translations.
 */

import { COUNTRIES } from '@/shared/constants/countries'

// ============================================
// Countries (250 countries, Portuguese names)
// ============================================

const regionNames = new Intl.DisplayNames(['pt-BR'], { type: 'region' })

/**
 * All countries with Portuguese names for Meta Ads targeting.
 * Uses Intl.DisplayNames API for automatic Portuguese translation.
 * Sorted alphabetically in Portuguese.
 */
export const META_ALL_COUNTRIES: Array<{ key: string; name: string; nameEn: string }> =
  COUNTRIES.map((c) => ({
    key: c.value,
    name: regionNames.of(c.value) || c.label,
    nameEn: c.label,
  })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

/**
 * Filter countries by search term.
 * Matches against: country code, Portuguese name, or English name.
 */
export function filterCountries(search: string): Array<{ key: string; name: string }> {
  if (!search.trim()) return META_ALL_COUNTRIES
  const searchLower = search.toLowerCase().trim()
  return META_ALL_COUNTRIES.filter(
    (c) =>
      c.key.toLowerCase().includes(searchLower) ||
      c.name.toLowerCase().includes(searchLower) ||
      c.nameEn.toLowerCase().includes(searchLower),
  )
}

// ============================================
// Languages (101 Meta languages, Portuguese)
// ============================================

/**
 * All Meta languages with Portuguese names.
 * Meta uses numeric keys (not ISO codes) for ad targeting.
 * Source: Meta Marketing API adlocale search
 */
export const META_ALL_LANGUAGES: Array<{ key: string; name: string; nameEn: string }> = [
  { key: '1', name: 'Chinês (Simplificado)', nameEn: 'Chinese (Simplified)' },
  { key: '2', name: 'Chinês (Tradicional)', nameEn: 'Chinese (Traditional)' },
  { key: '3', name: 'Chinês (Todos)', nameEn: 'Chinese (All)' },
  { key: '4', name: 'Alemão', nameEn: 'German' },
  { key: '5', name: 'Grego', nameEn: 'Greek' },
  { key: '6', name: 'Português', nameEn: 'Portuguese' },
  { key: '7', name: 'Espanhol', nameEn: 'Spanish' },
  { key: '8', name: 'Sueco', nameEn: 'Swedish' },
  { key: '9', name: 'Turco', nameEn: 'Turkish' },
  { key: '10', name: 'Francês', nameEn: 'French' },
  { key: '11', name: 'Hebraico', nameEn: 'Hebrew' },
  { key: '12', name: 'Hindi', nameEn: 'Hindi' },
  { key: '13', name: 'Tcheco', nameEn: 'Czech' },
  { key: '14', name: 'Dinamarquês', nameEn: 'Danish' },
  { key: '15', name: 'Indonésio', nameEn: 'Indonesian' },
  { key: '16', name: 'Italiano', nameEn: 'Italian' },
  { key: '17', name: 'Húngaro', nameEn: 'Hungarian' },
  { key: '18', name: 'Japonês', nameEn: 'Japanese' },
  { key: '19', name: 'Árabe', nameEn: 'Arabic' },
  { key: '20', name: 'Coreano', nameEn: 'Korean' },
  { key: '21', name: 'Malaio', nameEn: 'Malay' },
  { key: '22', name: 'Norueguês (Bokmål)', nameEn: 'Norwegian (bokmal)' },
  { key: '23', name: 'Polonês', nameEn: 'Polish' },
  { key: '24', name: 'Inglês (EUA)', nameEn: 'English (US)' },
  { key: '25', name: 'Inglês (Reino Unido)', nameEn: 'English (UK)' },
  { key: '26', name: 'Romeno', nameEn: 'Romanian' },
  { key: '27', name: 'Eslovaco', nameEn: 'Slovak' },
  { key: '28', name: 'Holandês', nameEn: 'Dutch' },
  { key: '29', name: 'Búlgaro', nameEn: 'Bulgarian' },
  { key: '30', name: 'Catalão', nameEn: 'Catalan' },
  { key: '31', name: 'Finlandês', nameEn: 'Finnish' },
  { key: '32', name: 'Africâner', nameEn: 'Afrikaans' },
  { key: '33', name: 'Russo', nameEn: 'Russian' },
  { key: '34', name: 'Esloveno', nameEn: 'Slovenian' },
  { key: '35', name: 'Tailandês', nameEn: 'Thai' },
  { key: '36', name: 'Ucraniano', nameEn: 'Ukrainian' },
  { key: '37', name: 'Vietnamita', nameEn: 'Vietnamese' },
  { key: '38', name: 'Sérvio', nameEn: 'Serbian' },
  { key: '39', name: 'Croata', nameEn: 'Croatian' },
  { key: '40', name: 'Bengali', nameEn: 'Bengali' },
  { key: '41', name: 'Cebuano', nameEn: 'Cebuano' },
  { key: '42', name: 'Estoniano', nameEn: 'Estonian' },
  { key: '43', name: 'Filipino', nameEn: 'Filipino' },
  { key: '44', name: 'Galego', nameEn: 'Galician' },
  { key: '45', name: 'Guzerate', nameEn: 'Gujarati' },
  { key: '46', name: 'Canarês', nameEn: 'Kannada' },
  { key: '47', name: 'Letão', nameEn: 'Latvian' },
  { key: '48', name: 'Lituano', nameEn: 'Lithuanian' },
  { key: '49', name: 'Malaiala', nameEn: 'Malayalam' },
  { key: '50', name: 'Marati', nameEn: 'Marathi' },
  { key: '51', name: 'Nepalês', nameEn: 'Nepali' },
  { key: '52', name: 'Panjabi', nameEn: 'Punjabi' },
  { key: '53', name: 'Tâmil', nameEn: 'Tamil' },
  { key: '54', name: 'Télugo', nameEn: 'Telugu' },
  { key: '55', name: 'Urdu', nameEn: 'Urdu' },
  { key: '56', name: 'Suaíli', nameEn: 'Swahili' },
  { key: '57', name: 'Zulu', nameEn: 'Zulu' },
  { key: '58', name: 'Galês', nameEn: 'Welsh' },
  { key: '59', name: 'Basco', nameEn: 'Basque' },
  { key: '60', name: 'Islandês', nameEn: 'Icelandic' },
  { key: '61', name: 'Irlandês', nameEn: 'Irish' },
  { key: '62', name: 'Maltês', nameEn: 'Maltese' },
  { key: '63', name: 'Bósnio', nameEn: 'Bosnian' },
  { key: '64', name: 'Albanês', nameEn: 'Albanian' },
  { key: '65', name: 'Macedônio', nameEn: 'Macedonian' },
  { key: '66', name: 'Azerbaijano', nameEn: 'Azerbaijani' },
  { key: '67', name: 'Georgiano', nameEn: 'Georgian' },
  { key: '68', name: 'Cazaque', nameEn: 'Kazakh' },
  { key: '69', name: 'Armênio', nameEn: 'Armenian' },
  { key: '70', name: 'Khmer', nameEn: 'Khmer' },
  { key: '71', name: 'Laociano', nameEn: 'Lao' },
  { key: '72', name: 'Birmanês', nameEn: 'Burmese' },
  { key: '73', name: 'Mongol', nameEn: 'Mongolian' },
  { key: '74', name: 'Cingalês', nameEn: 'Sinhala' },
  { key: '75', name: 'Amárico', nameEn: 'Amharic' },
  { key: '76', name: 'Hauçá', nameEn: 'Hausa' },
  { key: '77', name: 'Igbo', nameEn: 'Igbo' },
  { key: '78', name: 'Iorubá', nameEn: 'Yoruba' },
  { key: '79', name: 'Javanês', nameEn: 'Javanese' },
  { key: '80', name: 'Sundanês', nameEn: 'Sundanese' },
  { key: '81', name: 'Oriá', nameEn: 'Oriya' },
  { key: '82', name: 'Assamês', nameEn: 'Assamese' },
  { key: '83', name: 'Somali', nameEn: 'Somali' },
  { key: '84', name: 'Tigrínia', nameEn: 'Tigrinya' },
  { key: '85', name: 'Frísio', nameEn: 'Frisian' },
  { key: '86', name: 'Luxemburguês', nameEn: 'Luxembourgish' },
  { key: '87', name: 'Gaélico Escocês', nameEn: 'Scots Gaelic' },
  { key: '88', name: 'Quirguiz', nameEn: 'Kyrgyz' },
  { key: '89', name: 'Tajique', nameEn: 'Tajik' },
  { key: '90', name: 'Turcomano', nameEn: 'Turkmen' },
  { key: '91', name: 'Usbeque', nameEn: 'Uzbek' },
  { key: '92', name: 'Pachto', nameEn: 'Pashto' },
  { key: '93', name: 'Curdo', nameEn: 'Kurdish' },
  { key: '94', name: 'Persa', nameEn: 'Persian' },
  { key: '95', name: 'Inglês (Todos)', nameEn: 'English (All)' },
  { key: '96', name: 'Espanhol (Espanha)', nameEn: 'Spanish (Spain)' },
  { key: '97', name: 'Português (Portugal)', nameEn: 'Portuguese (Portugal)' },
  { key: '98', name: 'Português (Brasil)', nameEn: 'Portuguese (Brazil)' },
  { key: '99', name: 'Francês (França)', nameEn: 'French (France)' },
  { key: '100', name: 'Francês (Canadá)', nameEn: 'French (Canada)' },
  { key: '101', name: 'Espanhol (América Latina)', nameEn: 'Spanish (Latin America)' },
].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

/**
 * Filter languages by search term.
 * Matches against: Portuguese name or English name.
 */
export function filterLanguages(search: string): Array<{ key: string; name: string }> {
  if (!search.trim()) return META_ALL_LANGUAGES
  const searchLower = search.toLowerCase().trim()
  return META_ALL_LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(searchLower) ||
      l.nameEn.toLowerCase().includes(searchLower),
  )
}
