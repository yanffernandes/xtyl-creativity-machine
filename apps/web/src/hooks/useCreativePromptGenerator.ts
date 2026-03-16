
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
  model?: string | null;
  onPromptGenerated?: (prompt: string) => void;
}

interface UseCreativePromptGeneratorReturn {
  generateCreativePrompt: (content: string, concept?: CreativeConcept | null) => Promise<string>;
  isGenerating: boolean;
  error: string | null;
}

/**
 * Builds a system prompt from a CreativeConcept's data.
 * Uses description, prompt_modifier, and prompt_template_json to guide the AI.
 */
function buildSystemPrompt(concept: CreativeConcept | null | undefined, content: string): string {
  if (!concept) {
    // No concept selected - generic prompt generation
    return `Você é um especialista sênior em prompt engineering para IA de geração de imagem (Flux, Ideogram, DALL-E, Stable Diffusion).

Baseado nesta copy de marketing:

${content}

Gere um PROMPT DE IMAGEM profissional e altamente detalhado. O prompt deve cobrir OBRIGATORIAMENTE estas 6 seções:

1. SUBJECT & ACTION: O elemento principal e o que está acontecendo na cena
2. COMPOSITION & FRAMING: Tipo de plano (close-up, wide shot, overhead, eye-level), regra dos terços, espaço negativo
3. LIGHTING: Tipo (natural/studio/dramatic/cinematic), direção (front/side/back), temperatura de cor (warm/cool/neutral)
4. ATMOSPHERE & MOOD: Tom emocional, hora do dia, sensação geral
5. VISUAL STYLE: Photography vs illustration, film grain, color palette, color grading, texture, material
6. TYPOGRAPHY (se houver texto na imagem): Font weight (bold/regular), size emphasis (headlines mín 48pt equiv.), contrast with background

GLOBAL VISUAL QUALITY RULES (MUST FOLLOW):
- All text in image must be large enough to read on mobile at 350px display width
- Headlines minimum 48pt equivalent, body text minimum 28pt equivalent
- Strong contrast between text and background (minimum 4.5:1 ratio)
- One dominant visual element — clear foreground/midground/background separation
- Maximum 3 focal elements; use negative space purposefully
- Single consistent aesthetic — no mixing photography with flat design
- AVOID in the final image: blurry edges, watermarks, text artifacts, oversaturation, unrealistic proportions

STRICT RESTRICTIONS — NEVER include these in the output:
- Brand logos, wordmarks, or brand marks of any kind — they are provided as separate reference images and must NOT be described or placed via text instructions
- Target audience demographics, professions, age groups, or personas — completely irrelevant to image generation
- Marketing objectives, business context, platform specs, or product descriptions
- Instructions like "designed for X" or "as a marketing asset for Y" — pure visual description only

LANGUAGE RULE: Write the visual scene description in English. Any text that appears INSIDE the image (headlines, CTAs, phrases, numbers) MUST be in the SAME LANGUAGE as the copy above.

FORMAT: 250 to 350 words. Reply ONLY with the prompt, no introduction or explanation.`;
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

  return `Você é um especialista sênior em prompt engineering para IA de geração de imagem (Flux, Ideogram, DALL-E, Stable Diffusion).

CREATIVE CONCEPT: "${conceptName}"
${conceptDesc}
${compositionGuide}

CONCEPT STYLE REFERENCE:
${promptModifier}

Baseado nesta copy de marketing:

${content}

Gere um PROMPT DE IMAGEM profissional que combine o conceito "${conceptName}" com a copy acima. O prompt deve cobrir OBRIGATORIAMENTE estas 6 seções:

1. SUBJECT & ACTION: Elemento principal alinhado ao conceito criativo e à copy
2. COMPOSITION & FRAMING: Layout e enquadramento específicos do conceito
3. LIGHTING: Iluminação que reforce o mood do conceito e da copy
4. ATMOSPHERE & MOOD: Tom emocional extraído da copy e do conceito
5. VISUAL STYLE: Estilo fiel ao conceito, paleta de cores, textura, acabamento
6. TYPOGRAPHY (se houver): Peso, tamanho (headlines mín 48pt equiv.) e contraste

GLOBAL VISUAL QUALITY RULES (MUST FOLLOW):
- All text in image must be large enough to read on mobile at 350px display width
- Headlines minimum 48pt equivalent, body text minimum 28pt equivalent
- Strong contrast between text and background (minimum 4.5:1 ratio)
- One dominant visual element — clear foreground/midground/background separation
- Maximum 3 focal elements; use negative space purposefully
- Single consistent aesthetic — no mixing photography with flat design
- AVOID in the final image: blurry edges, watermarks, text artifacts, oversaturation, unrealistic proportions

STRICT RESTRICTIONS — NEVER include these in the output:
- Brand logos, wordmarks, or brand marks of any kind — they are provided as separate reference images and must NOT be described or placed via text instructions
- Target audience demographics, professions, age groups, or personas — completely irrelevant to image generation
- Marketing objectives, business context, platform specs, or product descriptions
- Instructions like "designed for X" or "as a marketing asset for Y" — pure visual description only

LANGUAGE RULE: Write the visual scene description in English. Any text INSIDE the image MUST be in the SAME LANGUAGE as the copy above.

FORMAT: 250 to 350 words. Reply ONLY with the prompt, no introduction or explanation.`;
}

export function useCreativePromptGenerator({
  projectId,
  model,
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

      if (!model) {
        setError('Modelo de enriquecimento de prompt não configurado. Configure em Admin → Modelos → Prompt enrichment.');
        return '';
      }

      setIsGenerating(true);
      setError(null);

      try {
        const systemPrompt = buildSystemPrompt(concept, content);

        const response = await api.post('/chat/completion', {
          project_id: projectId,
          model,
          messages: [
            {
              role: 'user',
              content: systemPrompt,
            },
          ],
          stream: false,
          temperature: 0.3,
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
    [projectId, model, onPromptGenerated]
  );

  return {
    generateCreativePrompt,
    isGenerating,
    error,
  };
}

export default useCreativePromptGenerator;
