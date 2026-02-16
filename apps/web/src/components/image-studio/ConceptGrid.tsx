import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ConceptCard } from './ConceptCard';
import type { CreativeConcept } from '@/types/image-studio';

interface ConceptGridProps {
  concepts: CreativeConcept[];
  selectedConceptSlug: string | null;
  onSelectConcept: (slug: string | null) => void;
  isLoading?: boolean;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
  showNoneOption?: boolean;
}

export function ConceptGrid({
  concepts,
  selectedConceptSlug,
  onSelectConcept,
  isLoading = false,
  className,
  title = 'Conceito Criativo',
  icon,
  showNoneOption = true,
}: ConceptGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const handleScroll = () => {
    const c = scrollRef.current;
    if (!c) return;
    setCanScrollLeft(c.scrollLeft > 0);
    setCanScrollRight(c.scrollLeft < c.scrollWidth - c.clientWidth - 10);
  };

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({
      left: dir === 'left' ? -200 : 200,
      behavior: 'smooth',
    });
  };

  const sorted = [...concepts].sort((a, b) => a.sort_order - b.sort_order);

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
          {icon || <Sparkles className="w-4 h-4" />}
          <span>{title}</span>
        </div>
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 p-2 animate-pulse">
              <div className="w-20 h-20 rounded-lg bg-gray-200 dark:bg-gray-700" />
              <div className="w-14 h-3 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
          {icon || <Sparkles className="w-4 h-4" />}
          <span>{title}</span>
          {selectedConceptSlug && (
            <span className="text-blue-500">
              ({sorted.find((c) => c.slug === selectedConceptSlug)?.name_pt || selectedConceptSlug})
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={cn(
            'flex gap-1 overflow-x-auto scrollbar-hide pb-2 scroll-smooth snap-x snap-mandatory'
          )}
        >
          {showNoneOption && (
            <motion.button
              type="button"
              onClick={() => onSelectConcept(null)}
              className={cn(
                'flex-shrink-0 snap-start group flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-200',
                'hover:bg-white/10',
                selectedConceptSlug === null && 'bg-blue-500/10 ring-2 ring-blue-500/50'
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className={cn(
                  'w-20 h-20 rounded-lg overflow-hidden',
                  'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900',
                  'ring-1 ring-black/5 flex items-center justify-center'
                )}
              >
                <span className="text-2xl">🚫</span>
              </div>
              <span
                className={cn(
                  'text-xs font-medium text-gray-700 dark:text-gray-300',
                  selectedConceptSlug === null && 'text-blue-600 dark:text-blue-400'
                )}
              >
                Nenhum
              </span>
            </motion.button>
          )}

          {sorted.map((concept) => (
            <div key={concept.id} className="flex-shrink-0 snap-start">
              <ConceptCard
                concept={concept}
                isSelected={selectedConceptSlug === concept.slug}
                onSelect={(c) => onSelectConcept(c.slug)}
              />
            </div>
          ))}
        </div>

        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-white dark:from-gray-900 to-transparent pointer-events-none" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white dark:from-gray-900 to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  );
}
