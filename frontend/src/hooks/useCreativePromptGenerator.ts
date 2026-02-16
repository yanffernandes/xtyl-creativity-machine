'use client';

/**
 * useCreativePromptGenerator Hook
 * Feature 031: Creative Concepts Migration
 *
 * Uses AI to generate creative image prompts from document content,
 * guided by the selected CreativeConcept from the database.
 */

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import type { CreativeConcept } from '@/types/image-studio';

interface UseCreativePromptGeneratorOptions {
  projectId: string;
  onPromptGenerated?: (prompt: string) => void;
}

interface UseCreativePromptGeneratorReturn {
  generateCreativePrompt: (content: string, concept?: CreativeConcept | null) => Promise<string>;
  isGenerating: boolean;
  error: string | null;
}

const CREATIVE_PROMPT_MODEL = 'google/gemini-2.0-flash-001';

/**
 * Builds a system prompt from a CreativeConcept's data.
 * Uses description, prompt_modifier, and prompt_template_json to guide the AI.
 */
function buildSystemPrompt(concept: CreativeConcept | null | undefined, content: string): string {
  if (!concept) {
    // No concept selected - generic prompt generation
    return `Você é um especialista em criar prompts para IA de geração de imagem (como Flux, Ideogram, DALL-E).

Baseado nesta copy de marketing:

${content}

Gere um PROMPT DE IMAGEM que descreva visualmente uma cena impactante para anúncio digital.
Extraia o benefício principal e a emoção central da copy.
Descreva composição, iluminação, estilo e elementos visuais.

REGRA DE IDIOMA: Se o criativo incluir texto visível (headlines, frases, CTAs, números), esse texto DEVE estar no MESMO IDIOMA da copy acima. A descrição visual ao redor fica em inglês.

FORMATO DO PROMPT: Descreva a CENA VISUAL em inglês, mas qualquer texto que apareça NA IMAGEM deve estar no idioma original da copy.
Máximo 100 palavras. Responda APENAS com o prompt.`;
  }

  // Build concept-guided prompt using all available data
  const conceptName = concept.name_pt || concept.name;
  const conceptDesc = concept.description || '';
  const promptModifier = concept.prompt_modifier || '';

  // Extract composition details from prompt_template_json if available
  let compositionGuide = '';
  if (concept.prompt_template_json) {
    const json = concept.prompt_template_json as Record<string, unknown>;
    if (json.composition) {
      const comp = json.composition as Record<string, unknown>;
      compositionGuide = `
Composição:
- Layout: ${comp.layout || 'livre'}
- Estilo: ${comp.style || 'profissional'}
- Elemento principal: ${comp.main_element || 'a critério'}`;
    }
    if (json.requirements && Array.isArray(json.requirements)) {
      compositionGuide += `
Requisitos visuais: ${(json.requirements as string[]).join(', ')}`;
    }
    if (json.visual_description) {
      compositionGuide += `
Referência visual: ${json.visual_description}`;
    }
  }

  return `Você é um especialista em criar prompts para IA de geração de imagem (como Flux, Ideogram, DALL-E).

CONCEITO CRIATIVO: "${conceptName}"
${conceptDesc}
${compositionGuide}

REFERÊNCIA DE PROMPT DO CONCEITO:
${promptModifier}

Baseado nesta copy de marketing:

${content}

Sua tarefa: Gere um PROMPT DE IMAGEM que combine o conceito criativo "${conceptName}" com o conteúdo da copy acima.
- Use o conceito como guia de composição e estilo visual
- Extraia headlines, benefícios ou dados relevantes da copy para incorporar na imagem
- Mantenha fidelidade ao estilo visual do conceito
- Adapte o prompt_modifier de referência ao conteúdo específico da copy

REGRA DE IDIOMA: Se o criativo incluir texto visível (headlines, frases, CTAs, números), esse texto DEVE estar no MESMO IDIOMA da copy acima. A descrição visual ao redor fica em inglês.

FORMATO DO PROMPT: Descreva a CENA VISUAL em inglês, mas qualquer texto que apareça NA IMAGEM deve estar no idioma original da copy.
Máximo 120 palavras. Responda APENAS com o prompt.`;
}

export function useCreativePromptGenerator({
  projectId,
  onPromptGenerated,
}: UseCreativePromptGeneratorOptions): UseCreativePromptGeneratorReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateCreativePrompt = useCallback(
    async (content: string, concept?: CreativeConcept | null): Promise<string> => {
      if (!content.trim()) {
        setError('Conteúdo vazio');
        return '';
      }

      setIsGenerating(true);
      setError(null);

      try {
        const systemPrompt = buildSystemPrompt(concept, content);

        const response = await api.post('/chat/completion', {
          project_id: projectId,
          model: CREATIVE_PROMPT_MODEL,
          messages: [
            {
              role: 'user',
              content: systemPrompt,
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
  };
}

export default useCreativePromptGenerator;
