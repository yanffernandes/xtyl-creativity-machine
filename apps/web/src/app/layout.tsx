import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { GradientBackground } from "@/components/GradientBackground";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ConfirmDialogProvider } from "@/components/confirm-dialog";
import { SystemMessageBanner } from "@/components/SystemMessageBanner";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { LocaleProvider } from "@/contexts/LocaleContext";
import { SentryProvider } from "@/components/providers/SentryProvider";

/**
 * Inter Variable Font - Premium Typography
 *
 * Font features enabled:
 * - cv02: Open digits (clearer 0 vs O)
 * - cv03: Open 'a' (more readable)
 * - cv04: Open 'g' (less ambiguous)
 * - cv11: Alternative '1' (clearer)
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap", // Prevents layout shift (FOUT prevention)
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "XTYL Creativity Machine",
  description: "AI-powered creativity platform for professionals",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <SentryProvider>
          <NextIntlClientProvider messages={messages}>
            <LocaleProvider>
              <QueryProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange={false}
              >
                <ConfirmDialogProvider>
                  <SystemMessageBanner />
                  <GradientBackground />
                  {children}
                  <Toaster />
                </ConfirmDialogProvider>
              </ThemeProvider>
            </QueryProvider>
            </LocaleProvider>
          </NextIntlClientProvider>
        </SentryProvider>
      </body>
    </html>
  );
}
