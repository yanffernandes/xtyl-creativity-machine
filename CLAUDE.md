# xtyl-creativity-machine Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-25

## Active Technologies

- TypeScript 5.x (Frontend), Node.js 20+ (Build tools) + Next.js 14 (App Router), React 18, Tailwind CSS 3.4+, Shadcn/UI (customized), Framer Motion 10+ (animations), Radix UI (primitives) (001-premium-visual-redesign)

## Design System

### **Ethereal Blue + Liquid Glass (2025)**

#### Color Palette
- **Primary Accent**: #5B8DEF (Ethereal Blue)
- **Secondary Accent**: #4A7AD9 (Darker Blue)
- **Tertiary Accent**: #7AA5F5 (Lighter Blue)
- **Background (Light)**: Gradient from blue-50 via indigo-50 to purple-50
- **Background (Dark)**: #0A0E14 with animated gradient orbs

#### Design Principles
1. **Glassmorphism**: All cards, modals, and containers use backdrop-blur (24px-32px) with semi-transparent backgrounds
2. **Liquid Glass**: Inspired by Apple's 2025 design language with translucent surfaces and depth layering
3. **Soft Corners**: Border radius 8px-16px (no sharp 4px corners)
4. **Microanimations**: Framer Motion powered smooth transitions and hover effects
5. **Depth & Layering**: Multiple shadow layers to create 3D depth effect
6. **Professional Blue**: Replaced green (#10B981) with blue (#5B8DEF) for trust and professionalism

#### Typography
- **Headings**: Font-weight 600-700, tracking-tight
- **Body**: Font-weight 400-500
- **Scale**: h1(32px), h2(24px), h3(20px), h4(16px), body(14px), small(12px)

#### Components
- **Buttons**: Primary (solid blue), Secondary (outline blue), Ghost (transparent)
- **Cards**: Glass effect with backdrop-blur-2xl, soft shadows, gradient overlay
- **Inputs**: Translucent with glass borders, focus states in accent blue
- **Sidebar**: macOS style with rounded pills, active state filled
- **Command Palette**: Raycast-inspired with intense glassmorphism

#### Spacing & Layout
- Generous padding (p-6 standard for cards)
- Spacing scale: xs(4px), sm(8px), md(16px), lg(24px), xl(32px), 2xl(48px), 3xl(64px)

## Project Structure

```text
src/
  lib/design-tokens.ts          # Centralized design tokens
  styles/glass.css               # Glassmorphism utilities
  components/ui/                 # Shadcn/UI components (customized)
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x (Frontend), Node.js 20+ (Build tools): Follow standard conventions

**Design System Style**:
- Use design tokens from `@/lib/design-tokens`
- Apply glass effects via Tailwind utilities or inline styles
- Maintain accessibility (WCAG AA) with proper contrast ratios
- Use Framer Motion for all animations
- Follow mobile-first responsive design

## Recent Changes

- 001-premium-visual-redesign: Added TypeScript 5.x (Frontend), Node.js 20+ (Build tools) + Next.js 14 (App Router), React 18, Tailwind CSS 3.4+, Shadcn/UI (customized), Framer Motion 10+ (animations), Radix UI (primitives)
- 2025-11-25: Migrated from Emerald Fresh to Ethereal Blue + Liquid Glass design system

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
