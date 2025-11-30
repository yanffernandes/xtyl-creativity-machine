# Data Model: Design Tokens

**Phase**: 1 - Design & Contracts
**Date**: 2025-11-24
**Feature**: Premium Visual Redesign

## Overview

This document defines the design token schema for the premium visual redesign. Design tokens are the atomic design decisions (colors, spacing, typography) that establish visual consistency across the application.

**Important**: This is NOT a database schema. Design tokens are code-level constants managed in TypeScript/CSS, not stored in a database.

---

## Design Token Entities

### Entity: ColorToken

Represents a color value in the design system.

**Attributes**:
- `name`: string - Semantic token name (e.g., "surface-primary", "text-secondary")
- `light`: string - Hex color value for light mode (e.g., "#FAFAF9")
- `dark`: string - Hex color value for dark mode (e.g., "#0A0A0B")
- `category`: enum - Color category: "neutral" | "semantic" | "accent"
- `usage`: string - When to use this color (e.g., "Main background for pages")
- `contrastRatio`: number - Minimum contrast ratio with text (e.g., 16.0)

**Example**:
```typescript
{
  name: "surface-primary",
  light: "#FAFAF9",
  dark: "#0A0A0B",
  category: "neutral",
  usage: "Main background for pages and modals",
  contrastRatio: 16.0
}
```

**Validation Rules**:
- `name` must be kebab-case
- `light` and `dark` must be valid hex colors (#RRGGBB)
- `contrastRatio` must be >= 3.0 for UI elements, >= 4.5 for text
- `category` must be one of defined enum values

**State Transitions**: N/A (static design tokens)

---

### Entity: SpacingToken

Represents a spacing value in the design system (8px grid).

**Attributes**:
- `name`: string - Semantic token name (e.g., "space-md", "space-xl")
- `value`: number - Pixel value (e.g., 16)
- `rem`: string - Rem equivalent (e.g., "1rem")
- `usage`: string - When to use this spacing (e.g., "Default spacing between elements")

**Example**:
```typescript
{
  name: "space-md",
  value: 16,
  rem: "1rem",
  usage: "Default spacing between elements"
}
```

**Validation Rules**:
- `value` must be divisible by 4 (enforces 4px/8px grid)
- `name` must follow space-{size} pattern
- `rem` must accurately reflect `value / 16`

**State Transitions**: N/A (static design tokens)

---

### Entity: TypographyToken

Represents a typography style in the design system.

**Attributes**:
- `name`: string - Semantic token name (e.g., "text-base", "text-2xl")
- `fontSize`: string - CSS font-size (e.g., "1rem", "1.5rem")
- `lineHeight`: string - CSS line-height (e.g., "1.5rem", "2rem")
- `fontWeight`: number - Font weight (400, 500, 600, 700, 800)
- `letterSpacing`: string - Optional letter spacing (e.g., "-0.01em")
- `usage`: string - When to use this style (e.g., "Body text, paragraphs")

**Example**:
```typescript
{
  name: "text-base",
  fontSize: "1rem",
  lineHeight: "1.5rem",
  fontWeight: 400,
  letterSpacing: "normal",
  usage: "Body text, paragraphs"
}
```

**Validation Rules**:
- `fontSize` must use rem units
- `fontWeight` must be 100-900 (multiples of 100)
- `lineHeight` must be >= `fontSize` (prevents clipping)

**State Transitions**: N/A (static design tokens)

---

### Entity: AnimationPreset

Represents an animation configuration preset.

**Attributes**:
- `name`: string - Preset name (e.g., "transition-base", "spring-gentle")
- `type`: enum - Animation type: "transition" | "spring"
- `duration`: number - Duration in milliseconds (e.g., 250)
- `easing`: string - CSS easing function (e.g., "ease-in-out") or spring config
- `usage`: string - When to use this preset (e.g., "Focus states, dropdowns")

**Example (Transition)**:
```typescript
{
  name: "transition-base",
  type: "transition",
  duration: 250,
  easing: "ease-in-out",
  usage: "Focus states, dropdowns"
}
```

**Example (Spring)**:
```typescript
{
  name: "spring-gentle",
  type: "spring",
  duration: null,
  easing: "spring(80, 20, 10)",
  usage: "Subtle bounces, modal entrances"
}
```

**Validation Rules**:
- `duration` required for "transition", null for "spring"
- `easing` must be valid CSS easing or spring() config
- `duration` must be < 500ms (keep interactions snappy)

**State Transitions**: N/A (static design tokens)

---

### Entity: BreakpointToken

Represents a responsive design breakpoint.

**Attributes**:
- `name`: string - Breakpoint name (e.g., "sm", "md", "lg")
- `minWidth`: number - Minimum width in pixels (e.g., 640)
- `description`: string - Target devices (e.g., "Tablets (portrait)")

**Example**:
```typescript
{
  name: "md",
  minWidth: 768,
  description: "Tablets (portrait)"
}
```

**Validation Rules**:
- `minWidth` must be in ascending order across breakpoints
- `name` must match Tailwind defaults (sm, md, lg, xl, 2xl)

**State Transitions**: N/A (static design tokens)

---

## Relationships

**Design tokens do not have traditional entity relationships** (no foreign keys or joins). However, they have semantic relationships:

- **ColorToken** → **TypographyToken**: Text colors reference color tokens
- **SpacingToken** → Component layouts: Spacing values are used consistently
- **TypographyToken** → **BreakpointToken**: Font sizes may scale at different breakpoints
- **AnimationPreset** → Component interactions: Components reference animation presets

These relationships are enforced through naming conventions and usage guidelines, not database constraints.

---

## Design Token Schema (TypeScript)

```typescript
// frontend/src/lib/design-tokens.ts

export interface ColorToken {
  name: string;
  light: string;
  dark: string;
  category: 'neutral' | 'semantic' | 'accent';
  usage: string;
  contrastRatio: number;
}

export interface SpacingToken {
  name: string;
  value: number;
  rem: string;
  usage: string;
}

export interface TypographyToken {
  name: string;
  fontSize: string;
  lineHeight: string;
  fontWeight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  letterSpacing?: string;
  usage: string;
}

export interface AnimationPreset {
  name: string;
  type: 'transition' | 'spring';
  duration: number | null;
  easing: string;
  usage: string;
}

export interface BreakpointToken {
  name: string;
  minWidth: number;
  description: string;
}

export interface DesignTokens {
  colors: ColorToken[];
  spacing: SpacingToken[];
  typography: TypographyToken[];
  animations: AnimationPreset[];
  breakpoints: BreakpointToken[];
}
```

---

## Token Naming Conventions

**Colors**:
- Pattern: `{category}-{emphasis}` (e.g., `surface-primary`, `text-secondary`)
- Categories: surface, border, text, accent
- Emphasis: primary, secondary, tertiary (or semantic: success, warning, error)

**Spacing**:
- Pattern: `space-{size}` (e.g., `space-md`, `space-xl`)
- Sizes: xs (4px), sm (8px), md (16px), lg (24px), xl (32px), 2xl (48px), 3xl (64px)

**Typography**:
- Pattern: `text-{size}` (e.g., `text-base`, `text-2xl`)
- Matches Tailwind defaults for consistency

**Animations**:
- Pattern: `{type}-{characteristic}` (e.g., `transition-fast`, `spring-bouncy`)
- Types: transition, spring
- Characteristics: fast, base, slow, gentle, bouncy

**Breakpoints**:
- Pattern: Tailwind defaults: `sm`, `md`, `lg`, `xl`, `2xl`

---

## Implementation Notes

**Storage**: Design tokens are managed in code (`frontend/src/lib/design-tokens.ts`), not in a database. They are compile-time constants that get transformed into:

1. **Tailwind CSS configuration** (`tailwind.config.ts`):
   ```typescript
   theme: {
     extend: {
       colors: {
         'surface-primary': 'rgb(var(--color-surface-primary) / <alpha-value>)',
         // ... other colors
       },
       spacing: {
         'xs': '0.25rem',
         'sm': '0.5rem',
         // ... other spacing
       }
     }
   }
   ```

2. **CSS Custom Properties** (`globals.css`):
   ```css
   :root {
     --color-surface-primary: 250 250 249; /* RGB */
     --color-text-primary: 23 23 23;
     /* ... other tokens */
   }

   [data-theme="dark"] {
     --color-surface-primary: 10 10 11;
     --color-text-primary: 250 250 250;
   }
   ```

3. **TypeScript Constants** (for programmatic access):
   ```typescript
   export const SPACING = {
     xs: 4,
     sm: 8,
     md: 16,
     // ... other spacing
   } as const;
   ```

**Validation**: Design tokens are validated at build time (TypeScript type checking) and runtime (Tailwind JIT). Invalid tokens will cause build errors.

**Documentation**: Each token category has detailed documentation in `docs/design-system/` with usage guidelines and code examples.
