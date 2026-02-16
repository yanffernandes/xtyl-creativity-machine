/**
 * Glass Effect Utilities
 *
 * Centralized Tailwind class strings for the liquid glass design system.
 */

import { cn } from '@/lib/utils';

export const floatingGlassSidebarClasses = cn(
  'bg-white/[0.03] dark:bg-white/[0.02]',
  'backdrop-blur-2xl backdrop-saturate-150',
  'border border-white/[0.1]',
  'rounded-2xl',
  'shadow-[0_8px_32px_-8px_rgba(0,0,0,0.15),0_0_0_1px_rgba(255,255,255,0.05)_inset]',
  'dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.03)_inset]',
);

export const glassCardClasses = cn(
  'bg-white/60 dark:bg-white/[0.05]',
  'backdrop-blur-md',
  'border border-white/20 dark:border-white/10',
  'rounded-xl',
);

export const glassNodeClasses = cn(
  'bg-white/70 dark:bg-white/[0.06]',
  'backdrop-blur-lg',
  'border border-white/30 dark:border-white/10',
  'rounded-xl',
  'shadow-lg shadow-black/5 dark:shadow-black/20',
);

export const glassPanelHeaderClasses = cn(
  'border-b border-white/[0.06]',
  'bg-gradient-to-b from-white/[0.04] to-transparent',
);

export const glassItemClasses = cn(
  'bg-white/[0.04] dark:bg-white/[0.02]',
  'border border-white/[0.08]',
  'hover:bg-white/[0.08] hover:border-primary/30',
  'hover:shadow-[0_4px_16px_-4px_rgba(91,141,239,0.2)]',
  'transition-all duration-200',
);

export const glassModalClasses = cn(
  'bg-white/80 dark:bg-gray-900/80',
  'backdrop-blur-2xl backdrop-saturate-150',
  'border border-white/20 dark:border-white/10',
  'rounded-2xl',
  'shadow-2xl shadow-black/10 dark:shadow-black/40',
);

export const handleDefaultClasses =
  '!bg-primary !w-2.5 !h-2.5 !border-2 !border-white';

export const handleInvalidClasses = '!bg-red-500 !border-red-300';

export const handleConnectedClasses = '!bg-primary-600 !border-primary-200';
