# Feature Specification: Design Responsivo

**Feature Branch**: `014-responsivo`
**Created**: 2025-12-11
**Status**: ✅ **Implementado**
**Input**: User description: "Revisar e implementar responsividade em todas as telas com mobile-first approach e breakpoints consistentes."

## Clarifications

### Session 2025-12-11

- **Breakpoints**: Mobile (< 640px), Tablet (640px - 1024px), Desktop (> 1024px)
- **Approach**: Mobile-first CSS (base styles for mobile, media queries for larger screens)
- **Priority**: Dashboard, Projetos, Tarefas first, then other features
- **Sidebar behavior**: Collapsible hamburger menu on mobile/tablet
- **Table strategy**: Convert to card layout on mobile for better readability

## Overview

Implementation of comprehensive responsive design across all AlvoBot screens, ensuring optimal user experience on mobile, tablet, and desktop devices. This feature focuses on making the application fully usable on all screen sizes while maintaining visual consistency and usability.

### Current State

- **Basic responsive**: Some components have basic @media queries
- **Sidebar**: Fixed width sidebar (16rem) with basic mobile hiding
- **Tables**: Standard table layout (not mobile-friendly)
- **Modals**: Fixed sizes (sm, md, lg, xl) that may overflow on mobile
- **Forms**: Standard desktop-oriented layouts
- **CSS Framework**: CSS Modules with custom properties (no Tailwind)
- **Design System**: Semantic CSS variables in `/frontend/src/assets/styles/variables.css`

### Target State

- **Mobile-first CSS**: All components styled mobile-first
- **Responsive sidebar**: Hamburger menu on mobile/tablet, collapsible on desktop
- **Adaptive tables**: Cards on mobile, tables on desktop
- **Smart modals**: Fullscreen on mobile, centered on larger screens
- **Touch-friendly UI**: Larger touch targets (min 44x44px) on mobile
- **Responsive typography**: Fluid font sizes with clamp()
- **Consistent breakpoints**: Standard breakpoint system across all components

## Technical Architecture

### Breakpoint System

```css
/* Mobile-first approach */
/* Base styles (< 640px) - no media query needed */

/* Tablet */
@media (min-width: 640px) { }

/* Desktop */
@media (min-width: 1024px) { }

/* Large Desktop */
@media (min-width: 1440px) { }

/* Special: Landscape phones */
@media (max-width: 640px) and (orientation: landscape) { }
```

### CSS Variables for Breakpoints

Add to `/frontend/src/assets/styles/variables.css`:

```css
:root {
  /* ============================================
   * BREAKPOINTS
   * ============================================ */
  --breakpoint-mobile: 640px;
  --breakpoint-tablet: 1024px;
  --breakpoint-desktop: 1440px;

  /* ============================================
   * RESPONSIVE SPACING
   * ============================================ */
  --space-responsive-xs: clamp(0.25rem, 1vw, 0.5rem);
  --space-responsive-sm: clamp(0.5rem, 2vw, 1rem);
  --space-responsive-md: clamp(1rem, 3vw, 1.5rem);
  --space-responsive-lg: clamp(1.5rem, 4vw, 2.5rem);
  --space-responsive-xl: clamp(2rem, 5vw, 4rem);

  /* ============================================
   * TOUCH TARGETS (Mobile)
   * ============================================ */
  --touch-target-min: 44px; /* iOS/Android minimum */
  --touch-target-comfortable: 48px;
}
```

### Component Responsive Patterns

#### 1. Layout Components

**MainLayout** (`/frontend/src/shared/layouts/MainLayout/`)

```css
/* MainLayout.module.css */
.layout {
  display: flex;
  flex-direction: column; /* Mobile: stack */
}

@media (min-width: 1024px) {
  .layout {
    flex-direction: row; /* Desktop: side-by-side */
  }
}

.main {
  flex: 1;
  overflow-x: hidden;
  min-height: 100vh;
}

.content {
  padding: var(--space-responsive-md);
}

@media (min-width: 640px) {
  .content {
    padding: var(--space-responsive-lg);
  }
}
```

**Sidebar** (`/frontend/src/shared/layouts/MainLayout/Sidebar.tsx`)

Mobile behavior:
- Hidden by default on mobile/tablet
- Toggle button in Header
- Slide-in overlay when open
- Backdrop click to close

```tsx
// Add mobile state
const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
```

```css
/* Sidebar.module.css */
.sidebar {
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  transform: translateX(-100%);
  transition: transform var(--transition-normal);
  z-index: 1000;
  background-color: #1a1a2e;
  overflow-y: auto;
}

.sidebar.open {
  transform: translateX(0);
}

.backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background-color: var(--overlay-dark);
  z-index: 999;
}

.backdrop.visible {
  display: block;
}

@media (min-width: 1024px) {
  .sidebar {
    width: 16rem;
    position: sticky;
    top: 0;
    transform: translateX(0);
    border-right: 1px solid rgba(255, 255, 255, 0.1);
  }

  .backdrop {
    display: none !important;
  }
}
```

**Header** (New component)

Add hamburger menu button for mobile:

```tsx
// /frontend/src/shared/layouts/MainLayout/Header.tsx
import { Menu, X } from 'lucide-react'

interface HeaderProps {
  onMenuToggle?: () => void
  isMobileMenuOpen?: boolean
}

export function Header({ onMenuToggle, isMobileMenuOpen }: HeaderProps) {
  return (
    <header className={styles.header}>
      <button
        className={styles.menuButton}
        onClick={onMenuToggle}
        aria-label={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* User profile, notifications, etc. */}
    </header>
  )
}
```

```css
/* Header.module.css */
.header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background-color: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.menuButton {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--touch-target-comfortable);
  height: var(--touch-target-comfortable);
  border: none;
  background: none;
  cursor: pointer;
  color: var(--color-text-primary);
}

@media (min-width: 1024px) {
  .menuButton {
    display: none;
  }
}
```

#### 2. Table Components

**Table** (`/frontend/src/shared/components/Table/`)

Strategy: Show as cards on mobile, tables on tablet+

```tsx
// Add responsive prop
interface TableProps {
  responsive?: boolean // default: true
  // ... other props
}
```

```css
/* Table.module.css */
.wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

/* Mobile: Hide table, show card layout */
@media (max-width: 639px) {
  .table.responsive {
    display: none;
  }
}

/* Card layout for mobile */
.cardView {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

@media (min-width: 640px) {
  .cardView {
    display: none;
  }
}

.card {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.cardRow {
  display: flex;
  justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
}

.cardRow:last-child {
  border-bottom: none;
}

.cardLabel {
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.cardValue {
  color: var(--color-text-primary);
  text-align: right;
}
```

#### 3. Modal Components

**Modal** (`/frontend/src/shared/components/Modal/`)

Fullscreen on mobile, centered on desktop:

```css
/* Modal.module.css */
.overlay {
  position: fixed;
  inset: 0;
  background-color: var(--overlay-dark);
  display: flex;
  align-items: flex-end; /* Mobile: bottom sheet */
  justify-content: center;
  z-index: 2000;
  padding: 0;
}

@media (min-width: 640px) {
  .overlay {
    align-items: center;
    padding: var(--space-4);
  }
}

.content {
  background-color: var(--color-bg-primary);
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0; /* Mobile: rounded top */
  animation: slideUp 0.3s ease-out;
}

@media (min-width: 640px) {
  .content {
    border-radius: var(--radius-lg);
    animation: fadeIn 0.2s ease-out;
  }

  .content.sm {
    max-width: 28rem;
  }

  .content.md {
    max-width: 40rem;
  }

  .content.lg {
    max-width: 56rem;
  }

  .content.xl {
    max-width: 72rem;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  background-color: var(--color-bg-primary);
  z-index: 1;
}

.closeButton {
  min-width: var(--touch-target-comfortable);
  min-height: var(--touch-target-comfortable);
}
```

#### 4. Form Components

**Input/Button** - Touch-friendly sizes

```css
/* Input.module.css */
.input {
  height: 2.75rem; /* Base: 44px */
  padding: var(--space-2) var(--space-3);
  font-size: 1rem;
}

@media (min-width: 640px) {
  .input {
    height: 2.5rem; /* Desktop: 40px */
    font-size: 0.875rem;
  }
}

/* Button.module.css */
.button {
  min-height: var(--touch-target-comfortable);
  padding: var(--space-2) var(--space-4);
  font-size: 1rem;
}

@media (min-width: 640px) {
  .button {
    min-height: 2.5rem;
    font-size: 0.875rem;
  }
}
```

#### 5. Grid Layouts

**Projects/Articles Grid**

```css
/* ProjectsPage.module.css */
.grid {
  display: grid;
  grid-template-columns: 1fr; /* Mobile: 1 column */
  gap: var(--space-4);
}

@media (min-width: 640px) {
  .grid {
    grid-template-columns: repeat(2, 1fr); /* Tablet: 2 columns */
  }
}

@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr); /* Desktop: 3 columns */
  }
}

@media (min-width: 1440px) {
  .grid {
    grid-template-columns: repeat(4, 1fr); /* Large: 4 columns */
  }
}
```

#### 6. Kanban Board

**TasksPage** - Horizontal scroll on mobile

```css
/* KanbanBoard.module.css */
.board {
  display: flex;
  gap: var(--space-3);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: var(--space-4);
}

/* Mobile: Narrower columns */
.column {
  min-width: 280px;
  flex-shrink: 0;
}

@media (min-width: 640px) {
  .column {
    min-width: 320px;
  }
}

@media (min-width: 1024px) {
  .board {
    overflow-x: visible;
  }

  .column {
    flex: 1;
    min-width: 0;
  }
}
```

#### 7. Page Headers

Responsive header with stacking on mobile:

```css
/* Common pattern for all pages */
.header {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

@media (min-width: 640px) {
  .header {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.titleSection {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.headerRight {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

@media (min-width: 640px) {
  .headerRight {
    flex-direction: row;
    align-items: center;
  }
}
```

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mobile Navigation (Priority: P0)

**As a** mobile user,
**I want to** navigate the application using a hamburger menu,
**So that** I can access all features on my phone without a cramped interface.

**Why this priority**: Mobile navigation is the foundation for all mobile interactions. Without proper navigation, users cannot access any features on mobile devices.

**Independent Test**: Open app on mobile device (or Chrome DevTools mobile view), click hamburger menu, verify sidebar appears, navigate to different sections, verify smooth transitions.

**Acceptance Scenarios**:

1. **Given** a user on mobile (< 640px), **When** they load any page, **Then** the sidebar is hidden and a hamburger menu button is visible in the header
2. **Given** a user clicks the hamburger menu, **When** the sidebar opens, **Then** it slides in from the left with a backdrop overlay
3. **Given** the mobile menu is open, **When** the user clicks the backdrop or a nav item, **Then** the menu closes smoothly
4. **Given** a user on desktop (> 1024px), **When** they load any page, **Then** the sidebar is always visible and the hamburger menu is hidden

---

### User Story 2 - Responsive Tables (Priority: P0)

**As a** mobile user,
**I want to** view table data in an easy-to-read card format,
**So that** I can access information without horizontal scrolling or tiny text.

**Why this priority**: Tables are used extensively (projects, articles, tasks, runs, etc.) and are the primary pain point on mobile. Card layouts provide much better UX on small screens.

**Independent Test**: Open Projects, Articles, or Runs page on mobile, verify data shows as cards, check that all information is readable and actions are accessible.

**Acceptance Scenarios**:

1. **Given** a user on mobile viewing a page with tables, **When** they see the data, **Then** it is displayed as cards instead of a table
2. **Given** a user viewing data cards, **When** they scroll, **Then** each card shows all relevant information clearly
3. **Given** a user on tablet or desktop, **When** they view the same page, **Then** data is displayed in a traditional table format
4. **Given** a card has actions (edit, delete), **When** the user taps them, **Then** the touch targets are at least 44x44px

---

### User Story 3 - Fullscreen Modals on Mobile (Priority: P1)

**As a** mobile user,
**I want** modals to use the full screen,
**So that** I have enough space to interact with forms and content comfortably.

**Why this priority**: Many modals contain forms and complex interactions. Fullscreen modals on mobile prevent awkward scrolling and viewport issues.

**Independent Test**: Open any modal (create project, edit article, etc.) on mobile, verify it takes full screen, test form interactions, verify smooth animations.

**Acceptance Scenarios**:

1. **Given** a user on mobile opens a modal, **When** it appears, **Then** it slides up from the bottom and takes the full screen
2. **Given** a modal is open on mobile, **When** the user scrolls content, **Then** the header stays fixed at the top with a close button
3. **Given** a user on tablet/desktop, **When** they open a modal, **Then** it appears centered with appropriate size (sm/md/lg/xl)
4. **Given** a user closes a mobile modal, **When** the animation completes, **Then** it slides down smoothly

---

### User Story 4 - Responsive Dashboard (Priority: P1)

**As a** mobile user,
**I want** the dashboard metrics and actions to stack vertically,
**So that** I can view all information without zooming or horizontal scrolling.

**Why this priority**: Dashboard is the landing page for most users. A poor mobile experience here creates a bad first impression.

**Independent Test**: Open dashboard on mobile, verify metrics stack vertically, check quick actions are tappable, test recent activity readability.

**Acceptance Scenarios**:

1. **Given** a user on mobile views the dashboard, **When** they see the metrics section, **Then** each metric card stacks vertically
2. **Given** a user scrolls the dashboard, **When** they reach quick actions, **Then** action cards are full-width and easy to tap
3. **Given** a user on tablet, **When** they view the dashboard, **Then** metrics show in a 2-column grid
4. **Given** a user on desktop, **When** they view the dashboard, **Then** metrics show in a 3-column grid

---

### User Story 5 - Responsive Kanban Board (Priority: P2)

**As a** mobile user,
**I want** to view and interact with the Kanban board using horizontal scrolling,
**So that** I can manage tasks effectively on my phone.

**Why this priority**: The Kanban board is a core productivity feature. While less critical than navigation and tables, it needs to work well on mobile.

**Independent Test**: Open Tasks page on mobile, verify columns scroll horizontally, test drag-and-drop on touch, verify cards are readable.

**Acceptance Scenarios**:

1. **Given** a user on mobile views the Kanban board, **When** they scroll, **Then** columns scroll horizontally with smooth momentum
2. **Given** a user wants to move a task, **When** they drag it on touch, **Then** the drag interaction works smoothly
3. **Given** a user on tablet/desktop, **When** they view the Kanban board, **Then** all columns are visible without scrolling
4. **Given** task cards on mobile, **When** displayed, **Then** they are at least 280px wide for comfortable reading

---

### User Story 6 - Touch-Friendly Forms (Priority: P2)

**As a** mobile user,
**I want** form inputs and buttons to be large enough to tap easily,
**So that** I can fill out forms without frustration or errors.

**Why this priority**: Forms are common throughout the app. Touch-friendly inputs improve user satisfaction and reduce errors.

**Independent Test**: Open any form (create project, edit task, settings) on mobile, test tapping inputs, verify keyboard interactions, check button sizes.

**Acceptance Scenarios**:

1. **Given** a form input on mobile, **When** measured, **Then** it has a minimum height of 44px
2. **Given** a button on mobile, **When** measured, **Then** it has minimum dimensions of 48x48px
3. **Given** a user taps an input, **When** the keyboard appears, **Then** the viewport adjusts to keep the input visible
4. **Given** select dropdowns on mobile, **When** opened, **Then** they use native mobile pickers for better UX

---

### User Story 7 - Responsive Typography (Priority: P3)

**As a** user on any device,
**I want** text sizes to scale appropriately,
**So that** content is readable without zooming regardless of screen size.

**Why this priority**: While important for usability, typography adjustments are less critical than structural layout changes. Can be refined iteratively.

**Independent Test**: View various pages on different screen sizes, check heading sizes, verify body text readability, test with browser zoom.

**Acceptance Scenarios**:

1. **Given** a user on mobile, **When** viewing body text, **Then** it is at least 16px (1rem) for comfortable reading
2. **Given** headings on mobile, **When** displayed, **Then** they use clamp() to scale fluidly between screen sizes
3. **Given** a user on large desktop, **When** viewing text, **Then** it does not grow beyond comfortable reading sizes
4. **Given** a user zooms the page, **When** text scales, **Then** it reflows without horizontal scrolling

---

## Implementation Plan

### Phase 1: Foundation (Priority: P0)
**Goal**: Get mobile navigation and core layout working

1. **Update CSS variables** - Add breakpoints and responsive spacing
2. **Refactor MainLayout** - Implement mobile-first flex layout
3. **Create responsive Header** - Add hamburger menu component
4. **Update Sidebar** - Implement slide-in mobile behavior with backdrop
5. **Test**: Verify navigation works on mobile, tablet, desktop

**Deliverable**: Users can navigate the app on all screen sizes

---

### Phase 2: Tables & Data Display (Priority: P0)
**Goal**: Make data readable on mobile

1. **Enhance Table component** - Add responsive card view
2. **Update ProjectsPage** - Implement responsive grid
3. **Update ArticlesPage** - Convert table to cards on mobile
4. **Update RunsPage** - Convert table to cards on mobile
5. **Test**: Verify data display on various screen sizes

**Deliverable**: All table-based pages are mobile-friendly

---

### Phase 3: Modals & Forms (Priority: P1)
**Goal**: Optimize form interactions for mobile

1. **Update Modal component** - Fullscreen on mobile, bottom sheet animation
2. **Update Input component** - Touch-friendly sizes
3. **Update Button component** - Minimum touch targets
4. **Update Select component** - Consider native pickers on mobile
5. **Test forms**: Create project, edit task, settings on mobile

**Deliverable**: All forms are touch-friendly and easy to use

---

### Phase 4: Page-Specific Layouts (Priority: P1-P2)
**Goal**: Optimize individual pages

1. **DashboardPage** - Responsive metrics grid
2. **ProjectsPage** - Already covered in Phase 2
3. **TasksPage** - Horizontal scroll Kanban on mobile
4. **SettingsPage** - Stack sections vertically on mobile
5. **FlowEditorPage** - Optimize for tablet minimum (complex UI)
6. **Test each page**: Verify usability on mobile, tablet, desktop

**Deliverable**: All major pages work well on mobile

---

### Phase 5: Touch Optimizations (Priority: P2-P3)
**Goal**: Polish mobile interactions

1. **Improve tap targets** - Audit all interactive elements
2. **Add swipe gestures** - Consider swipe-to-delete on cards
3. **Optimize scroll performance** - Test momentum scrolling
4. **Refine animations** - Ensure smooth 60fps on mobile
5. **Test on real devices**: iOS Safari, Android Chrome

**Deliverable**: Polished mobile experience

---

### Phase 6: Typography & Polish (Priority: P3)
**Goal**: Refine text scaling and visual hierarchy

1. **Implement fluid typography** - Use clamp() for responsive scaling
2. **Adjust spacing** - Fine-tune responsive spacing variables
3. **Test readability** - Verify contrast and font sizes
4. **Accessibility audit** - Check zoom behavior, screen readers
5. **Cross-browser testing**: Safari, Chrome, Firefox mobile

**Deliverable**: Professional, polished responsive design

---

## Testing Strategy

### Manual Testing Checklist

#### Mobile (< 640px)
- [ ] Navigation: Hamburger menu opens/closes smoothly
- [ ] Tables: Display as cards with all data visible
- [ ] Modals: Fullscreen with bottom sheet animation
- [ ] Forms: Touch targets at least 44x44px
- [ ] Buttons: All buttons easily tappable
- [ ] Kanban: Horizontal scroll works smoothly
- [ ] Typography: Text readable without zoom
- [ ] Images: Scale appropriately without overflow

#### Tablet (640px - 1024px)
- [ ] Navigation: Hamburger menu or visible sidebar (design choice)
- [ ] Tables: Show as tables (not cards)
- [ ] Modals: Centered with appropriate size
- [ ] Grid layouts: 2-column grids
- [ ] Forms: Comfortable spacing
- [ ] Kanban: All columns visible or minimal scroll

#### Desktop (> 1024px)
- [ ] Navigation: Sidebar always visible
- [ ] Tables: Full table view
- [ ] Modals: Centered with size variants
- [ ] Grid layouts: 3-4 column grids
- [ ] Optimal spacing and hierarchy

### Device Testing Matrix

| Device Type | Screen Size | Browser | Priority |
|-------------|-------------|---------|----------|
| iPhone 12/13 | 390x844 | Safari | P0 |
| iPhone SE | 375x667 | Safari | P1 |
| Samsung Galaxy S21 | 360x800 | Chrome | P0 |
| iPad Mini | 768x1024 | Safari | P1 |
| iPad Pro | 1024x1366 | Safari | P2 |
| Laptop | 1366x768 | Chrome | P0 |
| Desktop | 1920x1080 | Chrome | P1 |

### Automated Tests

```typescript
// Example responsive test
describe('Responsive Layout', () => {
  it('shows hamburger menu on mobile', () => {
    cy.viewport(375, 667) // iPhone SE
    cy.visit('/dashboard')
    cy.get('[aria-label="Abrir menu"]').should('be.visible')
    cy.get('.sidebar').should('not.be.visible')
  })

  it('shows sidebar on desktop', () => {
    cy.viewport(1440, 900)
    cy.visit('/dashboard')
    cy.get('[aria-label="Abrir menu"]').should('not.exist')
    cy.get('.sidebar').should('be.visible')
  })

  it('displays projects as cards on mobile', () => {
    cy.viewport(375, 667)
    cy.visit('/projects')
    cy.get('.cardView').should('be.visible')
    cy.get('table').should('not.exist')
  })

  it('displays projects as table on desktop', () => {
    cy.viewport(1440, 900)
    cy.visit('/projects')
    cy.get('table').should('be.visible')
    cy.get('.cardView').should('not.exist')
  })
})
```

## Performance Considerations

### Mobile Performance

1. **Minimize animations on low-end devices**
   ```css
   @media (prefers-reduced-motion: reduce) {
     * {
       animation-duration: 0.01ms !important;
       transition-duration: 0.01ms !important;
     }
   }
   ```

2. **Lazy load images**
   ```tsx
   <img src={src} loading="lazy" alt={alt} />
   ```

3. **Optimize scroll performance**
   ```css
   .scrollable {
     -webkit-overflow-scrolling: touch;
     overflow-scrolling: touch;
   }
   ```

4. **Avoid layout thrashing**
   - Use CSS transforms instead of position changes
   - Batch DOM reads/writes
   - Use `will-change` sparingly

### Bundle Size

- No new dependencies required (CSS-only implementation)
- CSS Modules already tree-shaken by Vite
- Consider splitting large components with `lazy()`

## Migration Path from Current State

### Step 1: Audit Current Responsive Code

```bash
# Find existing media queries
grep -r "@media" frontend/src --include="*.css"

# Check for viewport meta tag
grep -r "viewport" frontend/public/index.html
```

### Step 2: Add Viewport Meta Tag (if missing)

```html
<!-- /frontend/public/index.html -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
```

### Step 3: Update CSS Variables

Edit `/frontend/src/assets/styles/variables.css` to add responsive variables.

### Step 4: Component-by-Component Migration

1. Start with layout components (MainLayout, Sidebar, Header)
2. Move to shared components (Table, Modal, Button, Input)
3. Then page components (Dashboard, Projects, etc.)
4. Test after each component

### Step 5: Remove Old Responsive Code

```bash
# Example: Remove old mobile styles from Sidebar.module.css
# Replace entire @media block with new mobile-first approach
```

## Design Decisions

### Why Mobile-First?

- **Progressive enhancement**: Build up from smallest screen
- **Performance**: Mobile users download only necessary CSS
- **Simplicity**: Base styles are simpler, enhancements for larger screens
- **Future-proof**: Mobile traffic continues to grow

### Why No CSS Framework (Tailwind)?

- **Existing system**: Project uses CSS Modules with custom properties
- **Migration risk**: Adding Tailwind mid-project introduces complexity
- **Bundle size**: Custom CSS is smaller than Tailwind
- **Consistency**: Maintains existing design system approach

### Why Not React Responsive Libraries?

- **Simplicity**: CSS media queries are sufficient
- **Performance**: No JavaScript overhead for layout
- **SSR-friendly**: Pure CSS works server-side
- **Maintainability**: Easier for team to understand

## Accessibility Considerations

### Touch Targets

- Minimum 44x44px on mobile (iOS guidelines)
- 48x48px preferred (Material Design)
- Adequate spacing between interactive elements

### Keyboard Navigation

- Ensure focus styles visible on all screen sizes
- Tab order logical on mobile (though rare)

### Screen Readers

- ARIA labels work on mobile screen readers
- Semantic HTML (nav, main, aside) helps orientation

### Zoom Support

- Support up to 200% zoom without horizontal scroll
- Use relative units (rem, em, %)
- Test with browser zoom

## Documentation Updates

### For Developers

Create `/frontend/docs/responsive-design.md`:

```markdown
# Responsive Design Guidelines

## Breakpoints

- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

## Mobile-First Approach

Always write base styles for mobile, then add media queries for larger screens:

\`\`\`css
.component {
  /* Mobile styles (no media query) */
  display: flex;
  flex-direction: column;
}

@media (min-width: 640px) {
  .component {
    /* Tablet enhancements */
    flex-direction: row;
  }
}
\`\`\`

## Common Patterns

See examples in:
- Table: `/frontend/src/shared/components/Table/`
- Modal: `/frontend/src/shared/components/Modal/`
- MainLayout: `/frontend/src/shared/layouts/MainLayout/`
```

## Success Metrics

### User Experience
- [ ] Mobile users can complete all core tasks (create project, manage articles, etc.)
- [ ] No horizontal scrolling on any page at standard screen sizes
- [ ] Touch targets meet accessibility guidelines (44x44px minimum)
- [ ] All text readable without zooming

### Performance
- [ ] No layout shift (CLS) on responsive breakpoints
- [ ] Smooth 60fps animations on mobile
- [ ] Fast interaction response (< 100ms) on low-end devices

### Coverage
- [ ] 100% of pages responsive (all 24 pages)
- [ ] All modals work on mobile
- [ ] All forms touch-friendly

## Future Enhancements (Out of Scope)

These are intentionally excluded from this spec but noted for future consideration:

1. **Bottom Navigation**: Alternative mobile nav (iOS/Android style)
2. **Swipe Gestures**: Swipe-to-delete, swipe between pages
3. **Progressive Web App**: Add to home screen, offline support
4. **Dark Mode Toggle**: Responsive based on device preference
5. **Landscape Optimizations**: Special layouts for landscape phones
6. **Foldable Device Support**: Layouts for Samsung Fold, Surface Duo
7. **Print Styles**: Responsive print layouts

## References

- [iOS Human Interface Guidelines - Touch Targets](https://developer.apple.com/design/human-interface-guidelines/ios/visual-design/adaptivity-and-layout/)
- [Material Design - Touch Targets](https://material.io/design/usability/accessibility.html#layout-and-typography)
- [MDN - Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [Web.dev - Responsive Web Design Basics](https://web.dev/responsive-web-design-basics/)

---

**Estimated Effort**: 5-7 days (1 developer)
**Risk Level**: Low-Medium (CSS-only, no breaking changes)
**Dependencies**: None (can start immediately)
