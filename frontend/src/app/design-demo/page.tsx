"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Home,
  FileText,
  Settings,
  Users,
  Sparkles,
  Command,
  ArrowRight,
  Check,
  X,
  Plus,
  ChevronRight,
  Zap,
  Palette,
  Moon,
  Sun,
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function DesignDemo() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const demoCommands = [
    { icon: Home, label: "Dashboard", shortcut: "⌘D" },
    { icon: FileText, label: "Documents", shortcut: "⌘E" },
    { icon: Users, label: "Team", shortcut: "⌘T" },
    { icon: Settings, label: "Settings", shortcut: "⌘," },
    { icon: Sparkles, label: "AI Assistant", shortcut: "⌘K" },
  ]

  return (
    <div className={cn("min-h-screen transition-colors duration-500 relative overflow-hidden", darkMode ? "bg-[#0A0E14]" : "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50")}>
      {/* Animated Gradient Orbs Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
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
          className={cn(
            "absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full blur-3xl opacity-30",
            darkMode ? "bg-[#5B8DEF]" : "bg-blue-400"
          )}
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
          className={cn(
            "absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full blur-3xl opacity-30",
            darkMode ? "bg-[#7AA5F5]" : "bg-indigo-400"
          )}
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
          className={cn(
            "absolute top-1/2 left-1/2 w-1/3 h-1/3 rounded-full blur-3xl opacity-20",
            darkMode ? "bg-[#4A7AD9]" : "bg-purple-300"
          )}
        />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div
          className={cn(
            "mx-auto max-w-7xl px-6 py-4 relative",
            darkMode
              ? "bg-white/[0.02] border-b border-white/10"
              : "bg-white/30 border-b border-white/60"
          )}
          style={{
            backdropFilter: "blur(32px) saturate(180%)",
            WebkitBackdropFilter: "blur(32px) saturate(180%)",
          }}
        >
          {/* Header glass reflection */}
          <div
            className={cn(
              "absolute inset-0 pointer-events-none",
              darkMode
                ? "bg-gradient-to-r from-white/[0.02] to-transparent"
                : "bg-gradient-to-r from-white/40 to-transparent"
            )}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5B8DEF] to-[#4A7AD9] flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h1 className={cn("text-xl font-semibold tracking-tight", darkMode ? "text-[#F5F7FA]" : "text-[#0A0E14]")}>
                Design Proposal 2025
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300",
                  "backdrop-blur-sm",
                  darkMode
                    ? "bg-white/10 text-white hover:bg-white/15"
                    : "bg-black/5 text-[#0A0E14] hover:bg-black/10"
                )}
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setSearchOpen(true)}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300",
                  "flex items-center gap-2",
                  "bg-[#5B8DEF] text-white hover:brightness-110",
                  "shadow-lg shadow-[#5B8DEF]/20"
                )}
              >
                <Command className="w-4 h-4" />
                Open Cmd+K
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-6">
        <div className="mx-auto max-w-7xl space-y-12">
          {/* Hero Section */}
          <section className="text-center space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#5B8DEF]/10 border border-[#5B8DEF]/20 mb-6">
                <Palette className="w-4 h-4 text-[#5B8DEF]" />
                <span className="text-sm font-medium text-[#5B8DEF]">Ethereal Blue + Liquid Glass</span>
              </div>
              <h2
                className={cn(
                  "text-5xl font-bold tracking-tight mb-4",
                  darkMode ? "text-[#F5F7FA]" : "text-[#0A0E14]"
                )}
              >
                Design System 2025
              </h2>
              <p className={cn("text-lg max-w-2xl mx-auto", darkMode ? "text-[#A0AEC0]" : "text-[#4A5568]")}>
                Inspirado em Raycast, Apple Liquid Glass e tendências modernas de UI/UX
              </p>
            </motion.div>
          </section>

          {/* Color Palette */}
          <section className="space-y-6">
            <h3 className={cn("text-2xl font-semibold", darkMode ? "text-[#F5F7FA]" : "text-[#0A0E14]")}>
              Color Palette
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Accent Colors */}
              <GlassCard darkMode={darkMode}>
                <div className="space-y-4">
                  <h4 className={cn("font-semibold", darkMode ? "text-[#F5F7FA]" : "text-[#0A0E14]")}>
                    Accent Colors
                  </h4>
                  <div className="space-y-3">
                    <ColorSwatch color="#5B8DEF" label="Primary" darkMode={darkMode} />
                    <ColorSwatch color="#4A7AD9" label="Secondary" darkMode={darkMode} />
                    <ColorSwatch color="#7AA5F5" label="Tertiary" darkMode={darkMode} />
                  </div>
                </div>
              </GlassCard>

              {/* Surface Colors */}
              <GlassCard darkMode={darkMode}>
                <div className="space-y-4">
                  <h4 className={cn("font-semibold", darkMode ? "text-[#F5F7FA]" : "text-[#0A0E14]")}>Surfaces</h4>
                  <div className="space-y-3">
                    {darkMode ? (
                      <>
                        <ColorSwatch color="#0A0E14" label="Background" darkMode={darkMode} />
                        <ColorSwatch color="#151A23" label="Primary" darkMode={darkMode} />
                        <ColorSwatch color="rgba(30,35,45,0.8)" label="Secondary" darkMode={darkMode} />
                      </>
                    ) : (
                      <>
                        <ColorSwatch color="#FFFFFF" label="Background" darkMode={darkMode} />
                        <ColorSwatch color="#F9FAFB" label="Primary" darkMode={darkMode} />
                        <ColorSwatch color="rgba(245,248,251,0.8)" label="Secondary" darkMode={darkMode} />
                      </>
                    )}
                  </div>
                </div>
              </GlassCard>

              {/* Text Colors */}
              <GlassCard darkMode={darkMode}>
                <div className="space-y-4">
                  <h4 className={cn("font-semibold", darkMode ? "text-[#F5F7FA]" : "text-[#0A0E14]")}>Text</h4>
                  <div className="space-y-3">
                    {darkMode ? (
                      <>
                        <ColorSwatch color="#F5F7FA" label="Primary" darkMode={darkMode} />
                        <ColorSwatch color="#A0AEC0" label="Secondary" darkMode={darkMode} />
                        <ColorSwatch color="#718096" label="Tertiary" darkMode={darkMode} />
                      </>
                    ) : (
                      <>
                        <ColorSwatch color="#0A0E14" label="Primary" darkMode={darkMode} />
                        <ColorSwatch color="#4A5568" label="Secondary" darkMode={darkMode} />
                        <ColorSwatch color="#718096" label="Tertiary" darkMode={darkMode} />
                      </>
                    )}
                  </div>
                </div>
              </GlassCard>
            </div>
          </section>

          {/* Components Showcase */}
          <section className="space-y-6">
            <h3 className={cn("text-2xl font-semibold", darkMode ? "text-[#F5F7FA]" : "text-[#0A0E14]")}>
              Components
            </h3>

            {/* Buttons */}
            <GlassCard darkMode={darkMode}>
              <h4 className={cn("font-semibold mb-6", darkMode ? "text-[#F5F7FA]" : "text-[#0A0E14]")}>Buttons</h4>
              <div className="flex flex-wrap gap-4">
                <Button variant="primary" darkMode={darkMode}>
                  <Sparkles className="w-4 h-4" />
                  Primary Button
                </Button>
                <Button variant="secondary" darkMode={darkMode}>
                  <FileText className="w-4 h-4" />
                  Secondary Button
                </Button>
                <Button variant="ghost" darkMode={darkMode}>
                  <Settings className="w-4 h-4" />
                  Ghost Button
                </Button>
              </div>
            </GlassCard>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlassCard darkMode={darkMode} hover>
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#5B8DEF] to-[#4A7AD9] flex items-center justify-center">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-medium text-[#5B8DEF]">Feature</span>
                  </div>
                  <div>
                    <h4 className={cn("font-semibold mb-2", darkMode ? "text-[#F5F7FA]" : "text-[#0A0E14]")}>
                      Liquid Glass Effect
                    </h4>
                    <p className={cn("text-sm", darkMode ? "text-[#A0AEC0]" : "text-[#4A5568]")}>
                      Translucent surfaces with backdrop blur creating depth and elegance
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[#5B8DEF] text-sm font-medium">
                    Learn more
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </GlassCard>

              <GlassCard darkMode={darkMode} hover>
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#7AA5F5] to-[#5B8DEF] flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-medium text-[#5B8DEF]">Animation</span>
                  </div>
                  <div>
                    <h4 className={cn("font-semibold mb-2", darkMode ? "text-[#F5F7FA]" : "text-[#0A0E14]")}>
                      Smooth Microinteractions
                    </h4>
                    <p className={cn("text-sm", darkMode ? "text-[#A0AEC0]" : "text-[#4A5568]")}>
                      Framer Motion powered animations for delightful user experiences
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[#5B8DEF] text-sm font-medium">
                    Learn more
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Sidebar Example */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlassCard darkMode={darkMode}>
                <h4 className={cn("font-semibold mb-6", darkMode ? "text-[#F5F7FA]" : "text-[#0A0E14]")}>
                  Sidebar Navigation (macOS Style)
                </h4>
                <div className="w-[260px] space-y-1">
                  {[
                    { icon: Home, label: "Dashboard", active: true },
                    { icon: FileText, label: "Documents", active: false },
                    { icon: Users, label: "Team", active: false },
                    { icon: Settings, label: "Settings", active: false },
                  ].map((item, i) => (
                    <SidebarItem key={i} {...item} darkMode={darkMode} />
                  ))}
                </div>
              </GlassCard>

              {/* Input Example */}
              <GlassCard darkMode={darkMode}>
                <h4 className={cn("font-semibold mb-6", darkMode ? "text-[#F5F7FA]" : "text-[#0A0E14]")}>
                  Input Fields
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className={cn("text-sm font-medium mb-2 block", darkMode ? "text-[#A0AEC0]" : "text-[#4A5568]")}>
                      Email address
                    </label>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
                        "backdrop-blur-xl",
                        darkMode
                          ? "bg-white/[0.05] border-white/10 focus-within:border-[#5B8DEF]/50 focus-within:bg-white/[0.08]"
                          : "bg-white/50 border-white/60 focus-within:border-[#5B8DEF]/50 focus-within:bg-white/60"
                      )}
                      style={{
                        backdropFilter: "blur(20px) saturate(180%)",
                        WebkitBackdropFilter: "blur(20px) saturate(180%)",
                      }}
                    >
                      <input
                        type="email"
                        placeholder="you@example.com"
                        className={cn(
                          "flex-1 bg-transparent outline-none text-sm",
                          darkMode ? "text-[#F5F7FA] placeholder:text-[#718096]" : "text-[#0A0E14] placeholder:text-[#718096]"
                        )}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={cn("text-sm font-medium mb-2 block", darkMode ? "text-[#A0AEC0]" : "text-[#4A5568]")}>
                      Search
                    </label>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
                        "backdrop-blur-xl",
                        darkMode
                          ? "bg-white/[0.05] border-white/10 focus-within:border-[#5B8DEF]/50 focus-within:bg-white/[0.08]"
                          : "bg-white/50 border-white/60 focus-within:border-[#5B8DEF]/50 focus-within:bg-white/60"
                      )}
                      style={{
                        backdropFilter: "blur(20px) saturate(180%)",
                        WebkitBackdropFilter: "blur(20px) saturate(180%)",
                      }}
                    >
                      <Search className={cn("w-4 h-4", darkMode ? "text-[#718096]" : "text-[#718096]")} />
                      <input
                        type="text"
                        placeholder="Search documents..."
                        className={cn(
                          "flex-1 bg-transparent outline-none text-sm",
                          darkMode ? "text-[#F5F7FA] placeholder:text-[#718096]" : "text-[#0A0E14] placeholder:text-[#718096]"
                        )}
                      />
                      <kbd
                        className={cn(
                          "px-2 py-1 rounded text-xs font-medium",
                          darkMode ? "bg-white/10 text-[#718096]" : "bg-black/5 text-[#4A5568]"
                        )}
                      >
                        ⌘K
                      </kbd>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </section>

          {/* Floating Layers Demo */}
          <section className="space-y-6">
            <h3 className={cn("text-2xl font-semibold", darkMode ? "text-[#F5F7FA]" : "text-[#0A0E14]")}>
              Depth & Layering
            </h3>
            <div className="relative h-[400px] flex items-center justify-center">
              {/* Layer 1 - Background */}
              <motion.div
                animate={{
                  y: [0, -10, 0],
                  rotate: [0, 2, 0],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute w-80 h-64"
                style={{ zIndex: 1 }}
              >
                <GlassCard darkMode={darkMode}>
                  <div className="h-full flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 opacity-40" />
                      <div className="text-xs opacity-50">Background Layer</div>
                    </div>
                    <div className="space-y-2 opacity-50">
                      <div className={cn("h-3 rounded", darkMode ? "bg-white/5" : "bg-black/5")} />
                      <div className={cn("h-3 rounded w-3/4", darkMode ? "bg-white/5" : "bg-black/5")} />
                    </div>
                  </div>
                </GlassCard>
              </motion.div>

              {/* Layer 2 - Middle */}
              <motion.div
                animate={{
                  y: [0, -15, 0],
                  rotate: [0, -1, 0],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute w-80 h-64"
                style={{ zIndex: 2, transform: "translateX(-40px)" }}
              >
                <GlassCard darkMode={darkMode}>
                  <div className="h-full flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 opacity-60" />
                      <div className="text-xs opacity-70">Middle Layer</div>
                    </div>
                    <div className="space-y-2 opacity-70">
                      <div className={cn("h-3 rounded", darkMode ? "bg-white/10" : "bg-black/10")} />
                      <div className={cn("h-3 rounded w-2/3", darkMode ? "bg-white/10" : "bg-black/10")} />
                    </div>
                  </div>
                </GlassCard>
              </motion.div>

              {/* Layer 3 - Front */}
              <motion.div
                animate={{
                  y: [0, -20, 0],
                  rotate: [0, 1, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute w-80 h-64"
                style={{ zIndex: 3, transform: "translateX(40px)" }}
              >
                <GlassCard darkMode={darkMode} hover>
                  <div className="h-full flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#5B8DEF] to-[#4A7AD9]">
                        <div className="w-full h-full flex items-center justify-center">
                          <Sparkles className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div className={cn("text-xs font-medium", darkMode ? "text-[#F5F7FA]" : "text-[#0A0E14]")}>
                        Front Layer
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className={cn("h-3 rounded", darkMode ? "bg-white/20" : "bg-black/20")} />
                      <div className={cn("h-3 rounded w-4/5", darkMode ? "bg-white/20" : "bg-black/20")} />
                      <div className={cn("h-3 rounded w-1/2", darkMode ? "bg-white/20" : "bg-black/20")} />
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            </div>
          </section>

          {/* Comparison */}
          <section className="space-y-6">
            <h3 className={cn("text-2xl font-semibold", darkMode ? "text-[#F5F7FA]" : "text-[#0A0E14]")}>
              Old vs New
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Old */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <X className="w-5 h-5 text-red-500" />
                  <h4 className={cn("font-semibold", darkMode ? "text-[#F5F7FA]" : "text-[#0A0E14]")}>
                    Emerald Fresh (Atual)
                  </h4>
                </div>
                <div className="p-6 rounded-lg bg-gray-100 dark:bg-gray-800 space-y-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="w-4 h-4 rounded bg-emerald-500" />
                    Accent: #10B981
                  </div>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <p>• Flat design, material style</p>
                    <p>• Verde saturado demais</p>
                    <p>• Shadows sutis</p>
                    <p>• Sem profundidade</p>
                    <p>• Sharp corners (4px)</p>
                  </div>
                </div>
              </div>

              {/* New */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-[#5B8DEF]" />
                  <h4 className={cn("font-semibold", darkMode ? "text-[#F5F7FA]" : "text-[#0A0E14]")}>
                    Ethereal Blue (Proposta)
                  </h4>
                </div>
                <GlassCard darkMode={darkMode}>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-4 h-4 rounded bg-[#5B8DEF]" />
                      <span className={darkMode ? "text-[#A0AEC0]" : "text-[#4A5568]"}>Accent: #5B8DEF</span>
                    </div>
                    <div className={cn("space-y-2 text-sm", darkMode ? "text-[#A0AEC0]" : "text-[#4A5568]")}>
                      <p>• Glassmorphism + Liquid Glass</p>
                      <p>• Azul profissional e elegante</p>
                      <p>• Múltiplas camadas de shadow</p>
                      <p>• Translucency com depth</p>
                      <p>• Soft corners (8-16px)</p>
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Command Palette Modal */}
      <AnimatePresence>
        {searchOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSearchOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            />

            {/* Modal */}
            <div className="fixed inset-0 z-[101] flex items-start justify-center pt-[20vh] px-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ type: "spring", duration: 0.3 }}
                className={cn(
                  "w-full max-w-2xl rounded-2xl overflow-hidden",
                  "shadow-2xl shadow-black/20",
                  darkMode
                    ? "bg-[rgba(21,26,35,0.95)] backdrop-blur-2xl border border-white/10"
                    : "bg-[rgba(255,255,255,0.95)] backdrop-blur-2xl border border-black/10"
                )}
              >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
                  <Search className={cn("w-5 h-5", darkMode ? "text-[#A0AEC0]" : "text-[#718096]")} />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search for commands..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      "flex-1 bg-transparent outline-none text-base",
                      darkMode ? "text-[#F5F7FA] placeholder:text-[#718096]" : "text-[#0A0E14] placeholder:text-[#718096]"
                    )}
                  />
                  <kbd
                    className={cn(
                      "px-2 py-1 rounded text-xs font-medium",
                      darkMode ? "bg-white/10 text-[#A0AEC0]" : "bg-black/5 text-[#4A5568]"
                    )}
                  >
                    ESC
                  </kbd>
                </div>

                {/* Commands List */}
                <div className="p-2 max-h-[400px] overflow-y-auto">
                  {demoCommands.map((cmd, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.01 }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors",
                        "group cursor-pointer",
                        darkMode
                          ? "hover:bg-[#5B8DEF]/10 text-[#F5F7FA]"
                          : "hover:bg-[#5B8DEF]/10 text-[#0A0E14]"
                      )}
                    >
                      <cmd.icon className="w-5 h-5 text-[#5B8DEF]" />
                      <span className="flex-1 text-left font-medium">{cmd.label}</span>
                      <kbd
                        className={cn(
                          "px-2 py-1 rounded text-xs font-medium",
                          darkMode ? "bg-white/5 text-[#718096]" : "bg-black/5 text-[#4A5568]"
                        )}
                      >
                        {cmd.shortcut}
                      </kbd>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// Helper Components
function GlassCard({
  children,
  darkMode,
  hover = false,
}: {
  children: React.ReactNode
  darkMode: boolean
  hover?: boolean
}) {
  return (
    <motion.div
      whileHover={hover ? { y: -6, scale: 1.01 } : {}}
      className={cn(
        "p-6 rounded-2xl transition-all duration-300 relative",
        "backdrop-blur-2xl border",
        darkMode
          ? [
              "bg-white/[0.03]",
              "border-white/10",
              "shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
              "shadow-[#5B8DEF]/5",
              hover && "hover:shadow-[0_12px_48px_rgba(91,141,239,0.15)]",
            ]
          : [
              "bg-white/40",
              "border-white/60",
              "shadow-[0_8px_32px_rgba(31,38,135,0.15)]",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
              hover && "hover:shadow-[0_12px_48px_rgba(91,141,239,0.2)]",
            ],
        hover && "cursor-pointer"
      )}
      style={{
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
      }}
    >
      {/* Glass reflection effect */}
      <div
        className={cn(
          "absolute inset-0 rounded-2xl pointer-events-none",
          darkMode
            ? "bg-gradient-to-br from-white/[0.05] to-transparent"
            : "bg-gradient-to-br from-white/60 via-white/30 to-transparent"
        )}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}

function ColorSwatch({ color, label, darkMode }: { color: string; label: string; darkMode: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg border shadow-sm" style={{ backgroundColor: color }} />
      <div>
        <p className={cn("text-sm font-medium", darkMode ? "text-[#F5F7FA]" : "text-[#0A0E14]")}>{label}</p>
        <p className={cn("text-xs font-mono", darkMode ? "text-[#718096]" : "text-[#718096]")}>{color}</p>
      </div>
    </div>
  )
}

function Button({
  children,
  variant,
  darkMode,
}: {
  children: React.ReactNode
  variant: "primary" | "secondary" | "ghost"
  darkMode: boolean
}) {
  const variants = {
    primary: "bg-[#5B8DEF] text-white hover:brightness-110 shadow-lg shadow-[#5B8DEF]/20",
    secondary: cn(
      "border",
      darkMode
        ? "bg-[#5B8DEF]/10 text-[#5B8DEF] border-[#5B8DEF]/20 hover:bg-[#5B8DEF]/15"
        : "bg-[#5B8DEF]/10 text-[#5B8DEF] border-[#5B8DEF]/20 hover:bg-[#5B8DEF]/15"
    ),
    ghost: cn(
      "bg-transparent",
      darkMode ? "text-[#F5F7FA] hover:bg-white/5" : "text-[#0A0E14] hover:bg-black/5"
    ),
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300",
        "flex items-center gap-2",
        variants[variant]
      )}
    >
      {children}
    </motion.button>
  )
}

function SidebarItem({
  icon: Icon,
  label,
  active,
  darkMode,
}: {
  icon: any
  label: string
  active: boolean
  darkMode: boolean
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
        "text-sm font-medium",
        active
          ? "bg-[#5B8DEF] text-white shadow-lg shadow-[#5B8DEF]/20"
          : darkMode
          ? "text-[#A0AEC0] hover:bg-white/5"
          : "text-[#4A5568] hover:bg-black/5"
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
      {active && <ChevronRight className="w-4 h-4 ml-auto" />}
    </motion.button>
  )
}
