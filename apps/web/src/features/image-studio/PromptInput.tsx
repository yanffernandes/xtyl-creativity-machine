import { useRef, useEffect, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { Wand2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

const PROMPT_SUGGESTIONS = [
  'Uma paisagem futurista com neon',
  'Retrato artístico em aquarela',
  'Produto elegante em fundo minimalista',
  'Cena cinematográfica dramática',
  'Ilustração de personagem estilizado',
];

export function PromptInput({
  value,
  onChange,
  onGenerate,
  isGenerating,
  placeholder = 'Descreva a imagem que você quer criar...',
  maxLength = 1000,
  className,
}: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isGenerating && value.trim()) {
      e.preventDefault();
      onGenerate();
    }
  };

  const characterCount = value.length;
  const isNearLimit = characterCount > maxLength * 0.8;
  const isOverLimit = characterCount > maxLength;

  return (
    <div className={cn('space-y-3', className)}>
      <div
        className={cn(
          'relative rounded-xl overflow-hidden',
          'bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl',
          'border border-gray-200/50 dark:border-gray-700/50 shadow-sm',
          'focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500/50',
          'transition-all duration-200'
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isGenerating}
          rows={3}
          className={cn(
            'w-full resize-none bg-transparent px-4 py-3 pr-24',
            'text-gray-900 dark:text-gray-100',
            'placeholder:text-gray-500 dark:placeholder:text-gray-400',
            'focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed',
            'text-base leading-relaxed'
          )}
        />
        <div className="absolute bottom-3 right-3">
          <Button
            onClick={onGenerate}
            disabled={isGenerating || !value.trim() || isOverLimit}
            size="sm"
            className={cn(
              'gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md shadow-blue-500/25'
            )}
          >
            {isGenerating ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="h-4 w-4" />
                </motion.div>
                <span>Gerando...</span>
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                <span>Gerar</span>
              </>
            )}
          </Button>
        </div>
        <div
          className={cn(
            'absolute bottom-3 left-4 text-xs',
            isOverLimit ? 'text-red-500' : isNearLimit ? 'text-amber-500' : 'text-gray-400'
          )}
        >
          {characterCount}/{maxLength}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          Pressione{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono">
            &#8984;
          </kbd>{' '}
          +{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono">
            Enter
          </kbd>{' '}
          para gerar
        </span>
      </div>

      {!value && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2"
        >
          <span className="text-xs text-gray-500">Sugestoes:</span>
          {PROMPT_SUGGESTIONS.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                onChange(suggestion);
                textareaRef.current?.focus();
              }}
              className={cn(
                'text-xs px-2 py-1 rounded-full',
                'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
                'hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400',
                'transition-colors'
              )}
            >
              {suggestion}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
