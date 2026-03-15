"use client"

/**
 * Subtle warm background — not animated, not distracting.
 * A production tool should feel calm, not performative.
 */
export function GradientBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Warm off-white base */}
      <div className="absolute inset-0 bg-surface-primary dark:bg-surface-primary" />

      {/* Very subtle warm vignette — barely there */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_10%,rgba(200,107,42,0.04)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_20%_10%,rgba(200,107,42,0.06)_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_90%,rgba(168,84,30,0.03)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_60%_50%_at_80%_90%,rgba(168,84,30,0.05)_0%,transparent_70%)]" />
    </div>
  )
}
