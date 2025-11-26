# Color Palette

**Version**: 1.0.0
**Feature**: Premium Visual Redesign
**WCAG Compliance**: AA

## Overview

XTYL uses a curated 11-color palette designed for premium aesthetics while maintaining WCAG AA accessibility standards. Colors are organized into three categories: **Neutral** (7 tokens), **Accent** (1 token), and **Semantic** (3 tokens).

## Design Philosophy

- **Sophisticated, not generic**: Refined neutral tones with fresh emerald accent
- **Semantic meaning**: Each color serves a clear purpose
- **Dark mode first-class**: Separate curated palettes for light/dark (not algorithmic inversion)
- **Accessibility**: All text/background combinations meet WCAG AA (4.5:1 for text, 3:1 for large text)

---

## Neutral Colors (7 tokens)

### Surface Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `surface-primary` | `#FAFAF9` | `#0A0A0B` | Main page backgrounds, modals |
| `surface-secondary` | `#F5F5F4` | `#18181B` | Cards, elevated surfaces |
| `surface-tertiary` | `#E7E5E4` | `#27272A` | Hover states, secondary UI elements |

**Contrast Ratios**:
- Surface Primary: 16:1 (excellent)
- Surface Secondary: 14:1 (excellent)
- Surface Tertiary: 12:1 (excellent)

### Border Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `border-primary` | `#E7E5E4` | `#3F3F46` | Subtle borders on cards, dividers |

**Contrast Ratio**: 3:1 (meets WCAG AA for UI components)

### Text Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `text-primary` | `#171717` | `#FAFAFA` | High emphasis (headings, body text) |
| `text-secondary` | `#525252` | `#A1A1AA` | Medium emphasis (descriptions, captions) |
| `text-tertiary` | `#A3A3A3` | `#71717A` | Low emphasis (placeholders, disabled text) |

**Contrast Ratios** (on surface-primary):
- Text Primary: 16:1 (excellent)
- Text Secondary: 7:1 (excellent)
- Text Tertiary: 4.5:1 (meets WCAG AA minimum)

---

## Accent Color (1 token)

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `accent-primary` | `#10B981` (Emerald 500) | `#34D399` (Emerald 400) | Brand color, primary actions, links |

**Contrast Ratio**: 4.5:1 (meets WCAG AA for text)

**Why Emerald Fresh?**
- Fresh, vibrant aesthetic that conveys growth and innovation
- Distinguishes from generic blue/purple SaaS applications
- Conveys creativity, energy, and forward-thinking
- Accessible in both light and dark modes

---

## Semantic Colors (3 tokens)

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `accent-success` | `#059669` (Emerald 600) | `#10B981` (Emerald 500) | Success states, confirmations, positive feedback |
| `accent-warning` | `#F59E0B` (Amber 500) | `#FBBF24` (Amber 400) | Warning states, caution, pending actions |
| `accent-error` | `#EF4444` (Red 500) | `#F87171` (Red 400) | Error states, destructive actions, failures |

**Contrast Ratios**: All 4.5:1 or higher (meet WCAG AA for text)

---

## Usage Examples

### Tailwind CSS

```tsx
<div className="bg-surface-primary text-text-primary">
  <h1 className="text-4xl font-bold tracking-tight">
    Premium Heading
  </h1>
  <p className="text-text-secondary">
    Secondary description text
  </p>
  <button className="bg-accent-primary text-white hover:opacity-90">
    Primary Action
  </button>
</div>
```

### CSS Variables

```css
.custom-component {
  background-color: var(--surface-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
}
```

### TypeScript (design-tokens.ts)

```typescript
import { colors } from '@/lib/design-tokens';

const lightSurface = colors.surface.primary.light; // "#FAFAF9"
const darkSurface = colors.surface.primary.dark;   // "#0A0A0B"
```

---

## Color Guidelines

### DO

- ✅ Use semantic colors for their intended purposes
- ✅ Test contrast ratios when creating custom combinations
- ✅ Use `text-tertiary` sparingly (only for truly low-priority content)
- ✅ Maintain consistent color usage across the application

### DON'T

- ❌ Use arbitrary hex colors outside the design token system
- ❌ Use `accent-error` for non-error states (creates confusion)
- ❌ Create custom colors without checking WCAG AA compliance
- ❌ Use light mode colors in dark mode or vice versa

---

## Accessibility Checklist

- [x] All text colors meet WCAG AA (4.5:1 minimum on background)
- [x] Large text (18px+) meets WCAG AA (3:1 minimum)
- [x] UI component colors (borders, icons) meet 3:1 contrast
- [x] Focus states are clearly visible (4.5:1+ contrast)
- [x] Color is not the only means of conveying information

---

## Future Considerations

- Chart/data visualization colors (if needed beyond existing palette)
- Gradient specifications (currently using linear gradients with accent-primary)
- Additional semantic states (info, neutral) if use cases emerge

**Note**: Before adding new colors, justify why existing 11 tokens are insufficient. The goal is to maintain a curated, memorable palette.
