"use client"

/**
 * XTYL Premium Theme Provider
 *
 * Provides theme context with dark mode support.
 * Uses next-themes for seamless SSR and client-side theme management.
 *
 * @version 1.0.0
 * @feature 001-premium-visual-redesign
 */

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

type ThemeProviderProps = Parameters<typeof NextThemesProvider>[0]

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
