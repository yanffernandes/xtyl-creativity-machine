import ptBR from '@/messages/pt-BR.json'
import { defaultLocale } from '@/i18n/config'

export function getRequestConfig(configFactory: any) {
  return configFactory
}

export async function getLocale() {
  return defaultLocale
}

export async function getMessages() {
  return ptBR
}
