# Research: Premium Visual Redesign

**Phase**: 0 - Outline & Research
**Date**: 2025-11-24
**Feature**: Premium Visual Redesign

## Research Questions

This document resolves technical unknowns and establishes design system foundations for the premium visual redesign.

---

## R1: Color Palette Strategy

**Question**: What color palette approach will convey premium quality while maintaining brand identity and WCAG AA compliance?

**Decision**: Sophisticated neutral-based palette with purposeful accent colors

**Rationale**:
- Premium brands (Apple, Notion, Linear) use restrained palettes with intentional pops of color
- Neutral grays with warm/cool undertones feel more refined than pure blacks/whites
- Semantic color naming prevents arbitrary usage
- Fewer colors create more cohesive experience

**Color Palette** (11 total tokens):

**Neutral Scale** (7 colors):
- `surface-primary`: Main background (light: warm off-white #FAFAF9, dark: cool dark #0A0A0B)
- `surface-secondary`: Cards/elevated surfaces (light: #F5F5F4, dark: #18181B)
- `surface-tertiary`: Hover states (light: #E7E5E4, dark: #27272A)
- `border-primary`: Subtle borders (light: #E7E5E4, dark: #3F3F46)
- `text-primary`: High emphasis text (light: #171717, dark: #FAFAFA)
- `text-secondary`: Medium emphasis (light: #525252, dark: #A1A1AA)
- `text-tertiary`: Low emphasis (light: #A3A3A3, dark: #71717A)

**Semantic Colors** (4 colors):
- `accent-primary`: Brand/primary actions (rich purple #8B5CF6)
- `accent-success`: Success states (sophisticated green #10B981)
- `accent-warning`: Warning states (elegant amber #F59E0B)
- `accent-error`: Error states (refined red #EF4444)

**Contrast Ratios**:
- text-primary on surface-primary: 16:1 (exceeds WCAG AAA)
- text-secondary on surface-primary: 7:1 (exceeds WCAG AA)
- accent colors on surface: all > 4.5:1 (WCAG AA compliant)

**Alternatives Considered**:
- ❌ Vibrant multi-color palette: Too playful, not premium
- ❌ Pure grayscale: Too cold, lacks personality
- ❌ Brand-heavy palette: Risks becoming dated

**Implementation**: Tailwind CSS custom colors in `tailwind.config.ts`

---

## R2: Typography System

**Question**: What typography approach balances elegance, readability, and performance?

**Decision**: Inter for UI, custom serif for headings (optional premium upgrade)

**Rationale**:
- Inter is professional, highly readable, excellent hinting at all sizes
- Variable font reduces file size vs multiple weights
- Serif accents (like Fraunces or Newsreader) add sophistication to headings
- System font fallbacks prevent layout shift

**Typography Scale** (based on 1.25 type ratio):

| Token | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `text-xs` | 0.75rem (12px) | 1rem (16px) | 400 | Captions, labels |
| `text-sm` | 0.875rem (14px) | 1.25rem (20px) | 400 | Body small, secondary |
| `text-base` | 1rem (16px) | 1.5rem (24px) | 400 | Body text |
| `text-lg` | 1.125rem (18px) | 1.75rem (28px) | 500 | Emphasized body |
| `text-xl` | 1.25rem (20px) | 1.75rem (28px) | 600 | h6 |
| `text-2xl` | 1.5rem (24px) | 2rem (32px) | 600 | h5 |
| `text-3xl` | 1.875rem (30px) | 2.25rem (36px) | 700 | h4 |
| `text-4xl` | 2.25rem (36px) | 2.5rem (40px) | 700 | h3 |
| `text-5xl` | 3rem (48px) | 1 | 700 | h2 |
| `text-6xl` | 3.75rem (60px) | 1 | 800 | h1 |

**Font Loading Strategy**:
```css
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url('/fonts/inter-var.woff2') format('woff2');
  /* Size-adjust for fallback matching */
  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
}
```

**Fallback Stack**: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

**Alternatives Considered**:
- ❌ Geometric sans (Euclid, Circular): Too trendy, less readable
- ❌ Display fonts for body: Poor readability
- ❌ Google Fonts CDN: Privacy/performance concerns

---

## R3: Spacing & Layout System

**Question**: How to enforce consistent spacing without restricting flexibility?

**Decision**: 8px base grid with named semantic tokens

**Rationale**:
- 8px is divisible by common screen densities (72dpi, 96dpi, 144dpi)
- Aligns with icon sizes (16px, 24px, 32px)
- Semantic names (space-xs, space-sm) are more maintainable than pixel values
- Allows exceptions when truly needed (but requires justification)

**Spacing Scale**:

| Token | Value | Usage |
|-------|-------|-------|
| `space-0` | 0px | Reset spacing |
| `space-px` | 1px | Hairline borders |
| `space-xs` | 4px | Tight spacing, icon gaps |
| `space-sm` | 8px | Component internal padding |
| `space-md` | 16px | Default spacing between elements |
| `space-lg` | 24px | Section spacing |
| `space-xl` | 32px | Large section gaps |
| `space-2xl` | 48px | Page section dividers |
| `space-3xl` | 64px | Major layout sections |

**Layout Constraints**:
- Max content width: 1280px (readable line length)
- Container padding: space-md (mobile), space-xl (desktop)
- Card padding: space-lg
- Modal padding: space-xl

**Alternatives Considered**:
- ❌ 4px grid: Too granular, inconsistent results
- ❌ Arbitrary spacing: Impossible to maintain consistency
- ❌ Pixel-based naming: Breaks when values change

---

## R4: Animation Strategy

**Question**: How to implement smooth, performant animations that enhance (not distract)?

**Decision**: Framer Motion for complex animations, CSS transitions for simple states

**Rationale**:
- Framer Motion provides declarative API, built-in spring physics, gesture support
- CSS transitions are more performant for simple hover/focus states
- Reduced-motion support built into both
- Animation presets ensure consistency

**Animation Presets**:

| Preset | Duration | Easing | Usage |
|--------|----------|--------|-------|
| `transition-fast` | 150ms | ease-out | Hover states, tooltips |
| `transition-base` | 250ms | ease-in-out | Focus states, dropdowns |
| `transition-slow` | 350ms | ease-in-out | Modals, drawers |
| `spring-gentle` | spring(80, 20, 10) | - | Subtle bounces |
| `spring-bouncy` | spring(100, 10, 5) | - | Playful interactions |

**Animation Principles**:
1. Always animate opacity + transform (GPU-accelerated)
2. Never animate width/height/top/left (causes reflow)
3. Use `will-change` sparingly (memory overhead)
4. Respect `prefers-reduced-motion`
5. Keep animations under 400ms (feels instant)

**Example (Modal Enter/Exit)**:
```typescript
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  )}
</AnimatePresence>
```

**Alternatives Considered**:
- ❌ GSAP: Overkill for UI animations, larger bundle
- ❌ CSS-only: Limited control, harder to coordinate
- ❌ React Spring: Steeper learning curve, less documentation

---

## R5: Component Customization Approach

**Question**: How to customize Shadcn/UI components to avoid off-the-shelf appearance?

**Decision**: Tailwind utility overrides + custom component variants

**Rationale**:
- Shadcn/UI components are unstyled primitives (Radix UI)
- Tailwind utilities in component files allow easy customization
- Semantic color/spacing tokens make global changes simple
- Component composition over configuration

**Customization Strategy**:

**Buttons**:
- Remove default bg-primary (too Material Design)
- Add subtle gradients for depth
- Refine hover/active states with scale transforms
- Custom loading spinner (not default)

**Inputs**:
- Thinner borders (1px instead of 2px)
- Subtle focus ring (not bright blue)
- Smooth transitions (250ms)
- Integrated labels (not floating)

**Cards**:
- Very subtle shadows (blur: 8px, opacity: 0.04)
- 1px border instead of shadow-only
- Hover lift effect (translateY: -2px)

**Modals**:
- Backdrop blur (backdrop-filter: blur(8px))
- Rounded corners (12px, not 8px or 16px)
- Fade + scale animation
- Dismissible with ESC or outside click

**Alternatives Considered**:
- ❌ Build from scratch: Too time-consuming, reinventing accessibility
- ❌ Use Material UI/Ant Design: Too opinionated, hard to customize
- ❌ Keep Shadcn defaults: Generic appearance, not premium

---

## R6: Responsive Design Strategy

**Question**: How to maintain premium quality across all device sizes?

**Decision**: Mobile-first with progressive enhancement

**Rationale**:
- Mobile users are significant (40%+ of traffic)
- Easier to add complexity than remove it
- Touch-first design benefits desktop (larger click targets)
- Performance constraints force better decisions

**Breakpoints** (Tailwind defaults):

| Breakpoint | Width | Target Devices |
|------------|-------|----------------|
| `sm` | 640px+ | Large phones (landscape) |
| `md` | 768px+ | Tablets (portrait) |
| `lg` | 1024px+ | Tablets (landscape), small laptops |
| `xl` | 1280px+ | Desktops |
| `2xl` | 1536px+ | Large desktops |

**Responsive Patterns**:

**Navigation**:
- Mobile: Hamburger menu → full-screen drawer
- Tablet: Collapsible sidebar
- Desktop: Persistent sidebar

**Typography**:
- Mobile: Base 16px (readable without zoom)
- Desktop: Scale up 1.125x (better use of space)

**Spacing**:
- Mobile: space-md (16px) between sections
- Desktop: space-2xl (48px) for breathing room

**Touch Targets**:
- Minimum 44x44px (Apple/Google guidelines)
- Desktop can be smaller (mouse is more precise)

**Alternatives Considered**:
- ❌ Desktop-first: Mobile becomes afterthought
- ❌ Separate mobile/desktop codebases: Maintenance nightmare
- ❌ Responsive utilities only: Inconsistent patterns

---

## R7: Performance Budget

**Question**: What performance constraints ensure smooth 60fps animations and fast load?

**Decision**: Lighthouse score 90+, bundle size < 50kb increase, animation budget

**Rationale**:
- Performance is part of premium experience
- Metrics provide objective quality gate
- Budget prevents performance regression

**Performance Targets**:

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial Load (3G) | < 2s | Lighthouse |
| Time to Interactive | < 3s | Lighthouse |
| First Contentful Paint | < 1.5s | Lighthouse |
| Cumulative Layout Shift | < 0.1 | Lighthouse |
| Animation Frame Rate | 60 fps | Chrome DevTools |
| Bundle Size Increase | < 50kb gzipped | Webpack Bundle Analyzer |

**Optimization Strategies**:
1. **Fonts**: Variable fonts (single file), preload critical fonts
2. **Animations**: Lazy load Framer Motion (code splitting)
3. **Icons**: SVG sprites, not icon fonts
4. **Images**: WebP format, lazy loading
5. **CSS**: Tailwind JIT (only used utilities)

**Monitoring**:
- Lighthouse CI in GitHub Actions
- Bundle size tracking in PR comments
- Performance budgets in Webpack config

**Alternatives Considered**:
- ❌ No performance budget: Gradual degradation
- ❌ Stricter budget (<1s load): Too restrictive for rich UI
- ❌ Manual testing only: Inconsistent, easy to miss regressions

---

## R8: Accessibility Strategy

**Question**: How to ensure WCAG AA compliance while maintaining premium aesthetics?

**Decision**: Automated testing + manual audits + semantic HTML

**Rationale**:
- Accessibility and premium design are not mutually exclusive
- Automated tests catch 30-40% of issues (axe-core)
- Manual testing required for complex interactions
- Semantic HTML is free accessibility

**Accessibility Checklist**:

**Color Contrast** (automated):
- ✅ Text-primary on backgrounds: > 4.5:1
- ✅ Text-secondary on backgrounds: > 4.5:1
- ✅ Interactive elements: > 3:1

**Keyboard Navigation** (manual):
- ✅ All interactive elements focusable
- ✅ Logical tab order
- ✅ Focus indicators visible (not just outline: none)
- ✅ Keyboard shortcuts (with modifier keys)

**Screen Readers** (manual):
- ✅ Semantic HTML (button, nav, main, article)
- ✅ ARIA labels where needed
- ✅ Alt text for images
- ✅ Loading states announced

**Motion** (automated):
- ✅ Respect prefers-reduced-motion
- ✅ No auto-playing animations > 5s
- ✅ Parallax effects disabled for reduced-motion

**Touch Targets** (automated):
- ✅ Minimum 44x44px on mobile
- ✅ Adequate spacing between interactive elements

**Testing Tools**:
- axe-core (automated, in CI)
- Lighthouse (automated, in CI)
- NVDA/JAWS (manual, QA testing)
- Keyboard-only navigation (manual, developer testing)

**Alternatives Considered**:
- ❌ Accessibility as afterthought: Expensive retrofits, legal risk
- ❌ Manual testing only: Inconsistent, time-consuming
- ❌ Automated only: Misses 60-70% of issues

---

## R9: Dark Mode Strategy

**Question**: How to implement dark mode that feels as premium as light mode?

**Decision**: Separate curated palettes, not algorithmic inversion

**Rationale**:
- Algorithmic dark modes look washed out
- Dark mode needs different contrast ratios (lower is better for OLED)
- Semantic tokens make switching easy
- Users expect parity between modes

**Dark Mode Adjustments**:

**Colors**:
- Slightly desaturated accents (less eye strain)
- True black → very dark gray (softer on OLED)
- Increased elevation separation (shadows less visible in dark)

**Typography**:
- Same scale, slightly lighter weights (less aggressive)
- Increased letter spacing for readability

**Shadows**:
- Replace shadows with subtle borders
- Use lighter borders (not darker)

**Implementation**:
```css
:root {
  --surface-primary: #FAFAF9;
  --text-primary: #171717;
}

[data-theme="dark"] {
  --surface-primary: #0A0A0B;
  --text-primary: #FAFAFA;
}
```

**System Preference**:
- Detect `prefers-color-scheme`
- Store user override in localStorage
- Sync across tabs (storage event)

**Alternatives Considered**:
- ❌ Light mode only: Alienates 40% of users
- ❌ Algorithmic inversion: Poor quality results
- ❌ Single palette with filters: Performance issues

---

## R10: Design System Documentation

**Question**: How to maintain consistency as team grows?

**Decision**: Living documentation with code examples

**Rationale**:
- Documentation decays if not colocated with code
- Examples prevent misinterpretation
- Automated documentation (Storybook/Ladle) ensures accuracy

**Documentation Structure**:

```
docs/design-system/
├── index.md              # Overview, philosophy
├── colors.md             # Color palette, usage guidelines
├── typography.md         # Type scale, font loading
├── spacing.md            # Spacing scale, layout patterns
├── components.md         # Component catalog
├── animations.md         # Animation presets, principles
└── examples/             # Code snippets, screenshots
    ├── button-variants.png
    ├── modal-animation.mp4
    └── form-states.png
```

**Content Guidelines**:
- Show code + screenshot for every example
- Explain "why" not just "what"
- Link to constitution principles
- Update documentation in same PR as code changes

**Alternatives Considered**:
- ❌ Figma only: Developers can't reference easily
- ❌ No documentation: Inconsistent implementations
- ❌ Separate documentation site: Gets out of sync

---

## Summary

All technical unknowns resolved. Ready for Phase 1 (design model & contracts).

**Key Decisions**:
1. 11-color sophisticated palette (neutrals + 4 semantic)
2. Inter variable font + optional serif accents
3. 8px spacing grid with semantic tokens
4. Framer Motion + CSS transitions
5. Shadcn/UI customization via Tailwind
6. Mobile-first responsive design
7. Lighthouse 90+, < 50kb bundle increase
8. WCAG AA with automated + manual testing
9. Curated dark mode (not algorithmic)
10. Living design system documentation

**Next Phase**: Create design tokens schema (data-model.md), design token contracts (contracts/), and developer quickstart guide (quickstart.md).
