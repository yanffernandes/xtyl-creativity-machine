# Quickstart: Premium Visual Redesign

**Phase**: 1 - Design & Contracts
**Date**: 2025-11-24
**Feature**: Premium Visual Redesign

## Overview

This guide helps developers implement the premium visual redesign efficiently. Follow these steps to apply design tokens, customize components, and maintain visual consistency.

---

## Prerequisites

- Node.js 20+ installed
- Frontend dev environment running (`docker-compose -f docker-compose.dev.yml up`)
- Familiarity with Tailwind CSS and Next.js App Router
- Design tokens contract reviewed (`contracts/design-tokens.json`)

---

## Quick Start (5 minutes)

### 1. Install Animation Dependencies

```bash
cd frontend
npm install framer-motion@^10.16.0
```

### 2. Create Design Tokens File

Create `frontend/src/lib/design-tokens.ts`:

```typescript
// Design Tokens - Premium Visual Redesign
// Contract: specs/001-premium-visual-redesign/contracts/design-tokens.json

export const COLORS = {
  surface: {
    primary: { light: '#FAFAF9', dark: '#0A0A0B' },
    secondary: { light: '#F5F5F4', dark: '#18181B' },
    tertiary: { light: '#E7E5E4', dark: '#27272A' },
  },
  border: {
    primary: { light: '#E7E5E4', dark: '#3F3F46' },
  },
  text: {
    primary: { light: '#171717', dark: '#FAFAFA' },
    secondary: { light: '#525252', dark: '#A1A1AA' },
    tertiary: { light: '#A3A3A3', dark: '#71717A' },
  },
  accent: {
    primary: { light: '#8B5CF6', dark: '#A78BFA' },
    success: { light: '#10B981', dark: '#34D399' },
    warning: { light: '#F59E0B', dark: '#FBBF24' },
    error: { light: '#EF4444', dark: '#F87171' },
  },
} as const;

export const SPACING = {
  0: 0,
  px: 1,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const ANIMATIONS = {
  fast: { duration: 150, easing: 'ease-out' },
  base: { duration: 250, easing: 'ease-in-out' },
  slow: { duration: 350, easing: 'ease-in-out' },
} as const;
```

### 3. Update Tailwind Config

Update `frontend/tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'surface-primary': 'rgb(var(--color-surface-primary) / <alpha-value>)',
        'surface-secondary': 'rgb(var(--color-surface-secondary) / <alpha-value>)',
        'surface-tertiary': 'rgb(var(--color-surface-tertiary) / <alpha-value>)',
        'border-primary': 'rgb(var(--color-border-primary) / <alpha-value>)',
        'text-primary': 'rgb(var(--color-text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
        'text-tertiary': 'rgb(var(--color-text-tertiary) / <alpha-value>)',
        'accent-primary': 'rgb(var(--color-accent-primary) / <alpha-value>)',
        'accent-success': 'rgb(var(--color-accent-success) / <alpha-value>)',
        'accent-warning': 'rgb(var(--color-accent-warning) / <alpha-value>)',
        'accent-error': 'rgb(var(--color-accent-error) / <alpha-value>)',
      },
      spacing: {
        'xs': '0.25rem',  // 4px
        'sm': '0.5rem',   // 8px
        'md': '1rem',     // 16px
        'lg': '1.5rem',   // 24px
        'xl': '2rem',     // 32px
        '2xl': '3rem',    // 48px
        '3xl': '4rem',    // 64px
      },
      transitionDuration: {
        'fast': '150ms',
        'base': '250ms',
        'slow': '350ms',
      },
      borderRadius: {
        'subtle': '0.5rem',  // 8px - subtle curves
      },
    },
  },
  plugins: [],
};

export default config;
```

### 4. Add CSS Custom Properties

Update `frontend/src/styles/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Design Tokens - Light Mode */
:root {
  --color-surface-primary: 250 250 249;
  --color-surface-secondary: 245 245 244;
  --color-surface-tertiary: 231 229 228;
  --color-border-primary: 231 229 228;
  --color-text-primary: 23 23 23;
  --color-text-secondary: 82 82 82;
  --color-text-tertiary: 163 163 163;
  --color-accent-primary: 139 92 246;
  --color-accent-success: 16 185 129;
  --color-accent-warning: 245 158 11;
  --color-accent-error: 239 68 68;
}

/* Design Tokens - Dark Mode */
[data-theme="dark"] {
  --color-surface-primary: 10 10 11;
  --color-surface-secondary: 24 24 27;
  --color-surface-tertiary: 39 39 42;
  --color-border-primary: 63 63 70;
  --color-text-primary: 250 250 250;
  --color-text-secondary: 161 161 170;
  --color-text-tertiary: 113 113 122;
  --color-accent-primary: 167 139 250;
  --color-accent-success: 52 211 153;
  --color-accent-warning: 251 191 36;
  --color-accent-error: 248 113 113;
}

/* Base Styles */
body {
  @apply bg-surface-primary text-text-primary;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Smooth Transitions */
* {
  @apply transition-colors duration-base;
}

/* Reduced Motion Support */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 5. Test Visual Tokens

Create a test page to verify tokens:

```tsx
// frontend/src/app/design-test/page.tsx
export default function DesignTestPage() {
  return (
    <div className="p-xl space-y-lg">
      <h1 className="text-6xl font-bold text-text-primary">Premium Design System</h1>

      <div className="space-y-sm">
        <h2 className="text-2xl font-semibold">Colors</h2>
        <div className="grid grid-cols-4 gap-md">
          <div className="h-20 bg-surface-primary border border-border-primary rounded-subtle" />
          <div className="h-20 bg-surface-secondary border border-border-primary rounded-subtle" />
          <div className="h-20 bg-accent-primary rounded-subtle" />
          <div className="h-20 bg-accent-success rounded-subtle" />
        </div>
      </div>

      <div className="space-y-sm">
        <h2 className="text-2xl font-semibold">Typography</h2>
        <p className="text-xs text-text-tertiary">Extra small text (xs)</p>
        <p className="text-sm text-text-secondary">Small text (sm)</p>
        <p className="text-base text-text-primary">Base body text</p>
        <p className="text-lg font-medium">Large emphasized text</p>
        <h3 className="text-3xl font-bold">Heading 3</h3>
      </div>

      <div className="space-y-sm">
        <h2 className="text-2xl font-semibold">Spacing</h2>
        <div className="flex gap-md">
          <div className="p-xs bg-surface-secondary border border-border-primary rounded-subtle">xs</div>
          <div className="p-sm bg-surface-secondary border border-border-primary rounded-subtle">sm</div>
          <div className="p-md bg-surface-secondary border border-border-primary rounded-subtle">md</div>
          <div className="p-lg bg-surface-secondary border border-border-primary rounded-subtle">lg</div>
        </div>
      </div>
    </div>
  );
}
```

Visit `/design-test` to verify tokens are working.

---

## Common Patterns

### Pattern 1: Custom Button (Refined Variant)

```tsx
// frontend/src/components/ui/button.tsx
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className={cn(
        // Base styles
        'inline-flex items-center justify-center rounded-subtle font-medium',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary',
        'disabled:opacity-50 disabled:pointer-events-none',
        'transition-all duration-base',

        // Variants
        variant === 'primary' && 'bg-accent-primary text-white hover:bg-accent-primary/90 shadow-sm',
        variant === 'secondary' && 'bg-surface-secondary text-text-primary hover:bg-surface-tertiary border border-border-primary',
        variant === 'ghost' && 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary',

        // Sizes
        size === 'sm' && 'h-9 px-sm text-sm',
        size === 'md' && 'h-11 px-md text-base',
        size === 'lg' && 'h-13 px-lg text-lg',

        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}
```

### Pattern 2: Custom Loading Spinner

```tsx
// frontend/src/components/loading/spinner.tsx
import { motion } from 'framer-motion';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <motion.div
      className={cn('inline-block border-2 border-t-accent-primary border-r-transparent border-b-accent-primary border-l-transparent rounded-full', sizeClasses[size], className)}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
  );
}
```

### Pattern 3: Modal with Graceful Animation

```tsx
// frontend/src/components/ui/dialog.tsx
import { motion, AnimatePresence } from 'framer-motion';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Dialog({ isOpen, onClose, children }: DialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg"
          >
            <div className="bg-surface-primary border border-border-primary rounded-subtle shadow-lg p-xl">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

### Pattern 4: Empty State

```tsx
// frontend/src/components/empty-states/empty-workspace.tsx
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';

interface EmptyWorkspaceProps {
  onCreateProject: () => void;
}

export function EmptyWorkspace({ onCreateProject }: EmptyWorkspaceProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-xl text-center">
      <div className="w-16 h-16 bg-surface-secondary rounded-subtle flex items-center justify-center mb-lg">
        <PlusIcon className="w-8 h-8 text-text-tertiary" />
      </div>
      <h3 className="text-2xl font-semibold text-text-primary mb-sm">
        No projects yet
      </h3>
      <p className="text-base text-text-secondary mb-lg max-w-md">
        Create your first project to start organizing your creative work.
      </p>
      <Button variant="primary" onClick={onCreateProject}>
        <PlusIcon className="w-5 h-5 mr-2" />
        Create Project
      </Button>
    </div>
  );
}
```

---

## Component Refactoring Checklist

When updating existing components:

- [ ] Replace hard-coded colors with design tokens (`bg-gray-100` → `bg-surface-secondary`)
- [ ] Replace hard-coded spacing with semantic tokens (`p-4` → `p-md`)
- [ ] Add smooth transitions (`transition-all duration-base`)
- [ ] Refine hover/focus states (scale, color changes)
- [ ] Add Framer Motion to complex animations (modals, dropdowns)
- [ ] Ensure WCAG AA contrast (use `design-tokens.json` contrast ratios)
- [ ] Test with reduced-motion preference
- [ ] Verify responsive behavior at all breakpoints
- [ ] Add loading states where appropriate
- [ ] Replace generic spinners with custom `<Spinner />`

---

## Testing Checklist

Before committing:

- [ ] Visual regression test passes (Playwright screenshots)
- [ ] Lighthouse Performance score 90+
- [ ] Lighthouse Accessibility score 100
- [ ] All animations run at 60fps (Chrome DevTools Performance tab)
- [ ] Bundle size increase < 50kb gzipped
- [ ] Works in light + dark mode
- [ ] Responsive at all breakpoints (640px, 768px, 1024px, 1280px, 1536px)
- [ ] Keyboard navigation works (tab, enter, escape)
- [ ] Reduced-motion preference respected

---

## Troubleshooting

### Issue: Colors not applying

**Solution**: Ensure CSS custom properties are defined in `globals.css` and Tailwind config references them correctly. Restart dev server after config changes.

### Issue: Animations janky/laggy

**Solution**: Use `transform` and `opacity` only (GPU-accelerated). Avoid animating `width`, `height`, `top`, `left`. Check Chrome DevTools Performance tab for frame drops.

### Issue: Font loading causes layout shift

**Solution**: Ensure `font-display: swap` and proper fallback metrics in `@font-face`. Use Next.js `next/font` for automatic optimization.

### Issue: Dark mode colors don't match

**Solution**: Verify `[data-theme="dark"]` selector is present in `globals.css`. Ensure root layout applies theme class.

---

## Next Steps

1. Continue to Phase 2: Generate tasks (`/speckit.tasks`)
2. Review constitution compliance (`plan.md` Constitution Check section)
3. Start with P1 user stories (first impression, interactions, color/typography)
4. Test incrementally (don't refactor all components at once)
5. Document any deviations from design tokens in component comments

---

## Resources

- **Design Tokens Contract**: `specs/001-premium-visual-redesign/contracts/design-tokens.json`
- **Research Document**: `specs/001-premium-visual-redesign/research.md`
- **Data Model**: `specs/001-premium-visual-redesign/data-model.md`
- **Feature Spec**: `specs/001-premium-visual-redesign/spec.md`
- **Constitution**: `.specify/memory/constitution.md` (v1.1.0)

---

**Questions or issues?** Refer to constitution principles or open a discussion in the team channel.
