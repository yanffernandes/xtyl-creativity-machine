import { useState, useCallback } from 'react';
import api from '@/lib/api';
import type { CreativeConcept } from '@/types/image-studio';

interface UseCreativePromptGeneratorOptions {
  projectId: string;
  onPromptGenerated?: (prompt: string) => void;
}

const CREATIVE_PROMPT_MODEL = 'google/gemini-2.0-flash-001';

function buildSystemPrompt(
  concept: CreativeConcept | null | undefined,
  content: string,
): string {
  if (!concept) {
    return `Você é um especialista em criar prompts para IA de geração de imagem.\n\nBaseado nesta copy de marketing:\n\n${content}\n\nGere um PROMPT DE IMAGEM que descreva visualmente uma cena impactante para anúncio digital.\nREGRA DE IDIOMA: Se o criativo incluir texto visível, esse texto DEVE estar no MESMO IDIOMA da copy.\nFORMATO DO PROMPT: Descreva a CENA VISUAL em inglês, mas qualquer texto que apareça NA IMAGEM deve estar no idioma original.\nMáximo 100 palavras. Responda APENAS com o prompt.`;
  }

  const conceptName = concept.name_pt || concept.name;
  const conceptDesc = concept.description || '';
  const promptModifier = concept.prompt_modifier || '';

  let compositionGuide = '';
  if (concept.prompt_template_json) {
    const json = concept.prompt_template_json as Record<string, unknown>;

    if (json.composition) {
      const comp = json.composition as Record<string, unknown>;
      compositionGuide = `\nComposição:\n- Layout: ${comp.layout || 'livre'}\n- Estilo: ${comp.style || 'profissional'}\n- Elemento principal: ${comp.main_element || 'a critério'}`;
    }

    if (json.requirements && Array.isArray(json.requirements)) {
      compositionGuide += `\nRequisitos visuais: ${(json.requirements as string[]).join(', ')}`;
    }

    if (json.visual_description) {
      compositionGuide += `\nReferência visual: ${json.visual_description}`;
    }
  }

  return `Você é um especialista em criar prompts para IA de geração de imagem.\n\nCONCEITO CRIATIVO: "${conceptName}"\n${conceptDesc}\n${compositionGuide}\n\nREFERÊNCIA DE PROMPT DO CONCEITO:\n${promptModifier}\n\nBaseado nesta copy de marketing:\n\n${content}\n\nSua tarefa: Gere um PROMPT DE IMAGEM que combine o conceito criativo "${conceptName}" com o conteúdo da copy.\nMáximo 120 palavras. Responda APENAS com o prompt.`;
}

export function useCreativePromptGenerator({
  projectId,
  onPromptGenerated,
}: UseCreativePromptGeneratorOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateCreativePrompt = useCallback(
    async (
      content: string,
      concept?: CreativeConcept | null,
    ): Promise<string> => {
      if (!content.trim()) {
        setError('Conteúdo vazio');
        return '';
      }

      setIsGenerating(true);
      setError(null);

      try {
        const systemPrompt = buildSystemPrompt(concept, content);

        const response = await api.post('/api/chat/completion', {
          project_id: projectId,
          model: CREATIVE_PROMPT_MODEL,
          messages: [{ role: 'user', content: systemPrompt }],
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
        const errorMessage =
          err instanceof Error ? err.message : 'Erro ao gerar prompt criativo';
        setError(errorMessage);
        return '';
      } finally {
        setIsGenerating(false);
      }
    },
    [projectId, onPromptGenerated],
  );

  return { generateCreativePrompt, isGenerating, error };
}

export default useCreativePromptGenerator;
