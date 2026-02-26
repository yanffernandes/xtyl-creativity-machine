"use client"

import { motion } from "framer-motion"

/**
 * Gradient Background with Animated Orbs
 *
 * Ethereal Blue + Liquid Glass design system background
 * Features animated gradient orbs that float smoothly
 */
export function GradientBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Base gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:bg-gradient-to-br dark:from-[#0A0E14] dark:via-[#0F1419] dark:to-[#14191F]" />

      {/* Animated gradient orbs */}
      <motion.div
        animate={{
          x: [0, 100, 0],
          y: [0, -100, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full blur-3xl opacity-30 bg-[#5B8DEF] dark:bg-[#5B8DEF]"
      />

      <motion.div
        animate={{
          x: [0, -150, 0],
          y: [0, 150, 0],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full blur-3xl opacity-30 bg-[#7AA5F5] dark:bg-[#7AA5F5]"
      />

      <motion.div
        animate={{
          x: [0, 120, 0],
          y: [0, 80, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-1/2 left-1/2 w-1/3 h-1/3 rounded-full blur-3xl opacity-20 bg-[#4A7AD9] dark:bg-[#4A7AD9]"
      />
    </div>
  )
}
