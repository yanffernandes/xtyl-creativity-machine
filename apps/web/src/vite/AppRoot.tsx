import React, { useMemo } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/components/theme-provider'
import { GradientBackground } from '@/components/GradientBackground'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { ConfirmDialogProvider } from '@/components/confirm-dialog'
import { SystemMessageBanner } from '@/components/SystemMessageBanner'
import { LocaleProvider } from '@/contexts/LocaleContext'
import { SentryProvider } from '@/components/providers/SentryProvider'
import { NextIntlClientProvider } from 'next-intl'
import { localeStorage } from '@/i18n/storage'
import { defaultLocale } from '@/i18n/config'
import ptBR from '@/messages/pt-BR.json'
import en from '@/messages/en.json'
import { RouterProvider, useRouteMatch } from './router'
import { renderMatchedRoute } from './routes'

function AppRouteRenderer() {
  const match = useRouteMatch()
  return <>{renderMatchedRoute(match)}</>
}

export function AppRoot() {
  const locale = localeStorage.get() || defaultLocale
  const messages = useMemo(() => {
    return locale === 'en' ? en : ptBR
  }, [locale])

  return (
    <SentryProvider>
      <NextIntlClientProvider locale={locale} messages={messages as Record<string, unknown>}>
        <LocaleProvider>
          <QueryProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
              <ConfirmDialogProvider>
                <SystemMessageBanner />
                <GradientBackground />
                <RouterProvider>
                  <AppRouteRenderer />
                </RouterProvider>
                <Toaster />
              </ConfirmDialogProvider>
            </ThemeProvider>
          </QueryProvider>
        </LocaleProvider>
      </NextIntlClientProvider>
    </SentryProvider>
  )
}
