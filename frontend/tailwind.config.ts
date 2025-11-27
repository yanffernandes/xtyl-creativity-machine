import type { Config } from "tailwindcss";
import { spacing, shadows, borderRadius } from "./src/lib/design-tokens";

const config: Config = {
    darkMode: ["class"],
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            // Design Tokens (Ethereal Blue v2.0.0)
            spacing: {
                ...spacing,
            },
            colors: {
                // Keep existing Shadcn/UI CSS variable references
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))'
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                    // Ethereal Blue variants
                    primary: '#5B8DEF',
                    secondary: '#4A7AD9',
                    tertiary: '#7AA5F5',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                chart: {
                    '1': 'hsl(var(--chart-1))',
                    '2': 'hsl(var(--chart-2))',
                    '3': 'hsl(var(--chart-3))',
                    '4': 'hsl(var(--chart-4))',
                    '5': 'hsl(var(--chart-5))'
                },
                // Ethereal Blue semantic tokens
                surface: {
                    primary: 'var(--surface-primary)',
                    secondary: 'var(--surface-secondary)',
                    tertiary: 'var(--surface-tertiary)',
                },
                'border-primary': 'var(--border-primary)',
                text: {
                    primary: 'var(--text-primary)',
                    secondary: 'var(--text-secondary)',
                    tertiary: 'var(--text-tertiary)',
                },
                'accent-primary': 'var(--accent-primary)',
                'accent-success': 'var(--accent-success)',
                'accent-warning': 'var(--accent-warning)',
                'accent-error': 'var(--accent-error)',
            },
            boxShadow: {
                // Standard shadows from design tokens
                sm: shadows.sm,
                base: shadows.base,
                md: shadows.md,
                lg: shadows.lg,
                xl: shadows.xl,
                '2xl': shadows['2xl'],
                // Glass shadows
                'glass-sm': '0 8px 32px rgba(0, 0, 0, 0.04)',
                'glass-md': '0 8px 32px rgba(31, 38, 135, 0.15)',
                'glass-lg': '0 12px 48px rgba(91, 141, 239, 0.2)',
                'glass-inset': 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                // Dark mode glass shadows
                'glass-dark-sm': '0 8px 32px rgba(0, 0, 0, 0.3)',
                'glass-dark-md': '0 8px 32px rgba(0, 0, 0, 0.4)',
                'glass-dark-lg': '0 12px 48px rgba(91, 141, 239, 0.15)',
                // Accent glow shadows
                'accent-sm': '0 4px 12px rgba(91, 141, 239, 0.15)',
                'accent-md': '0 8px 24px rgba(91, 141, 239, 0.2)',
                'accent-lg': '0 12px 48px rgba(91, 141, 239, 0.25)',
            },
            borderRadius: {
                ...borderRadius,
                // Keep Shadcn/UI radius variables
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
            // Typography scale (1.25 ratio - major third)
            fontSize: {
                xs: ['0.75rem', { lineHeight: '1rem', fontWeight: '500', letterSpacing: '0.01em' }],
                sm: ['0.875rem', { lineHeight: '1.25rem' }],
                base: ['1rem', { lineHeight: '1.5rem' }],
                lg: ['1.125rem', { lineHeight: '1.75rem', fontWeight: '500' }],
                xl: ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600', letterSpacing: '-0.01em' }],
                '2xl': ['1.5rem', { lineHeight: '2rem', fontWeight: '600', letterSpacing: '-0.01em' }],
                '3xl': ['1.875rem', { lineHeight: '2.25rem', fontWeight: '700', letterSpacing: '-0.02em' }],
                '4xl': ['2.25rem', { lineHeight: '2.5rem', fontWeight: '700', letterSpacing: '-0.02em' }],
                '5xl': ['3rem', { lineHeight: '1', fontWeight: '700', letterSpacing: '-0.03em' }],
                '6xl': ['3.75rem', { lineHeight: '1', fontWeight: '800', letterSpacing: '-0.03em' }],
            },
            // Animation durations
            transitionDuration: {
                fast: '150ms',
                base: '250ms',
                slow: '350ms',
                slower: '500ms',
            },
            // Letter spacing for headings
            letterSpacing: {
                tighter: '-0.03em',
                tight: '-0.02em',
                normal: '0',
                wide: '0.01em',
            },
            // Backdrop blur utilities
            backdropBlur: {
                xs: '2px',
                glass: '24px',
                'glass-intense': '32px',
            },
            // Background gradients
            backgroundImage: {
                'gradient-light': 'linear-gradient(135deg, #EFF6FF 0%, #E0E7FF 50%, #F3E8FF 100%)',
                'gradient-dark': 'linear-gradient(135deg, #0A0E14 0%, #0F1419 50%, #14191F 100%)',
                'gradient-orb-primary': 'radial-gradient(circle, rgba(91, 141, 239, 0.3) 0%, transparent 70%)',
                'gradient-orb-secondary': 'radial-gradient(circle, rgba(122, 165, 245, 0.3) 0%, transparent 70%)',
                'gradient-orb-tertiary': 'radial-gradient(circle, rgba(74, 122, 217, 0.2) 0%, transparent 70%)',
            },
            // Keyframe animations
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0) scale(1)' },
                    '50%': { transform: 'translateY(-20px) scale(1.05)' },
                },
                'fade-in': {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                'slide-up': {
                    from: { transform: 'translateY(20px)', opacity: '0' },
                    to: { transform: 'translateY(0)', opacity: '1' },
                },
            },
            animation: {
                'float-slow': 'float 20s ease-in-out infinite',
                'float-medium': 'float 15s ease-in-out infinite',
                'float-fast': 'float 10s ease-in-out infinite',
                'fade-in': 'fade-in 0.3s ease-out',
                'slide-up': 'slide-up 0.4s ease-out',
            },
        }
    },
    plugins: [
        require("tailwindcss-animate"),
        require("@tailwindcss/typography"),
        // Glass morphism utilities
        function({ addUtilities }: any) {
            addUtilities({
                '.glass': {
                    'background': 'rgba(255, 255, 255, 0.4)',
                    'backdrop-filter': 'blur(24px) saturate(180%)',
                    '-webkit-backdrop-filter': 'blur(24px) saturate(180%)',
                    'border': '1px solid rgba(255, 255, 255, 0.6)',
                },
                '.glass-dark': {
                    'background': 'rgba(255, 255, 255, 0.03)',
                    'backdrop-filter': 'blur(24px) saturate(180%)',
                    '-webkit-backdrop-filter': 'blur(24px) saturate(180%)',
                    'border': '1px solid rgba(255, 255, 255, 0.1)',
                },
                '.glass-subtle': {
                    'background': 'rgba(255, 255, 255, 0.3)',
                    'backdrop-filter': 'blur(20px) saturate(180%)',
                    '-webkit-backdrop-filter': 'blur(20px) saturate(180%)',
                    'border': '1px solid rgba(255, 255, 255, 0.5)',
                },
                '.glass-strong': {
                    'background': 'rgba(255, 255, 255, 0.7)',
                    'backdrop-filter': 'blur(32px) saturate(180%)',
                    '-webkit-backdrop-filter': 'blur(32px) saturate(180%)',
                    'border': '1px solid rgba(255, 255, 255, 0.8)',
                },
            })
        },
    ],
};
export default config;
