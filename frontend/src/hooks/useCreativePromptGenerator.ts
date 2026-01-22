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
  generateCreativePrompt: (content: string) => Promise<string>;
  isGenerating: boolean;
  error: string | null;
}

const CREATIVE_PROMPT_MODEL = 'google/gemini-2.0-flash-001';

const SYSTEM_PROMPT = `Você é um especialista em criação de prompts para geração de imagens com IA.

Baseado no seguinte conteúdo/objetivo do criativo:

{CONTENT}

Crie um prompt detalhado e otimizado para geração de imagem. O prompt deve:
1. Descrever a cena, composição e elementos visuais principais
2. Especificar estilo visual, iluminação e atmosfera
3. Incluir detalhes técnicos relevantes (câmera, ângulo, profundidade de campo)
4. Ser conciso mas completo (máximo 300 palavras)
5. Ser em inglês para melhor compatibilidade com modelos de IA

Responda APENAS com o prompt, sem explicações adicionais.`;

export function useCreativePromptGenerator({
  projectId,
  onPromptGenerated,
}: UseCreativePromptGeneratorOptions): UseCreativePromptGeneratorReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateCreativePrompt = useCallback(
    async (content: string): Promise<string> => {
      if (!content.trim()) {
        setError('Conteúdo vazio');
        return '';
      }

      setIsGenerating(true);
      setError(null);

      try {
        const response = await api.post('/chat/completion', {
          project_id: projectId,
          model: CREATIVE_PROMPT_MODEL,
          messages: [
            {
              role: 'user',
              content: SYSTEM_PROMPT.replace('{CONTENT}', content),
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
