import React, { createContext, useContext, useMemo } from 'react'

interface IntlContextValue {
  locale: string
  messages: Record<string, any>
}

const IntlContext = createContext<IntlContextValue>({
  locale: 'pt-BR',
  messages: {},
})

function getByPath(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj)
}

function formatTemplate(template: string, values?: Record<string, any>) {
  if (!values) return template
  return template.replace(/\{(.*?)\}/g, (_, key) => {
    const value = values[key.trim()]
    return value === undefined || value === null ? '' : String(value)
  })
}

export function NextIntlClientProvider({
  children,
  locale,
  messages,
}: {
  children: React.ReactNode
  locale?: string
  messages: Record<string, any>
}) {
  const value = useMemo(
    () => ({
      locale: locale || 'pt-BR',
      messages: messages || {},
    }),
    [locale, messages]
  )

  return <IntlContext.Provider value={value}>{children}</IntlContext.Provider>
}

export function useTranslations(namespace?: string) {
  const { messages } = useContext(IntlContext)
  const scoped = namespace ? getByPath(messages, namespace) || {} : messages

  return (key: string, values?: Record<string, any>) => {
    const candidate = getByPath(scoped, key)
    if (typeof candidate === 'string') {
      return formatTemplate(candidate, values)
    }
    if (candidate === undefined) return key
    return String(candidate)
  }
}

export function useFormatter() {
  const { locale } = useContext(IntlContext)

  return {
    dateTime(value: Date | string | number, options?: Intl.DateTimeFormatOptions) {
      const date = value instanceof Date ? value : new Date(value)
      return new Intl.DateTimeFormat(locale, options).format(date)
    },
    number(value: number, options?: Intl.NumberFormatOptions) {
      return new Intl.NumberFormat(locale, options).format(value)
    },
    relativeTime(value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions) {
      return new Intl.RelativeTimeFormat(locale, options).format(value, unit)
    },
  }
}
