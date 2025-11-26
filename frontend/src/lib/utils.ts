import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { colors, spacingPx, breakpoints } from "./design-tokens"

/**
 * Utility function to merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Design Token Helper Functions
 * @version 1.0.0
 * @feature 001-premium-visual-redesign
 */

/**
 * Get color token value for current theme
 * @param token - Color token path (e.g., "surface.primary", "accent.primary")
 * @param theme - Theme mode ("light" or "dark")
 */
export function getColorToken(
  token: string,
  theme: "light" | "dark" = "light"
): string {
  const keys = token.split(".");
  let value: any = colors;

  for (const key of keys) {
    value = value?.[key];
    if (!value) return "";
  }

  return value[theme] || value;
}

/**
 * Get spacing value in pixels
 * @param token - Spacing token (e.g., "md", "lg", "xl")
 */
export function getSpacing(token: keyof typeof spacingPx): number {
  return spacingPx[token];
}

/**
 * Convert pixels to rem units (based on 16px root)
 * @param px - Pixel value
 */
export function pxToRem(px: number): string {
  return `${px / 16}rem`;
}

/**
 * Convert rem to pixel units (based on 16px root)
 * @param rem - Rem value
 */
export function remToPx(rem: number): number {
  return rem * 16;
}

/**
 * Check if current viewport matches breakpoint
 * @param breakpoint - Breakpoint name (e.g., "sm", "md", "lg")
 */
export function isBreakpoint(breakpoint: keyof typeof breakpoints): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth >= breakpoints[breakpoint];
}

/**
 * Get responsive value based on current viewport
 * @param values - Object with breakpoint keys and values
 * @param defaultValue - Default value if no breakpoint matches
 */
export function getResponsiveValue<T>(
  values: Partial<Record<keyof typeof breakpoints | "base", T>>,
  defaultValue: T
): T {
  if (typeof window === "undefined") return defaultValue;

  const sortedBreakpoints = Object.entries(breakpoints).sort(
    ([, a], [, b]) => b - a
  );

  for (const [key, minWidth] of sortedBreakpoints) {
    if (window.innerWidth >= minWidth && values[key as keyof typeof breakpoints]) {
      return values[key as keyof typeof breakpoints] as T;
    }
  }

  return values.base ?? defaultValue;
}

/**
 * Format number with thousands separator
 * @param num - Number to format
 * @param locale - Locale string (default: "en-US")
 */
export function formatNumber(num: number, locale = "en-US"): string {
  return new Intl.NumberFormat(locale).format(num);
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Debounce function calls
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Clamp number between min and max
 * @param num - Number to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 */
export function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}
