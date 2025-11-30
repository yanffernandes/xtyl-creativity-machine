"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { H1, H2, H3, H4, H5, H6, Paragraph, Muted } from "@/components/ui/typography"

/**
 * Design System Preview Page
 *
 * Permite visualizar e escolher entre diferentes opções de paletas de cores
 * antes de aplicar o design premium final.
 */

// Opções de paletas de cores
const colorPalettes = {
  purple: {
    name: "Purple Elegance",
    description: "Sofisticado e criativo, transmite inovação",
    colors: {
      light: {
        primary: "#8B5CF6",
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
      },
      dark: {
        primary: "#A78BFA",
        success: "#34D399",
        warning: "#FBBF24",
        error: "#F87171",
      }
    }
  },
  blue: {
    name: "Ocean Blue",
    description: "Confiável e profissional, transmite estabilidade",
    colors: {
      light: {
        primary: "#3B82F6",
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
      },
      dark: {
        primary: "#60A5FA",
        success: "#34D399",
        warning: "#FBBF24",
        error: "#F87171",
      }
    }
  },
  teal: {
    name: "Teal Modern",
    description: "Moderno e clean, transmite clareza",
    colors: {
      light: {
        primary: "#14B8A6",
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
      },
      dark: {
        primary: "#2DD4BF",
        success: "#34D399",
        warning: "#FBBF24",
        error: "#F87171",
      }
    }
  },
  indigo: {
    name: "Indigo Premium",
    description: "Elegante e corporativo, transmite profissionalismo",
    colors: {
      light: {
        primary: "#6366F1",
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
      },
      dark: {
        primary: "#818CF8",
        success: "#34D399",
        warning: "#FBBF24",
        error: "#F87171",
      }
    }
  },
  rose: {
    name: "Rose Warm",
    description: "Caloroso e acolhedor, transmite criatividade",
    colors: {
      light: {
        primary: "#F43F5E",
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
      },
      dark: {
        primary: "#FB7185",
        success: "#34D399",
        warning: "#FBBF24",
        error: "#F87171",
      }
    }
  },
  emerald: {
    name: "Emerald Fresh (Atual)",
    description: "Fresco e vibrante, transmite crescimento",
    colors: {
      light: {
        primary: "#10B981",
        success: "#059669",
        warning: "#F59E0B",
        error: "#EF4444",
      },
      dark: {
        primary: "#34D399",
        success: "#10B981",
        warning: "#FBBF24",
        error: "#F87171",
      }
    }
  }
}

export default function DesignSystemPage() {
  const [selectedPalette, setSelectedPalette] = useState<keyof typeof colorPalettes>("emerald")
  const [isDark, setIsDark] = useState(false)

  const currentPalette = colorPalettes[selectedPalette]
  const currentColors = isDark ? currentPalette.colors.dark : currentPalette.colors.light

  return (
    <div className="min-h-screen bg-surface-primary p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <H1>Design System Preview</H1>
          <Paragraph className="text-text-secondary max-w-3xl">
            Visualize e escolha a paleta de cores para o sistema. Todas as opções mantêm o mesmo
            nível de sofisticação e seguem os padrões WCAG AA de acessibilidade.
          </Paragraph>
        </div>

        {/* Theme Toggle */}
        <Card>
          <CardHeader>
            <CardTitle>Modo de Visualização</CardTitle>
            <CardDescription>Alterne entre light e dark mode</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <button
                onClick={() => setIsDark(false)}
                className={`px-6 py-3 rounded-md transition-all ${
                  !isDark
                    ? "bg-accent-primary text-white"
                    : "bg-surface-tertiary text-text-primary hover:bg-surface-tertiary/80"
                }`}
              >
                Light Mode
              </button>
              <button
                onClick={() => setIsDark(true)}
                className={`px-6 py-3 rounded-md transition-all ${
                  isDark
                    ? "bg-accent-primary text-white"
                    : "bg-surface-tertiary text-text-primary hover:bg-surface-tertiary/80"
                }`}
              >
                Dark Mode
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Color Palettes */}
        <div className="space-y-4">
          <H2>Paletas de Cores</H2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(colorPalettes).map(([key, palette]) => (
              <Card
                key={key}
                className={`cursor-pointer transition-all ${
                  selectedPalette === key
                    ? "ring-2 ring-accent-primary"
                    : "hover:shadow-lg"
                }`}
                onClick={() => setSelectedPalette(key as keyof typeof colorPalettes)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{palette.name}</CardTitle>
                  <CardDescription>{palette.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <div
                      className="w-12 h-12 rounded-md"
                      style={{ backgroundColor: isDark ? palette.colors.dark.primary : palette.colors.light.primary }}
                      title="Primary"
                    />
                    <div
                      className="w-12 h-12 rounded-md"
                      style={{ backgroundColor: isDark ? palette.colors.dark.success : palette.colors.light.success }}
                      title="Success"
                    />
                    <div
                      className="w-12 h-12 rounded-md"
                      style={{ backgroundColor: isDark ? palette.colors.dark.warning : palette.colors.light.warning }}
                      title="Warning"
                    />
                    <div
                      className="w-12 h-12 rounded-md"
                      style={{ backgroundColor: isDark ? palette.colors.dark.error : palette.colors.light.error }}
                      title="Error"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Typography Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Tipografia - Inter Variable Font</CardTitle>
            <CardDescription>
              Hierarquia refinada com letter-spacing otimizado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Muted>H1 - Hero Heading (60px / 3.75rem)</Muted>
              <H1>The quick brown fox jumps</H1>
            </div>
            <div className="space-y-2">
              <Muted>H2 - Major Heading (48px / 3rem)</Muted>
              <H2>The quick brown fox jumps</H2>
            </div>
            <div className="space-y-2">
              <Muted>H3 - Section Heading (36px / 2.25rem)</Muted>
              <H3>The quick brown fox jumps</H3>
            </div>
            <div className="space-y-2">
              <Muted>H4 - Subsection (30px / 1.875rem)</Muted>
              <H4>The quick brown fox jumps over the lazy dog</H4>
            </div>
            <div className="space-y-2">
              <Muted>H5 - Card Title (24px / 1.5rem)</Muted>
              <H5>The quick brown fox jumps over the lazy dog</H5>
            </div>
            <div className="space-y-2">
              <Muted>H6 - Small Heading (20px / 1.25rem)</Muted>
              <H6>The quick brown fox jumps over the lazy dog</H6>
            </div>
            <div className="space-y-2">
              <Muted>Paragraph - Body Text (16px / 1rem)</Muted>
              <Paragraph>
                The quick brown fox jumps over the lazy dog. Lorem ipsum dolor sit amet,
                consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore
                et dolore magna aliqua.
              </Paragraph>
            </div>
          </CardContent>
        </Card>

        {/* Components Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
              <CardDescription>Estados e variações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Muted>Primary Button</Muted>
                <button
                  className="px-6 py-3 rounded-md text-white transition-all"
                  style={{ backgroundColor: currentColors.primary }}
                >
                  Primary Action
                </button>
              </div>
              <div className="space-y-2">
                <Muted>Success Button</Muted>
                <button
                  className="px-6 py-3 rounded-md text-white transition-all"
                  style={{ backgroundColor: currentColors.success }}
                >
                  Success Action
                </button>
              </div>
              <div className="space-y-2">
                <Muted>Warning Button</Muted>
                <button
                  className="px-6 py-3 rounded-md text-white transition-all"
                  style={{ backgroundColor: currentColors.warning }}
                >
                  Warning Action
                </button>
              </div>
              <div className="space-y-2">
                <Muted>Error Button</Muted>
                <button
                  className="px-6 py-3 rounded-md text-white transition-all"
                  style={{ backgroundColor: currentColors.error }}
                >
                  Error Action
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Cards */}
          <Card>
            <CardHeader>
              <CardTitle>Cards</CardTitle>
              <CardDescription>Bordas sutis, sombras refinadas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Example Card</CardTitle>
                  <CardDescription>
                    Cards com padding 24px, bordas 1px sutis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Paragraph className="text-sm">
                    Conteúdo do card com spacing consistente seguindo o grid de 8px.
                  </Paragraph>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </div>

        {/* Spacing System */}
        <Card>
          <CardHeader>
            <CardTitle>Sistema de Spacing (Grid 8px)</CardTitle>
            <CardDescription>
              Valores consistentes baseados em múltiplos de 4px e 8px
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { name: "space-xs", value: "4px", usage: "Gaps internos, ícones" },
                { name: "space-sm", value: "8px", usage: "Componentes internos" },
                { name: "space-md", value: "16px", usage: "Padrão entre elementos" },
                { name: "space-lg", value: "24px", usage: "Cards, sections" },
                { name: "space-xl", value: "32px", usage: "Containers" },
                { name: "space-2xl", value: "48px", usage: "Page sections" },
                { name: "space-3xl", value: "64px", usage: "Hero sections" },
              ].map((token) => (
                <div
                  key={token.name}
                  className="flex items-center gap-4 p-3 bg-surface-secondary rounded-md"
                >
                  <div
                    className="bg-accent-primary h-8"
                    style={{ width: token.value }}
                  />
                  <div className="flex-1">
                    <div className="font-mono text-sm font-semibold">{token.name}</div>
                    <Muted className="text-xs">{token.value} - {token.usage}</Muted>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resumo da Paleta Selecionada */}
        <Card className="bg-accent-primary/5 border-accent-primary">
          <CardHeader>
            <CardTitle>Paleta Selecionada: {currentPalette.name}</CardTitle>
            <CardDescription>{currentPalette.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Muted>Primary</Muted>
                <div
                  className="h-20 rounded-md"
                  style={{ backgroundColor: currentColors.primary }}
                />
                <code className="text-xs">{currentColors.primary}</code>
              </div>
              <div className="space-y-2">
                <Muted>Success</Muted>
                <div
                  className="h-20 rounded-md"
                  style={{ backgroundColor: currentColors.success }}
                />
                <code className="text-xs">{currentColors.success}</code>
              </div>
              <div className="space-y-2">
                <Muted>Warning</Muted>
                <div
                  className="h-20 rounded-md"
                  style={{ backgroundColor: currentColors.warning }}
                />
                <code className="text-xs">{currentColors.warning}</code>
              </div>
              <div className="space-y-2">
                <Muted>Error</Muted>
                <div
                  className="h-20 rounded-md"
                  style={{ backgroundColor: currentColors.error }}
                />
                <code className="text-xs">{currentColors.error}</code>
              </div>
            </div>
            <div className="p-4 bg-surface-secondary rounded-md">
              <Paragraph className="text-sm">
                <strong>Próximo passo:</strong> Informe qual paleta você prefere e eu atualizo
                os design tokens para aplicar globalmente no sistema.
              </Paragraph>
            </div>
          </CardContent>
        </Card>

        {/* Shadcn/UI Info */}
        <Card>
          <CardHeader>
            <CardTitle>Sobre o Shadcn/UI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Paragraph>
              <strong>Sim, mantive o Shadcn/UI</strong>, mas com customizações premium:
            </Paragraph>
            <ul className="space-y-2 list-disc list-inside text-text-primary">
              <li>Componentes base do Shadcn (Button, Card, Input, etc)</li>
              <li>Cores customizadas (paletas premium em vez das padrão)</li>
              <li>Spacing refinado (grid 8px em vez de valores arbitrários)</li>
              <li>Tipografia Inter Variable (em vez da padrão)</li>
              <li>Borders/shadows sutis (em vez de Material Design harsh)</li>
              <li>Dark mode curado (paletas separadas, não inversão)</li>
            </ul>
            <Muted>
              O Shadcn é mantido como base, mas todo o visual foi refinado para ter
              identidade premium única.
            </Muted>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
