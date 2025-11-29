import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { GradientBackground } from "@/components/GradientBackground";
import { QueryProvider } from "@/components/providers/QueryProvider";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange={false}
          >
            <GradientBackground />
            {children}
            <Toaster />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
