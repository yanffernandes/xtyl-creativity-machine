# Typography Scale

**Version**: 1.0.0
**Feature**: Premium Visual Redesign
**Type Scale**: 1.25 ratio (Major Third)
**Font Family**: Inter Variable

## Overview

XTYL's typography system uses a refined 1.25 ratio scale (major third) with the Inter variable font. This creates clear visual hierarchy while maintaining premium aesthetics.

## Design Philosophy

- **Refined hierarchy**: Clear distinction between heading levels
- **Readable body text**: Optimal line heights for comfortable reading
- **Subtle letter spacing**: Tighter spacing on large headings for visual refinement
- **Variable font**: Inter supports weight range 100-900 with excellent screen rendering

---

## Type Scale

### Body Text

| Token | Size | Line Height | Weight | Letter Spacing | Usage |
|-------|------|-------------|--------|----------------|-------|
| `text-xs` | 12px (0.75rem) | 16px (1rem) | 400 | normal | Captions, labels, small print |
| `text-sm` | 14px (0.875rem) | 20px (1.25rem) | 400 | normal | Body small, secondary text |
| `text-base` | 16px (1rem) | 24px (1.5rem) | 400 | normal | Body text, paragraphs |
| `text-lg` | 18px (1.125rem) | 28px (1.75rem) | 500 | normal | Emphasized body text, large UI |

### Headings

| Token | Size | Line Height | Weight | Letter Spacing | Element | Usage |
|-------|------|-------------|--------|----------------|---------|-------|
| `text-xl` | 20px (1.25rem) | 28px (1.75rem) | 600 | -0.01em (tight) | h6 | Card titles, small headings |
| `text-2xl` | 24px (1.5rem) | 32px (2rem) | 600 | -0.01em (tight) | h5 | Section headers |
| `text-3xl` | 30px (1.875rem) | 36px (2.25rem) | 700 | -0.02em (tight) | h4 | Page subheadings |
| `text-4xl` | 36px (2.25rem) | 40px (2.5rem) | 700 | -0.02em (tight) | h3 | Prominent headings |
| `text-5xl` | 48px (3rem) | 1 (48px) | 700 | -0.03em (tighter) | h2 | Major page headings |
| `text-6xl` | 60px (3.75rem) | 1 (60px) | 800 | -0.03em (tighter) | h1 | Hero headings |

---

## Font Loading Strategy

### Inter Variable Font

**Implementation**: Use `font-display: swap` to prevent layout shift (FOUT prevention)

**Fallback stack**:
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Font features** (OpenType):
```css
font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
```

- `cv02`: Open digits (clearer 0 vs O)
- `cv03`: Open 'a' (more readable)
- `cv04`: Open 'g' (less ambiguous)
- `cv11`: Alternative '1' (clearer)

**Anti-aliasing**:
```css
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

---

## Usage Examples

### Tailwind CSS

```tsx
// Headings
<h1 className="text-6xl font-extrabold tracking-tighter">
  Hero Heading
</h1>

<h2 className="text-5xl font-bold tracking-tighter">
  Major Section
</h2>

<h3 className="text-4xl font-bold tracking-tight">
  Prominent Heading
</h3>

// Body text
<p className="text-base text-text-primary">
  Regular body text with optimal line height.
</p>

<p className="text-sm text-text-secondary">
  Secondary description text.
</p>

<span className="text-xs text-text-tertiary">
  Caption or label text
</span>
```

### Semantic HTML

```tsx
<article className="prose prose-lg">
  <h1>Article Title</h1>
  <p className="lead">Lead paragraph with larger text</p>
  <p>Regular body paragraph</p>
  <h2>Section Heading</h2>
  <p>More content</p>
</article>
```

---

## Typography Guidelines

### DO

- ✅ Use semantic HTML heading hierarchy (h1 → h2 → h3...)
- ✅ Apply `tracking-tight` (-0.02em) to headings h3-h6
- ✅ Apply `tracking-tighter` (-0.03em) to hero headings (h1-h2)
- ✅ Use `font-semibold` (600) for h5-h6, `font-bold` (700) for h2-h4, `font-extrabold` (800) for h1
- ✅ Maintain line height at 1.5 (150%) for body text
- ✅ Use `text-text-secondary` for descriptions and captions

### DON'T

- ❌ Skip heading levels (h1 → h3 without h2)
- ❌ Use positive letter spacing on headings (breaks refinement)
- ❌ Set line heights below 1.25 for body text (harms readability)
- ❌ Use font weights below 400 (300, 200, 100 are too light for UI)
- ❌ Create arbitrary font sizes outside the scale

---

## Responsive Typography

### Mobile-First Scaling

Base font size remains 16px at all breakpoints. Use responsive classes for hero/landing pages:

```tsx
<h1 className="text-4xl sm:text-5xl lg:text-6xl">
  Responsive Hero
</h1>
```

**Breakpoints**:
- Mobile (< 640px): Use smaller scale (text-3xl for heroes)
- Tablet (640px+): Use mid-scale (text-4xl to text-5xl)
- Desktop (1024px+): Use full scale (text-6xl for heroes)

---

## Accessibility

### WCAG AA Compliance

- **Minimum font size**: 14px (text-sm) for UI elements
- **Body text**: 16px (text-base) for content
- **Large text**: 18px+ (text-lg+) requires 3:1 contrast instead of 4.5:1

### Line Length

- **Optimal**: 50-75 characters per line (CPL)
- **Maximum**: 90 characters per line
- Use `max-w-prose` (65ch) for long-form content

```tsx
<article className="max-w-prose">
  <p>Long-form content with optimal line length</p>
</article>
```

---

## Weight Scale Reference

Inter Variable Font supports all weights:

| Weight | Name | Usage |
|--------|------|-------|
| 400 | Regular | Body text, descriptions |
| 500 | Medium | Emphasized body text, UI labels |
| 600 | Semibold | h5, h6, buttons |
| 700 | Bold | h2, h3, h4, strong emphasis |
| 800 | Extrabold | h1, hero headings |

---

## Future Considerations

- Monospace font for code blocks (consider JetBrains Mono or Fira Code)
- Display font for marketing pages (if brand requires unique headlines)
- Localization adjustments (CJK languages may need larger base sizes)

**Note**: Inter Variable Font is production-ready and supports 100+ languages out of the box.
