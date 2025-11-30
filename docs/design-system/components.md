# Component Customization Guidelines

**Version**: 1.0.0
**Feature**: Premium Visual Redesign
**Last Updated**: 2025-11-25

## Overview

XTYL uses a customized version of Shadcn/UI components built on Radix UI primitives. All components follow the premium design system with Emerald Fresh accent color, refined spacing, and smooth animations.

---

## Component Philosophy

### Customization Approach
- **Base**: Shadcn/UI component structure (maintained for consistency)
- **Visual Layer**: Custom colors, spacing, typography, borders, shadows
- **Interactions**: Premium animations and state transitions (250ms base)
- **Accessibility**: WCAG AA compliance, keyboard navigation, reduced-motion support

### DO ✅
- Use design tokens from `design-tokens.ts` for all styling
- Apply spacing tokens (`space-xs` to `space-3xl`) instead of arbitrary pixels
- Use semantic color tokens (`accent-primary`, `text-primary`, etc.)
- Add smooth transitions with `duration-base` (250ms) or `duration-fast` (150ms)
- Test accessibility with keyboard navigation and screen readers

### DON'T ❌
- Use arbitrary hex colors outside the token system
- Use pixel values not part of the 8px grid (0, 4, 8, 16, 24, 32, 48, 64)
- Create new color tokens without justification (we have 11 curated tokens)
- Skip animation states (hover, focus, active)
- Override reduced-motion media queries

---

## Core Components

### Button

**Location**: `frontend/src/components/ui/button.tsx`

**Variants**:
- `default` - Emerald primary button (dark text for WCAG AAA contrast)
- `destructive` - Red error actions
- `outline` - Bordered secondary actions
- `secondary` - Gray background
- `ghost` - Transparent, hover only
- `link` - Text link style

**Sizes**: `sm`, `default`, `lg`, `icon`

**Customization Example**:
```tsx
<Button
  variant="default"
  size="lg"
  className="gap-2" // Add icon spacing
>
  <Plus className="h-5 w-5" />
  Create Project
</Button>
```

**States**:
- Hover: `hover:bg-primary/90 hover:shadow-md`
- Active: `active:scale-[0.98] active:shadow-sm`
- Focus: `focus-visible:ring-2 focus-visible:ring-ring`
- Disabled: `disabled:opacity-50 disabled:pointer-events-none`

---

### Input

**Location**: `frontend/src/components/ui/input.tsx`

**Features**:
- Smooth border transitions (250ms)
- Emerald focus ring
- Hover state with subtle border change

**Usage**:
```tsx
<Input
  placeholder="Enter workspace name"
  className="max-w-md"
/>
```

**States**:
- Hover: `hover:border-border-primary`
- Focus: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-accent-primary`

---

### Card

**Location**: `frontend/src/components/ui/card.tsx`

**Prop**: `clickable?: boolean` - Adds hover scale effect for interactive cards

**Composition**:
- `Card` - Root container
- `CardHeader` - Header with padding `p-lg` (24px)
- `CardTitle` - H3 heading (2xl, semibold, tight tracking)
- `CardDescription` - Secondary text (sm, text-secondary)
- `CardContent` - Main content (`p-lg pt-0`)
- `CardFooter` - Footer actions (`p-lg pt-0`)

**Example**:
```tsx
<Card clickable>
  <CardHeader>
    <CardTitle>Project Name</CardTitle>
    <CardDescription>Last updated 2 hours ago</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Project content here...</p>
  </CardContent>
  <CardFooter>
    <Button variant="outline">View Details</Button>
  </CardFooter>
</Card>
```

---

### Loading Components

#### Spinner

**Location**: `frontend/src/components/loading/spinner.tsx`

**Variants**:
- `Spinner` - Basic spinner with size prop
- `SpinnerCenter` - Centered with padding
- `SpinnerOverlay` - Full screen overlay with backdrop

**Usage**:
```tsx
<Spinner size="md" />
<SpinnerCenter size="lg" />
<SpinnerOverlay /> // For blocking operations
```

#### Skeleton

**Location**: `frontend/src/components/loading/skeleton.tsx`

**Variants**:
- `Skeleton` - Base shimmer effect
- `SkeletonText` - Single line (1rem height)
- `SkeletonHeading` - Heading size (2rem height)
- `SkeletonAvatar` - Circle (3rem diameter)
- `SkeletonCard` - Card placeholder (12rem height)
- `SkeletonCardContent` - Composite card content
- `SkeletonProjectCard` - Full project card layout

**Usage**:
```tsx
{isLoading ? (
  <SkeletonProjectCard />
) : (
  <ProjectCard data={project} />
)}
```

#### Progress

**Location**: `frontend/src/components/loading/progress.tsx`

**Variants**:
- `Progress` - Linear progress bar with percentage
- `ProgressIndeterminate` - Unknown duration
- `CircularProgress` - Circular SVG progress

**Usage**:
```tsx
<Progress
  value={progress}
  label="Uploading files"
  timeEstimate="~30 seconds remaining"
/>
```

---

### Empty States

**Locations**: `frontend/src/components/empty-states/`

#### EmptyWorkspace
- Icon: Briefcase
- CTA: "Criar Primeiro Projeto"
- Use when: No projects exist in workspace

#### EmptyProject
- Icon: FileText
- CTA: "Criar Primeira Criação"
- Use when: No creations in project

#### EmptyCreation
- Icon: Sparkles
- CTA: "Começar Conversa"
- Use when: New creation with no content

**Usage**:
```tsx
{projects.length === 0 ? (
  <EmptyWorkspace onCreateProject={handleCreate} />
) : (
  <ProjectList projects={projects} />
)}
```

---

## Dialog (Modal)

**Location**: `frontend/src/components/ui/dialog.tsx`

**Features**:
- Fade + zoom animation (350ms slow transition)
- Backdrop blur with 80% opacity
- Emerald accent for focus states
- Padding: `p-xl` (32px)

**Composition**:
- `Dialog` - Root (manages open state)
- `DialogTrigger` - Opens dialog
- `DialogContent` - Modal container
- `DialogHeader` - Header section
- `DialogTitle` - H2 heading
- `DialogDescription` - Secondary text
- `DialogFooter` - Action buttons

**Example**:
```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Settings</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Settings</DialogTitle>
      <DialogDescription>
        Manage your workspace settings
      </DialogDescription>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Save Changes</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Form Components

### Checkbox

**Location**: `frontend/src/components/ui/checkbox.tsx`

**Features**:
- Scale effect on check (1.05)
- Fade-in + zoom animation (150ms)
- Emerald border when checked

### Radio

**Location**: `frontend/src/components/ui/radio-group.tsx`

**Components**: `RadioGroup`, `RadioGroupItem`

**Features**:
- Scale effect on select (1.05)
- Fade-in indicator animation

### Select

**Location**: `frontend/src/components/ui/select.tsx`

**Features**:
- Smooth dropdown animation
- Hover states on items (150ms)
- Focus ring on trigger

---

## Animation Standards

### Duration Tokens
- `duration-fast`: 150ms - Quick feedback (hover, check/uncheck)
- `duration-base`: 250ms - Standard transitions (buttons, inputs)
- `duration-slow`: 350ms - Complex animations (modals, drawers)

### Common Patterns
```tsx
// Hover effect
className="transition-all duration-base hover:scale-[1.02]"

// Active click
className="active:scale-[0.98]"

// Focus ring
className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

// Fade in
className="animate-in fade-in-0 zoom-in-95 duration-fast"
```

### Reduced Motion
All animations automatically respect `prefers-reduced-motion: reduce`. The global CSS rule in `animations.css` reduces all durations to 0.01ms for users who prefer reduced motion.

---

## Accessibility Checklist

When creating or modifying components:

- [ ] Color contrast meets WCAG AA (4.5:1 for text, 3:1 for UI)
- [ ] Keyboard navigation works (Tab, Enter, Escape, Arrow keys)
- [ ] Focus states are clearly visible (2px ring with offset)
- [ ] Screen reader labels provided (`aria-label`, `aria-labelledby`)
- [ ] Loading states announced (`role="status"`, `aria-live="polite"`)
- [ ] Error states clearly indicated (color + icon + text)
- [ ] Touch targets minimum 44x44px on mobile
- [ ] Animations respect `prefers-reduced-motion`

---

## Performance Guidelines

### Bundle Size
- Keep component files under 10KB
- Use dynamic imports for heavy components
- Avoid unnecessary dependencies

### Rendering
- Use React.memo for expensive components
- Implement proper key props for lists
- Avoid inline function definitions in render

### Animations
- Use CSS transforms (not position/width/height)
- Target 60fps for all animations
- Test on mid-range devices

---

## Testing Recommendations

### Visual Testing
```bash
npm run test:visual # Playwright visual regression
```

### Accessibility Testing
```bash
npm run test:a11y # axe-core tests
```

### Performance Testing
```bash
npm run lighthouse # Lighthouse CI
```

---

## Further Reading

- [Colors](./colors.md) - Color palette and semantic usage
- [Typography](./typography.md) - Font scales and hierarchy
- [Spacing](./spacing.md) - 8px grid system
- [Animations](./animations.md) - Animation standards and patterns
