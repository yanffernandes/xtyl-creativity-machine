# Animation Standards

**Version**: 1.0.0
**Feature**: Premium Visual Redesign
**Last Updated**: 2025-11-25

## Overview

XTYL uses a sophisticated animation system that balances premium feel with performance and accessibility. All animations follow consistent timing, easing, and respect user preferences.

---

## Animation Philosophy

### Principles
1. **Purpose-Driven**: Every animation serves a functional purpose (feedback, guidance, delight)
2. **Performance-First**: Target 60fps on mid-range devices
3. **Accessibility**: Respect `prefers-reduced-motion` preference
4. **Consistency**: Use predefined duration and easing tokens
5. **Subtlety**: Premium means refined, not flashy

### When to Animate
✅ **DO Animate**:
- State changes (hover, focus, active, disabled)
- Loading and progress indicators
- Transitions between views
- Feedback for user actions (click, submit, error)
- Element entrance/exit

❌ **DON'T Animate**:
- Static content on page load (causes distraction)
- Critical user flows (adds unnecessary delay)
- Text scrolling or typewriter effects (accessibility issues)
- Multiple simultaneous animations (cognitive overload)

---

## Duration Tokens

**Location**: `frontend/src/lib/design-tokens.ts`

```typescript
export const animation = {
  duration: {
    fast: 150,    // Quick feedback
    base: 250,    // Standard transitions
    slow: 350,    // Complex animations
  },
  // ...
}
```

### Usage Guidelines

#### Fast (150ms)
**Use for**: Immediate feedback on lightweight interactions
- Hover state changes
- Checkbox/radio check animations
- Tooltip appearance
- Icon transitions
- Menu item highlights

**Example**:
```tsx
className="transition-colors duration-fast hover:bg-accent-primary/10"
```

#### Base (250ms)
**Use for**: Standard component state transitions
- Button states (hover, active)
- Input focus states
- Card hover effects
- Tab switching
- Accordion expand/collapse
- Most UI transitions

**Example**:
```tsx
className="transition-all duration-base hover:scale-[1.02]"
```

#### Slow (350ms)
**Use for**: Complex, multi-property animations
- Modal/dialog entrance (fade + zoom)
- Drawer slide-in
- Page transitions
- Complex transforms
- Multi-step animations

**Example**:
```tsx
className="duration-slow data-[state=open]:animate-in data-[state=closed]:animate-out"
```

---

## Easing Functions

**Location**: `frontend/src/lib/animations.ts`

```typescript
export const transition = {
  fast: { duration: 0.15, ease: 'easeOut' },
  base: { duration: 0.25, ease: 'easeInOut' },
  slow: { duration: 0.35, ease: 'easeInOut' },
  springGentle: { type: 'spring', stiffness: 80, damping: 20, mass: 10 },
  springBouncy: { type: 'spring', stiffness: 100, damping: 10, mass: 5 },
}
```

### Easing Guidelines

- **easeOut**: Fast start, slow end - Use for exit animations and quick feedback
- **easeInOut**: Symmetrical curve - Use for most transitions (default)
- **easeIn**: Slow start, fast end - Rarely used, only for disappearing elements
- **spring**: Physics-based - Use for playful, natural motion (modals, drawers)

### Tailwind Easing Classes
```tsx
className="ease-out"     // Fast start, slow end
className="ease-in-out"  // Symmetrical (default)
className="ease-in"      // Slow start, fast end
```

---

## Common Animation Patterns

### 1. Hover Scale
**Pattern**: Subtle scale up on hover, scale down on active
```tsx
className="transition-all duration-base hover:scale-[1.02] active:scale-[0.98]"
```

**Use for**: Cards, buttons, clickable items

### 2. Fade In
**Pattern**: Opacity 0 → 1
```tsx
className="animate-in fade-in-0 duration-base"
```

**Use for**: Tooltips, alerts, dynamic content

### 3. Slide + Fade
**Pattern**: Combine slide and fade for elegant entrance
```tsx
className="animate-in fade-in-0 slide-in-from-top-4 duration-base"
```

**Use for**: Dropdowns, notifications, modals

### 4. Zoom + Fade
**Pattern**: Scale + opacity for premium feel
```tsx
className="animate-in fade-in-0 zoom-in-95 duration-slow"
```

**Use for**: Modals, dialogs, important overlays

### 5. Shimmer Loading
**Pattern**: Horizontal gradient sweep
```tsx
className="skeleton animate-shimmer"
```

**Use for**: Skeleton loaders, loading states

---

## Framer Motion Presets

**Location**: `frontend/src/lib/animations.ts`

### Fade Animations
```typescript
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}
```

### Slide Animations
```typescript
export const slideInFromTop: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}
```

### Scale Animations
```typescript
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
}
```

### Usage with Framer Motion
```tsx
import { motion } from 'framer-motion'
import { fadeIn, transition } from '@/lib/animations'

<motion.div
  variants={fadeIn}
  initial="initial"
  animate="animate"
  exit="exit"
  transition={transition.base}
>
  Content
</motion.div>
```

---

## Keyframe Animations

**Location**: `frontend/src/styles/animations.css`

### Available Keyframes
```css
@keyframes fadeIn { /* 0% opacity → 100% */ }
@keyframes fadeOut { /* 100% opacity → 0% */ }
@keyframes slideInFromTop { /* Slide + fade from top */ }
@keyframes slideInFromBottom { /* Slide + fade from bottom */ }
@keyframes slideInFromLeft { /* Slide + fade from left */ }
@keyframes slideInFromRight { /* Slide + fade from right */ }
@keyframes scaleIn { /* Scale 0.95 → 1 */ }
@keyframes scaleOut { /* Scale 1 → 0.95 */ }
@keyframes spin { /* 360° rotation */ }
@keyframes pulse { /* Opacity + scale pulse */ }
@keyframes shimmer { /* Gradient sweep */ }
@keyframes bounce { /* Vertical bounce */ }
@keyframes shake { /* Horizontal shake */ }
```

### Utility Classes
```tsx
className="animate-fade-in"        // Fade in (250ms)
className="animate-slide-in-top"   // Slide from top (250ms)
className="animate-scale-in"       // Scale in (250ms)
className="animate-spin"           // Continuous spin (1s)
className="animate-pulse-slow"     // Slow pulse (1.5s)
className="animate-shimmer"        // Shimmer effect (2s)
className="animate-bounce-subtle"  // Subtle bounce (1s)
className="animate-shake"          // Shake for errors (0.5s)
```

---

## Component-Specific Animations

### Button
```tsx
// Base transitions
className="transition-all duration-base"

// Hover state
className="hover:bg-primary/90 hover:shadow-md"

// Active state
className="active:scale-[0.98] active:shadow-sm"

// Focus ring
className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

### Card (Clickable)
```tsx
// Hover scale
className="transition-all duration-base hover:scale-[1.02] hover:shadow-md"

// Active scale
className="active:scale-[0.98]"
```

### Modal/Dialog
```tsx
// Overlay fade
className="data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 fade-out-0 duration-base"

// Content zoom + slide
className="data-[state=open]:animate-in data-[state=closed]:animate-out zoom-in-95 zoom-out-95 slide-in-from-top-[48%] duration-slow"
```

### Checkbox/Radio
```tsx
// Root transition
className="transition-all duration-base data-[state=checked]:scale-105"

// Indicator animation
className="animate-in fade-in-0 zoom-in-95 duration-fast"
```

### Input/Select
```tsx
// Border transition
className="transition-all duration-base hover:border-border-primary focus:border-accent-primary"

// Focus ring
className="focus-visible:ring-2 focus-visible:ring-ring"
```

---

## Reduced Motion Support

### CSS Media Query
**Location**: `frontend/src/styles/animations.css`

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### JavaScript Detection
**Location**: `frontend/src/lib/animations.ts`

```typescript
export function getAccessibleAnimation<T>(animation: T): T | Record<string, never> {
  if (typeof window === 'undefined') return animation;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return prefersReducedMotion ? {} : animation;
}
```

### Usage in Components
```tsx
import { getAccessibleAnimation, fadeIn } from '@/lib/animations'

<motion.div
  variants={getAccessibleAnimation(fadeIn)}
  // Animation will be empty object if user prefers reduced motion
/>
```

---

## Performance Optimization

### CSS Transform Optimization
✅ **DO**: Use `transform` and `opacity` (GPU-accelerated)
```tsx
className="transition-transform duration-base hover:scale-[1.02]"
```

❌ **DON'T**: Animate `width`, `height`, `top`, `left` (causes layout reflow)
```tsx
// Bad - causes reflow
className="transition-all hover:w-[200px]"
```

### Will-Change Hint
For frequently animated elements:
```tsx
className="will-change-transform"
```

⚠️ **Warning**: Only use `will-change` on elements that will actually animate. Overuse hurts performance.

### Layer Promotion
Complex animations benefit from layer promotion:
```css
.animated-element {
  transform: translateZ(0); /* Creates new layer */
  backface-visibility: hidden; /* Prevents flicker */
}
```

---

## Testing Animations

### Visual Testing
```bash
# Record baseline
npm run test:visual

# Compare changes
npm run test:visual:update
```

### Performance Testing
1. Open Chrome DevTools
2. Go to Performance tab
3. Start recording
4. Trigger animation
5. Stop recording
6. Check timeline for:
   - Frame rate (should be 60fps)
   - No long tasks (>50ms)
   - Minimal layout recalculations

### Accessibility Testing
```typescript
// Test reduced motion preference
// In DevTools: Cmd+Shift+P → "Show Rendering" → "Emulate CSS prefers-reduced-motion"
```

---

## Animation Checklist

When adding animations:

- [ ] Duration uses token (fast/base/slow)
- [ ] Easing is appropriate (easeOut/easeInOut)
- [ ] Respects `prefers-reduced-motion`
- [ ] Tested at 60fps on mid-range device
- [ ] Uses GPU-accelerated properties (transform, opacity)
- [ ] Provides visual feedback for user action
- [ ] Doesn't block critical user flows
- [ ] Consistent with existing patterns
- [ ] Documented if creating new pattern

---

## Examples Gallery

### Loading Spinner
```tsx
<div className="animate-spin rounded-full h-8 w-8 border-3 border-accent-primary border-t-transparent" />
```

### Success Toast
```tsx
<motion.div
  variants={slideInFromTop}
  initial="initial"
  animate="animate"
  exit="exit"
  transition={transition.base}
  className="bg-accent-success text-white p-4 rounded-md"
>
  Saved successfully!
</motion.div>
```

### Modal Entrance
```tsx
<motion.div
  variants={scaleIn}
  initial="initial"
  animate="animate"
  exit="exit"
  transition={transition.slow}
  className="bg-surface-secondary p-xl rounded-lg shadow-lg"
>
  Modal content
</motion.div>
```

### Skeleton Loader
```tsx
<div className="skeleton h-4 w-full rounded-md animate-shimmer" />
```

---

## Further Reading

- [Components](./components.md) - Component-specific animation examples
- [Colors](./colors.md) - Accent colors for interactive states
- [Accessibility](../accessibility.md) - Accessibility best practices
- [Framer Motion Docs](https://www.framer.com/motion/) - Advanced animation API
