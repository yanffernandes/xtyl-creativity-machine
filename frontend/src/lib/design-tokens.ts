/**
 * XTYL Design Tokens - Ethereal Blue + Liquid Glass (2025)
 *
 * Centralized design system tokens inspired by Raycast, Apple Liquid Glass,
 * and modern UI/UX trends. Replaces the previous Emerald Fresh palette.
 *
 * @version 2.0.0
 * @feature 001-premium-visual-redesign
 * @date 2025-11-25
 * @wcagLevel AA
 */

// ============================================================================
// COLORS
// ============================================================================

export const colors = {
  // Accent Colors - Ethereal Blue (Professional & Trustworthy)
  accent: {
    primary: {
      light: '#5B8DEF', // Ethereal Blue
      dark: '#5B8DEF',  // Same in dark mode
    },
    secondary: {
      light: '#4A7AD9', // Darker Blue
      dark: '#4A7AD9',
    },
    tertiary: {
      light: '#7AA5F5', // Lighter Blue
      dark: '#7AA5F5',
    },
    hover: {
      light: '#4A7AD9',
      dark: '#7AA5F5',
    },
    active: {
      light: '#3B6BC8',
      dark: '#8AB4F7',
    },
  },

  // Semantic Colors
  success: {
    light: '#10B981', // Emerald 500
    dark: '#34D399',  // Emerald 400
  },
  warning: {
    light: '#F59E0B', // Amber 500
    dark: '#FBBF24',  // Amber 400
  },
  error: {
    light: '#EF4444', // Red 500
    dark: '#F87171',  // Red 400
  },
  info: {
    light: '#3B82F6', // Blue 500
    dark: '#60A5FA',  // Blue 400
  },

  // Surface Colors - Light Mode
  surface: {
    light: {
      primary: '#FFFFFF',
      secondary: '#F9FAFB',
      tertiary: '#F5F8FB',
    },
    dark: {
      primary: '#0A0E14',
      secondary: '#151A23',
      tertiary: '#1E232D',
    },
  },

  // Glass Effect Colors
  glass: {
    light: {
      // Backgrounds
      subtle: 'rgba(255, 255, 255, 0.3)',
      medium: 'rgba(255, 255, 255, 0.4)',
      strong: 'rgba(255, 255, 255, 0.7)',
      // Borders
      border: 'rgba(255, 255, 255, 0.6)',
      borderSubtle: 'rgba(0, 0, 0, 0.05)',
      borderStrong: 'rgba(255, 255, 255, 0.8)',
    },
    dark: {
      // Backgrounds
      subtle: 'rgba(255, 255, 255, 0.02)',
      medium: 'rgba(255, 255, 255, 0.03)',
      strong: 'rgba(255, 255, 255, 0.08)',
      // Borders
      border: 'rgba(255, 255, 255, 0.1)',
      borderSubtle: 'rgba(255, 255, 255, 0.05)',
      borderStrong: 'rgba(255, 255, 255, 0.15)',
    },
  },

  // Text Colors
  text: {
    light: {
      primary: '#0A0E14',
      secondary: '#4A5568',
      tertiary: '#718096',
      muted: '#A0AEC0',
    },
    dark: {
      primary: '#F5F7FA',
      secondary: '#A0AEC0',
      tertiary: '#718096',
      muted: '#4A5568',
    },
  },

  // Border Colors
  border: {
    light: {
      primary: '#E7E5E4',
      secondary: '#F5F5F4',
      accent: 'rgba(91, 141, 239, 0.2)',
    },
    dark: {
      primary: '#3F3F46',
      secondary: '#27272A',
      accent: 'rgba(91, 141, 239, 0.3)',
    },
  },

  // Gradient Orbs (Animated Background Elements)
  orbs: {
    primary: 'rgba(91, 141, 239, 0.3)',
    secondary: 'rgba(122, 165, 245, 0.3)',
    tertiary: 'rgba(74, 122, 217, 0.2)',
  },
} as const

// ============================================================================
// SPACING
// ============================================================================

export const spacing = {
  0: '0rem',
  px: '0.0625rem', // 1px
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
  '4xl': '5rem',   // 80px
  '5xl': '6rem',   // 96px
} as const

// Pixel values for calculations
export const spacingPx = {
  0: 0,
  px: 1,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 80,
  '5xl': 96,
} as const

// ============================================================================
// BORDER RADIUS (Soft Corners - Apple/Raycast Style)
// ============================================================================

export const borderRadius = {
  none: '0',
  sm: '0.375rem',  // 6px (increased from 4px)
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',
} as const

// ============================================================================
// SHADOWS (Glassmorphism & Depth)
// ============================================================================

export const shadows = {
  // Standard Shadows
  sm: '0 1px 3px rgba(0, 0, 0, 0.04)',
  base: '0 2px 6px rgba(0, 0, 0, 0.05)',
  md: '0 4px 12px rgba(0, 0, 0, 0.06)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.08)',
  xl: '0 20px 60px rgba(0, 0, 0, 0.12)',
  '2xl': '0 24px 80px rgba(0, 0, 0, 0.15)',

  // Glass Shadows (Light Mode)
  glass: {
    sm: '0 8px 32px rgba(0, 0, 0, 0.04)',
    md: '0 8px 32px rgba(31, 38, 135, 0.15)',
    lg: '0 12px 48px rgba(91, 141, 239, 0.2)',
    inset: 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
  },

  // Glass Shadows (Dark Mode)
  glassDark: {
    sm: '0 8px 32px rgba(0, 0, 0, 0.3)',
    md: '0 8px 32px rgba(0, 0, 0, 0.4)',
    lg: '0 12px 48px rgba(91, 141, 239, 0.15)',
    inset: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  },

  // Accent Shadows (Blue Glow)
  accent: {
    sm: '0 4px 12px rgba(91, 141, 239, 0.15)',
    md: '0 8px 24px rgba(91, 141, 239, 0.2)',
    lg: '0 12px 48px rgba(91, 141, 239, 0.25)',
  },
} as const

// ============================================================================
// TYPOGRAPHY (Bold Headings - Apple 2025 Style)
// ============================================================================

export const typography = {
  xs: {
    fontSize: '0.75rem',    // 12px
    lineHeight: '1rem',     // 16px
    fontWeight: 500,        // Medium
    letterSpacing: '0.01em', // Slightly wide
  },
  sm: {
    fontSize: '0.875rem',   // 14px
    lineHeight: '1.25rem',  // 20px
    fontWeight: 400,
    letterSpacing: 'normal',
  },
  base: {
    fontSize: '1rem',       // 16px
    lineHeight: '1.5rem',   // 24px
    fontWeight: 400,
    letterSpacing: 'normal',
  },
  lg: {
    fontSize: '1.125rem',   // 18px
    lineHeight: '1.75rem',  // 28px
    fontWeight: 500,
    letterSpacing: 'normal',
  },
  xl: {
    fontSize: '1.25rem',    // 20px
    lineHeight: '1.75rem',  // 28px
    fontWeight: 600,        // Semibold
    letterSpacing: '-0.01em',
  },
  '2xl': {
    fontSize: '1.5rem',     // 24px
    lineHeight: '2rem',     // 32px
    fontWeight: 600,        // Semibold
    letterSpacing: '-0.01em',
  },
  '3xl': {
    fontSize: '1.875rem',   // 30px
    lineHeight: '2.25rem',  // 36px
    fontWeight: 700,        // Bold
    letterSpacing: '-0.02em',
  },
  '4xl': {
    fontSize: '2.25rem',    // 36px
    lineHeight: '2.5rem',   // 40px
    fontWeight: 700,        // Bold
    letterSpacing: '-0.02em',
  },
  '5xl': {
    fontSize: '3rem',       // 48px
    lineHeight: '1',
    fontWeight: 700,        // Bold
    letterSpacing: '-0.03em',
  },
  '6xl': {
    fontSize: '3.75rem',    // 60px
    lineHeight: '1',
    fontWeight: 800,        // Extrabold
    letterSpacing: '-0.03em',
  },
} as const

// ============================================================================
// ANIMATIONS (Smooth & Fluid)
// ============================================================================

export const animations = {
  transition: {
    fast: {
      duration: 150,
      easing: 'ease-out',
    },
    base: {
      duration: 250,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)', // Smooth
    },
    slow: {
      duration: 350,
      easing: 'ease-in-out',
    },
    slower: {
      duration: 500,
      easing: 'ease-in-out',
    },
  },
  spring: {
    gentle: {
      stiffness: 80,
      damping: 20,
      mass: 10,
    },
    bouncy: {
      stiffness: 100,
      damping: 10,
      mass: 5,
    },
    smooth: {
      stiffness: 300,
      damping: 30,
      mass: 1,
    },
  },
  // Keyframe presets
  keyframes: {
    float: {
      '0%, 100%': { transform: 'translateY(0) scale(1)' },
      '50%': { transform: 'translateY(-20px) scale(1.05)' },
    },
    fadeIn: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    slideUp: {
      from: { transform: 'translateY(20px)', opacity: 0 },
      to: { transform: 'translateY(0)', opacity: 1 },
    },
  },
} as const

// ============================================================================
// BREAKPOINTS
// ============================================================================

export const breakpoints = {
  xs: 475,
  sm: 640,  // Large phones (landscape)
  md: 768,  // Tablets (portrait)
  lg: 1024, // Tablets (landscape), small laptops
  xl: 1280, // Desktops, large laptops
  '2xl': 1536, // Large desktops, wide monitors
} as const

// ============================================================================
// Z-INDEX LAYERS
// ============================================================================

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  popover: 50,
  toast: 60,
  tooltip: 70,
} as const

// ============================================================================
// GLASSMORPHISM PRESETS
// ============================================================================

export const glassPresets = {
  // Light Mode
  light: {
    subtle: {
      background: 'rgba(255, 255, 255, 0.3)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.5)',
    },
    medium: {
      background: 'rgba(255, 255, 255, 0.4)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.6)',
    },
    strong: {
      background: 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(32px) saturate(180%)',
      WebkitBackdropFilter: 'blur(32px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.8)',
    },
  },

  // Dark Mode
  dark: {
    subtle: {
      background: 'rgba(255, 255, 255, 0.02)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
    },
    medium: {
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    strong: {
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(32px) saturate(180%)',
      WebkitBackdropFilter: 'blur(32px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
    },
  },
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get glass effect styles based on mode and intensity
 */
export function getGlassEffect(
  mode: 'light' | 'dark',
  intensity: 'subtle' | 'medium' | 'strong' = 'medium'
) {
  return glassPresets[mode][intensity]
}

/**
 * Get responsive spacing value
 */
export function getSpacing(...values: (keyof typeof spacing)[]): string {
  return values.map(v => spacing[v]).join(' ')
}

/**
 * Get shadow based on mode
 */
export function getShadow(variant: 'sm' | 'md' | 'lg', mode: 'light' | 'dark' = 'light') {
  if (mode === 'dark') {
    return shadows.glassDark[variant]
  }
  return shadows.glass[variant]
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ColorToken = typeof colors
export type SpacingToken = typeof spacing
export type TypographyToken = typeof typography
export type AnimationToken = typeof animations
export type BreakpointToken = typeof breakpoints
export type ShadowToken = typeof shadows
export type BorderRadiusToken = typeof borderRadius
export type GlassPresetToken = typeof glassPresets

// ============================================================================
// METADATA
// ============================================================================

export const tokenMetadata = {
  version: '2.0.0',
  date: '2025-11-25',
  feature: '001-premium-visual-redesign',
  designSystem: 'Ethereal Blue + Liquid Glass',
  previousSystem: 'Emerald Fresh',
  inspiration: 'Raycast, Apple Liquid Glass, macOS Sequoia',
  wcagLevel: 'AA',
  colorPalette: 'Ethereal Blue (#5B8DEF)',
  spacingScale: '8px base grid',
  typographyScale: '1.25 ratio (major third)',
  animationPhilosophy: 'Smooth, fluid, spring-based < 400ms',
  responsiveStrategy: 'Mobile-first, progressive enhancement',
  glassIntensity: 'backdrop-blur 24-32px, saturate 180%',
} as const

// Default export for convenience
export default {
  colors,
  spacing,
  spacingPx,
  borderRadius,
  shadows,
  typography,
  animations,
  breakpoints,
  zIndex,
  glassPresets,
  metadata: tokenMetadata,
}
