# Spacing System

**Version**: 1.0.0
**Feature**: Premium Visual Redesign
**Base Grid**: 8px
**Scale**: 0, 1px, 4px, 8px, 16px, 24px, 32px, 48px, 64px

## Overview

XTYL uses an 8px base grid spacing system to create consistent rhythm and visual harmony across the interface. All spacing values follow semantic naming and conform to the defined scale.

## Design Philosophy

- **8px base grid**: Creates visual rhythm and predictable layouts
- **Semantic naming**: Tokens describe size (xs, sm, md...), not pixel values
- **No arbitrary values**: 0% tolerance for random spacing (13px, 27px, etc.)
- **Proximity principle**: Related elements closer together, unrelated elements farther apart

---

## Spacing Scale

| Token | Value | Pixels | Usage |
|-------|-------|--------|-------|
| `space-0` | 0rem | 0px | Reset spacing, zero gaps |
| `space-px` | 0.0625rem | 1px | Hairline borders, thin dividers |
| `space-xs` | 0.25rem | 4px | Tight spacing, icon gaps, badge padding |
| `space-sm` | 0.5rem | 8px | Component internal padding, small gaps |
| `space-md` | 1rem | 16px | Default spacing between elements |
| `space-lg` | 1.5rem | 24px | Section spacing, card padding |
| `space-xl` | 2rem | 32px | Large section gaps, container padding |
| `space-2xl` | 3rem | 48px | Page section dividers, major spacing |
| `space-3xl` | 4rem | 64px | Hero spacing, major layout sections |

---

## Usage Guidelines

### Component Spacing

#### Cards
```tsx
<div className="p-lg rounded-lg bg-surface-secondary">
  {/* Card content with 24px padding */}
</div>
```

**Recommended**: `p-lg` (24px) for card padding

#### Modals/Dialogs
```tsx
<div className="p-xl rounded-xl bg-surface-primary">
  {/* Modal content with 32px padding */}
</div>
```

**Recommended**: `p-xl` (32px) for modal padding

#### Buttons
```tsx
<button className="px-lg py-sm rounded-md">
  {/* 24px horizontal, 8px vertical */}
  Click Me
</button>
```

**Recommended**: `px-lg py-sm` for primary buttons

#### Input Fields
```tsx
<input className="px-md py-sm rounded-md" />
```

**Recommended**: `px-md py-sm` for input fields

---

### Layout Spacing

#### Stack (Vertical Spacing)
```tsx
<div className="space-y-md">
  {/* 16px gap between children */}
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

**Recommended**:
- `space-y-sm` (8px): Tight lists, form fields
- `space-y-md` (16px): Default vertical rhythm
- `space-y-lg` (24px): Section content
- `space-y-2xl` (48px): Page sections

#### Grid Gaps
```tsx
<div className="grid grid-cols-3 gap-lg">
  {/* 24px gap between grid items */}
  <div>Card 1</div>
  <div>Card 2</div>
  <div>Card 3</div>
</div>
```

**Recommended**:
- `gap-md` (16px): Compact grids
- `gap-lg` (24px): Default card grids
- `gap-xl` (32px): Spacious layouts

---

## Proximity Principle

**Related elements should be closer; unrelated elements should be farther apart.**

### Example: Form Layout

```tsx
<form className="space-y-2xl">
  {/* Each section has 48px gap (unrelated) */}

  <section className="space-y-md">
    {/* Section header + content = 16px gap (related) */}
    <h2>Personal Information</h2>
    <div className="space-y-sm">
      {/* Form fields = 8px gap (tightly related) */}
      <input placeholder="First Name" />
      <input placeholder="Last Name" />
    </div>
  </section>

  <section className="space-y-md">
    <h2>Account Details</h2>
    <div className="space-y-sm">
      <input placeholder="Email" />
      <input placeholder="Password" />
    </div>
  </section>
</form>
```

**Hierarchy**:
- Tightly related (form fields): `space-sm` (8px)
- Related (section content): `space-md` (16px)
- Unrelated (different sections): `space-2xl` (48px)

---

## Usage Examples

### Tailwind CSS

```tsx
// Padding
<div className="p-lg">24px padding on all sides</div>
<div className="px-xl py-md">32px horizontal, 16px vertical</div>

// Margin
<div className="mt-2xl">48px top margin</div>
<div className="mb-lg">24px bottom margin</div>

// Gap (Flexbox/Grid)
<div className="flex gap-md">16px gap between items</div>
<div className="grid grid-cols-2 gap-xl">32px gap in grid</div>

// Space Between (Flexbox)
<div className="flex flex-col space-y-lg">
  <div>Item 1</div>
  <div>Item 2</div>
  {/* 24px gap automatically added between items */}
</div>
```

### TypeScript (design-tokens.ts)

```typescript
import { spacing, spacingPx } from '@/lib/design-tokens';

const cardPadding = spacing.lg;     // "1.5rem"
const cardPaddingPx = spacingPx.lg; // 24
```

---

## Spacing Guidelines

### DO

- ✅ Use semantic tokens (space-md, space-lg) instead of arbitrary values
- ✅ Follow the proximity principle (related elements closer)
- ✅ Maintain consistent spacing within component types (all cards use p-lg)
- ✅ Use larger spacing for page sections (space-2xl, space-3xl)
- ✅ Test layouts at multiple screen sizes

### DON'T

- ❌ Use arbitrary pixel values (13px, 27px, 42px)
- ❌ Mix spacing scales randomly (p-sm on one card, p-xl on another)
- ❌ Use negative margins to "hack" layouts (refactor structure instead)
- ❌ Apply excessive padding that breaks mobile layouts
- ❌ Ignore the 8px grid (all values should be multiples of 4px or 8px)

---

## Responsive Spacing

### Mobile-First Approach

Start with smaller spacing on mobile, increase on larger screens:

```tsx
<section className="p-lg lg:p-xl 2xl:p-2xl">
  {/* 24px mobile, 32px desktop, 48px large screens */}
</section>

<div className="space-y-md lg:space-y-lg">
  {/* 16px mobile, 24px desktop */}
</div>
```

**Breakpoints**:
- Mobile (< 640px): Use smaller spacing (space-sm to space-lg)
- Tablet (640px - 1023px): Use mid-range spacing (space-md to space-xl)
- Desktop (1024px+): Use full spacing range (space-lg to space-3xl)

---

## Special Cases

### Touch Targets (Mobile)

Minimum 44x44px touch targets (WCAG AA):

```tsx
<button className="min-h-[44px] min-w-[44px] p-sm">
  {/* Ensure adequate touch area */}
  <Icon />
</button>
```

### Dense Layouts (Data Tables)

Use tighter spacing for information-dense interfaces:

```tsx
<table className="border-collapse">
  <tr>
    <td className="px-sm py-xs">
      {/* 8px horizontal, 4px vertical */}
      Data cell
    </td>
  </tr>
</table>
```

### Hero Sections

Use larger spacing for visual impact:

```tsx
<section className="py-3xl px-xl">
  {/* 64px vertical, 32px horizontal */}
  <h1 className="mb-2xl">Hero Heading</h1>
  <p>Hero description</p>
</section>
```

---

## Audit Checklist

When reviewing spacing in the codebase:

- [ ] All spacing values use defined tokens (no arbitrary px values)
- [ ] Related elements grouped with appropriate proximity
- [ ] Section spacing larger than element spacing
- [ ] Card/modal padding consistent across the app
- [ ] Touch targets meet 44x44px minimum on mobile
- [ ] Responsive spacing adapts gracefully at breakpoints

---

## Future Considerations

- Compact mode toggle (reduce all spacing by 25% for power users)
- Custom spacing tokens for specific components (if justified)
- Animation of spacing changes (smooth transitions)

**Note**: Before adding custom spacing, ensure existing 9 tokens are truly insufficient. Discipline in spacing creates visual coherence.
