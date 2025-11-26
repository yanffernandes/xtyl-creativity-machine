/**
 * XTYL Accessibility Utilities
 *
 * WCAG AA compliance verification and utilities.
 *
 * @version 1.0.0
 * @feature 001-premium-visual-redesign
 */

import { colors } from "./design-tokens";

/**
 * Calculate relative luminance of a color
 * @param hex - Hex color string (e.g., "#FFFFFF")
 * @returns Relative luminance value (0-1)
 */
export function getRelativeLuminance(hex: string): number {
  // Remove # if present
  const cleanHex = hex.replace("#", "");

  // Convert hex to RGB
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

  // Apply gamma correction
  const [rLinear, gLinear, bLinear] = [r, g, b].map((val) =>
    val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  );

  // Calculate relative luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate contrast ratio between two colors
 * @param color1 - First hex color
 * @param color2 - Second hex color
 * @returns Contrast ratio (1-21)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color combination meets WCAG AA standards
 * @param foreground - Foreground hex color
 * @param background - Background hex color
 * @param level - WCAG level ("AA" or "AAA")
 * @param isLargeText - Whether text is 18px+ or 14px+ bold
 * @returns Whether combination passes WCAG standards
 */
export function meetsWCAG(
  foreground: string,
  background: string,
  level: "AA" | "AAA" = "AA",
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background);

  const thresholds = {
    AA: isLargeText ? 3 : 4.5,
    AAA: isLargeText ? 4.5 : 7,
  };

  return ratio >= thresholds[level];
}

/**
 * Verify all design tokens meet WCAG AA
 * @returns Verification results with failing combinations
 */
export function verifyDesignTokenAccessibility(): {
  passed: boolean;
  results: Array<{
    foreground: string;
    background: string;
    ratio: number;
    passed: boolean;
    usage: string;
  }>;
} {
  const results: Array<{
    foreground: string;
    background: string;
    ratio: number;
    passed: boolean;
    usage: string;
  }> = [];

  // Test light mode
  const lightTests = [
    {
      fg: colors.text.light.primary,
      bg: colors.surface.light.primary,
      usage: "Primary text on primary surface (light)",
    },
    {
      fg: colors.text.light.secondary,
      bg: colors.surface.light.primary,
      usage: "Secondary text on primary surface (light)",
    },
    {
      fg: colors.text.light.tertiary,
      bg: colors.surface.light.primary,
      usage: "Tertiary text on primary surface (light)",
    },
    {
      fg: colors.accent.primary.light,
      bg: colors.surface.light.primary,
      usage: "Accent primary on primary surface (light)",
    },
    {
      fg: colors.success.light,
      bg: colors.surface.light.primary,
      usage: "Success accent on primary surface (light)",
    },
    {
      fg: colors.warning.light,
      bg: colors.surface.light.primary,
      usage: "Warning accent on primary surface (light)",
    },
    {
      fg: colors.error.light,
      bg: colors.surface.light.primary,
      usage: "Error accent on primary surface (light)",
    },
  ];

  // Test dark mode
  const darkTests = [
    {
      fg: colors.text.dark.primary,
      bg: colors.surface.dark.primary,
      usage: "Primary text on primary surface (dark)",
    },
    {
      fg: colors.text.dark.secondary,
      bg: colors.surface.dark.primary,
      usage: "Secondary text on primary surface (dark)",
    },
    {
      fg: colors.text.dark.tertiary,
      bg: colors.surface.dark.primary,
      usage: "Tertiary text on primary surface (dark)",
    },
    {
      fg: colors.accent.primary.dark,
      bg: colors.surface.dark.primary,
      usage: "Accent primary on primary surface (dark)",
    },
    {
      fg: colors.success.dark,
      bg: colors.surface.dark.primary,
      usage: "Success accent on primary surface (dark)",
    },
    {
      fg: colors.warning.dark,
      bg: colors.surface.dark.primary,
      usage: "Warning accent on primary surface (dark)",
    },
    {
      fg: colors.error.dark,
      bg: colors.surface.dark.primary,
      usage: "Error accent on primary surface (dark)",
    },
  ];

  [...lightTests, ...darkTests].forEach(({ fg, bg, usage }) => {
    const ratio = getContrastRatio(fg, bg);
    const passed = meetsWCAG(fg, bg, "AA", false);

    results.push({
      foreground: fg,
      background: bg,
      ratio: Math.round(ratio * 100) / 100,
      passed,
      usage,
    });
  });

  const allPassed = results.every((r) => r.passed);

  return { passed: allPassed, results };
}

/**
 * Get readable color contrast (black or white) for a background
 * @param backgroundColor - Background hex color
 * @returns "#000000" or "#FFFFFF" depending on which has better contrast
 */
export function getReadableColor(backgroundColor: string): string {
  const blackRatio = getContrastRatio("#000000", backgroundColor);
  const whiteRatio = getContrastRatio("#FFFFFF", backgroundColor);

  return blackRatio > whiteRatio ? "#000000" : "#FFFFFF";
}
