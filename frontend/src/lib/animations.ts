/**
 * XTYL Premium Animation Presets
 *
 * Framer Motion animation configurations for consistent, premium micro-interactions.
 * All animations follow the 200-300ms guideline for smooth, purposeful motion.
 *
 * @version 1.0.0
 * @feature 001-premium-visual-redesign
 */

import { Transition, Variants } from 'framer-motion';
import { animations } from './design-tokens';

// ============================================================================
// TRANSITION PRESETS
// ============================================================================

export const transition = {
  /**
   * Fast transitions (150ms) - Hover states, tooltips, instant feedback
   */
  fast: {
    duration: animations.transition.fast.duration / 1000,
    ease: 'easeOut',
  } as Transition,

  /**
   * Base transitions (250ms) - Focus states, dropdowns, most UI interactions
   */
  base: {
    duration: animations.transition.base.duration / 1000,
    ease: 'easeInOut',
  } as Transition,

  /**
   * Slow transitions (350ms) - Modals, drawers, complex animations
   */
  slow: {
    duration: animations.transition.slow.duration / 1000,
    ease: 'easeInOut',
  } as Transition,

  /**
   * Spring - Gentle (Subtle bounces, smooth modal entrances)
   */
  springGentle: {
    type: 'spring',
    stiffness: animations.spring.gentle.stiffness,
    damping: animations.spring.gentle.damping,
    mass: animations.spring.gentle.mass,
  } as Transition,

  /**
   * Spring - Bouncy (Playful interactions, success animations)
   */
  springBouncy: {
    type: 'spring',
    stiffness: animations.spring.bouncy.stiffness,
    damping: animations.spring.bouncy.damping,
    mass: animations.spring.bouncy.mass,
  } as Transition,
};

// ============================================================================
// COMMON ANIMATION VARIANTS
// ============================================================================

/**
 * Fade animations (opacity only)
 */
export const fade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * Fade + Scale (modals, dialogs, popovers)
 */
export const fadeScale: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

/**
 * Slide from top (notifications, dropdowns)
 */
export const slideFromTop: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

/**
 * Slide from bottom (sheets, bottom navigation)
 */
export const slideFromBottom: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

/**
 * Slide from left (side drawers)
 */
export const slideFromLeft: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

/**
 * Slide from right (side drawers, context menus)
 */
export const slideFromRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

// ============================================================================
// INTERACTION PRESETS
// ============================================================================

/**
 * Button hover/tap animations
 */
export const buttonInteraction = {
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

/**
 * Card hover animations
 */
export const cardInteraction = {
  hover: { y: -4, transition: transition.fast },
  tap: { scale: 0.98 },
};

/**
 * Icon button hover/tap animations
 */
export const iconButtonInteraction = {
  hover: { scale: 1.1, transition: transition.fast },
  tap: { scale: 0.9 },
};

// ============================================================================
// STAGGER ANIMATIONS
// ============================================================================

/**
 * Stagger children animations (lists, grids)
 */
export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

// ============================================================================
// LOADING ANIMATIONS
// ============================================================================

/**
 * Spinner rotation
 */
export const spinnerRotation = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

/**
 * Pulse animation (loading indicators)
 */
export const pulse: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ============================================================================
// ACCESSIBILITY
// ============================================================================

/**
 * Respects user's prefers-reduced-motion preference
 * Returns an empty object if reduced motion is preferred
 */
export function getAccessibleAnimation<T extends Record<string, unknown>>(
  animation: T
): T | Record<string, never> {
  if (typeof window === 'undefined') return animation;

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  return prefersReducedMotion ? {} : animation;
}

/**
 * Transition preset that respects reduced motion
 */
export function getAccessibleTransition(
  transition: Transition
): Transition | { duration: 0 } {
  if (typeof window === 'undefined') return transition;

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  return prefersReducedMotion ? { duration: 0 } : transition;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Combine multiple variants into a single variant object
 */
export function combineVariants(...variants: Variants[]): Variants {
  return variants.reduce((acc, variant) => {
    Object.keys(variant).forEach((key) => {
      acc[key] = { ...acc[key], ...variant[key] };
    });
    return acc;
  }, {} as Variants);
}

/**
 * Create a custom transition with overrides
 */
export function createTransition(
  base: Transition,
  overrides: Partial<Transition>
): Transition {
  return { ...base, ...overrides };
}
