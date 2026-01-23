'use client';

/**
 * useCreativePromptGenerator Hook
 * Feature 027: Visual Generation Studio
 *
 * Uses AI to generate creative image prompts from document content.
 */

import { useState, useCallback } from 'react';
import api from '@/lib/api';

interface UseCreativePromptGeneratorOptions {
  projectId: string;
  onPromptGenerated?: (prompt: string) => void;
}

interface UseCreativePromptGeneratorReturn {
  generateCreativePrompt: (content: string, styleId?: string) => Promise<string>;
  isGenerating: boolean;
  error: string | null;
  promptStyles: PromptStyle[];
}

const CREATIVE_PROMPT_MODEL = 'google/gemini-2.0-flash-001';

// Estilos de prompt disponíveis
export interface PromptStyle {
  id: string;
  name: string;
  expert: string;
  description: string;
  systemPrompt: string;
}

export const PROMPT_STYLES: PromptStyle[] = [
  {
    id: 'direct-response',
    name: 'Direct Response',
    expert: 'David Ogilvy',
    description: 'CTA claro com texto em destaque',
    systemPrompt: `Você é um especialista em criar prompts para IA de geração de imagem (como Flux, Ideogram, DALL-E).

Baseado nesta copy de marketing:

{CONTENT}

Gere um PROMPT DE IMAGEM que descreva visualmente:
- Uma pessoa confiante olhando diretamente para a câmera, expressão acolhedora
- Fundo desfocado ou gradiente suave
- Iluminação profissional, estilo fotografia de estúdio
- IMPORTANTE: Inclua o HEADLINE principal da copy como TEXTO RENDERIZADO na imagem (tipografia bold, moderna)
- Paleta de cores que transmita confiança (azuis, brancos, tons neutros)

FORMATO DO PROMPT: Descreva a CENA VISUAL em inglês.
OBRIGATÓRIO: Especifique o texto exato que deve aparecer na imagem entre aspas.
Exemplo: "Bold white text saying 'YOUR HEADLINE HERE' at the top"

Máximo 100 palavras. Responda APENAS com o prompt em inglês.`
  },
  {
    id: 'bold-statement',
    name: 'Bold Statement',
    expert: 'Neil Patel',
    description: 'Fundo minimalista com texto grande',
    systemPrompt: `Você é um especialista em criar prompts para IA de geração de imagem (como Flux, Ideogram, DALL-E).

Baseado nesta copy de marketing:

{CONTENT}

Gere um PROMPT DE IMAGEM que descreva visualmente:
- Fundo abstrato minimalista (gradiente suave, formas geométricas sutis)
- Cores vibrantes e contrastantes
- SEM pessoas - apenas elementos gráficos abstratos
- IMPORTANTE: O HEADLINE principal deve ser RENDERIZADO como TEXTO GRANDE e BOLD no centro da imagem
- Estilo moderno, clean, digital

FORMATO DO PROMPT: Descreva a composição em inglês.
OBRIGATÓRIO: Especifique o texto exato entre aspas que deve aparecer grande no centro.
Exemplo: "Large bold text 'YOUR STATEMENT' centered on gradient background"

Máximo 80 palavras. Responda APENAS com o prompt em inglês.`
  },
  {
    id: 'before-after',
    name: 'Antes x Depois',
    expert: 'Russell Brunson',
    description: 'Transformação visual lado a lado',
    systemPrompt: `Você é um especialista em criar prompts para IA de geração de imagem (como Flux, Ideogram, DALL-E).

Baseado nesta copy de marketing:

{CONTENT}

Gere um PROMPT DE IMAGEM que descreva visualmente:
- Composição split-screen ou díptico (dois lados)
- Lado esquerdo: cenário representando o problema/antes (cores frias, expressão frustrada ou cansada)
- Lado direito: cenário representando a solução/depois (cores quentes, expressão satisfeita e confiante)
- Mesma pessoa ou contexto em ambos os lados para mostrar transformação
- IMPORTANTE: RENDERIZE os textos "BEFORE" (lado esquerdo) e "AFTER" (lado direito) em tipografia bold
- Linha divisória sutil ou gradiente de transição entre os lados

FORMATO DO PROMPT: Descreva a CENA VISUAL COMPARATIVA em inglês.
OBRIGATÓRIO: Inclua instruções para renderizar os textos "BEFORE" e "AFTER" nos respectivos lados.
Exemplo: "Bold text 'BEFORE' on left side, 'AFTER' on right side"

Máximo 90 palavras. Responda APENAS com o prompt em inglês.`
  },
  {
    id: 'ugc-native',
    name: 'UGC Nativo',
    expert: 'Gary Vaynerchuk',
    description: 'Estilo selfie autêntico',
    systemPrompt: `Você é um especialista em criar prompts para IA de geração de imagem (como Flux, DALL-E, Midjourney).

Baseado nesta copy de marketing:

{CONTENT}

Gere um PROMPT DE IMAGEM que descreva visualmente:
- Foto estilo selfie ou "tirada por amigo" com smartphone
- Pessoa real em ambiente cotidiano (casa, café, escritório, rua)
- Iluminação natural, levemente imperfeita
- Expressão genuína e espontânea (sorriso natural, surpresa, empolgação)
- Ângulo levemente de baixo para cima ou selfie arm
- Qualidade de câmera de celular, não de estúdio profissional

FORMATO DO PROMPT: Descreva a FOTO CASUAL em inglês.
Inclua: tipo de pessoa, expressão, ambiente, iluminação, ângulo, estilo smartphone.

Máximo 70 palavras. Responda APENAS com o prompt em inglês.`
  },
  {
    id: 'pattern-interrupt',
    name: 'Pattern Interrupt',
    expert: 'Rory Sutherland',
    description: 'Visual surreal que para o scroll',
    systemPrompt: `Você é um especialista em criar prompts para IA de geração de imagem (como Flux, Ideogram, DALL-E).

Baseado nesta copy de marketing:

{CONTENT}

Gere um PROMPT DE IMAGEM que descreva visualmente:
- Cena SURREAL ou INESPERADA que quebre padrões visuais
- Justaposição estranha de elementos (escala exagerada, contexto inusitado)
- Algo que faça o viewer parar e pensar "o que é isso?"
- Conexão metafórica com o benefício/problema da copy
- Cores vibrantes ou contraste dramático
- IMPORTANTE: RENDERIZE uma frase intrigante ou pergunta provocativa da copy como texto bold na imagem
- Estilo que misture realismo com elemento absurdo

FORMATO DO PROMPT: Descreva a CENA SURREAL em inglês.
OBRIGATÓRIO: Inclua uma frase ou pergunta provocativa para renderizar na imagem.
Exemplo: "Bold dramatic text 'WHAT IF...' floating in the surreal scene"

Máximo 90 palavras. Responda APENAS com o prompt em inglês.`
  },
  {
    id: 'testimonial',
    name: 'Depoimento',
    expert: 'Alex Hormozi',
    description: 'Retrato para quote de cliente',
    systemPrompt: `Você é um especialista em criar prompts para IA de geração de imagem (como Flux, Ideogram, DALL-E).

Baseado nesta copy de marketing:

{CONTENT}

Gere um PROMPT DE IMAGEM que descreva visualmente:
- Retrato de pessoa com expressão satisfeita, confiante, realizada
- Enquadramento do busto para cima (headshot ou portrait)
- Fundo neutro ou levemente desfocado (bokeh)
- Iluminação suave e favorecedora, estilo retrato profissional
- Pessoa que represente o público-alvo do produto/serviço
- IMPORTANTE: RENDERIZE uma frase curta de depoimento (quote) extraída da copy ao lado ou abaixo da pessoa, com aspas estilizadas

FORMATO DO PROMPT: Descreva o RETRATO em inglês.
OBRIGATÓRIO: Inclua o texto do depoimento entre aspas para ser renderizado na imagem.
Exemplo: "Elegant quote text saying 'This changed my life!' next to the portrait"

Máximo 80 palavras. Responda APENAS com o prompt em inglês.`
  },
  {
    id: 'listicle',
    name: 'Lista / Infográfico',
    expert: 'Frank Kern',
    description: 'Infográfico com lista de benefícios',
    systemPrompt: `Você é um especialista em criar prompts para IA de geração de imagem (como Flux, Ideogram, DALL-E).

Baseado nesta copy de marketing:

{CONTENT}

Gere um PROMPT DE IMAGEM que descreva visualmente:
- Infográfico moderno e clean com lista de 3-5 benefícios/pontos principais
- Gradiente suave ou cor sólida como fundo
- Elementos gráficos decorativos (formas geométricas, ícones minimalistas)
- Paleta de cores profissional (2-3 cores harmônicas)
- IMPORTANTE: RENDERIZE os bullet points/benefícios da copy como texto na imagem, com ícones ou checkmarks
- Título destacado no topo
- Estilo moderno, corporativo mas acessível

FORMATO DO PROMPT: Descreva o INFOGRÁFICO em inglês.
OBRIGATÓRIO: Extraia 3-5 benefícios da copy e especifique o texto exato a renderizar.
Exemplo: "Infographic with title 'Why Choose Us' and bullet points: '✓ Fast Results', '✓ Expert Support', '✓ 100% Guarantee'"

Máximo 90 palavras. Responda APENAS com o prompt em inglês.`
  },
  {
    id: 'meme-format',
    name: 'Formato Meme',
    expert: 'Sabri Suby',
    description: 'Expressão exagerada estilo meme',
    systemPrompt: `Você é um especialista em criar prompts para IA de geração de imagem (como Flux, Ideogram, DALL-E).

Baseado nesta copy de marketing:

{CONTENT}

Gere um PROMPT DE IMAGEM que descreva visualmente:
- Pessoa com EXPRESSÃO FACIAL EXAGERADA (surpresa extrema, confusão cômica, realização súbita, desespero cômico)
- Enquadramento close-up no rosto para enfatizar a expressão
- Fundo simples que não distraia da expressão
- Estilo que remeta a memes de internet (reaction image)
- Iluminação que destaque a expressão dramática
- IMPORTANTE: RENDERIZE texto estilo meme no TOPO e BASE da imagem (Impact font ou bold branco com outline preto)

FORMATO DO PROMPT: Descreva a EXPRESSÃO/REAÇÃO em inglês.
OBRIGATÓRIO: Crie texto de meme baseado na copy - frase de setup no topo e punchline na base.
Exemplo: "Bold Impact font text 'WHEN THEY SAY...' at top, 'BUT YOU ALREADY KNOW' at bottom"

Máximo 80 palavras. Responda APENAS com o prompt em inglês.`
  }
];

// Prompt base (fallback)
const DEFAULT_PROMPT_STYLE = PROMPT_STYLES[0];

export function useCreativePromptGenerator({
  projectId,
  onPromptGenerated,
}: UseCreativePromptGeneratorOptions): UseCreativePromptGeneratorReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateCreativePrompt = useCallback(
    async (content: string, styleId?: string): Promise<string> => {
      if (!content.trim()) {
        setError('Conteúdo vazio');
        return '';
      }

      // Encontra o estilo selecionado ou usa o padrão
      const selectedStyle = styleId
        ? PROMPT_STYLES.find((s) => s.id === styleId) || DEFAULT_PROMPT_STYLE
        : DEFAULT_PROMPT_STYLE;

      setIsGenerating(true);
      setError(null);

      try {
        const response = await api.post('/chat/completion', {
          project_id: projectId,
          model: CREATIVE_PROMPT_MODEL,
          messages: [
            {
              role: 'user',
              content: selectedStyle.systemPrompt.replace('{CONTENT}', content),
            },
          ],
          stream: false,
        });

        const generatedPrompt =
          response.data?.choices?.[0]?.message?.content ||
          response.data?.content ||
          '';

        if (generatedPrompt && onPromptGenerated) {
          onPromptGenerated(generatedPrompt);
        }

        return generatedPrompt;
      } catch (err) {
        console.error('Failed to generate creative prompt:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Erro ao gerar prompt criativo';
        setError(errorMessage);
        return '';
      } finally {
        setIsGenerating(false);
      }
    },
    [projectId, onPromptGenerated]
  );

  return {
    generateCreativePrompt,
    isGenerating,
    error,
    promptStyles: PROMPT_STYLES,
  };
}

export default useCreativePromptGenerator;
