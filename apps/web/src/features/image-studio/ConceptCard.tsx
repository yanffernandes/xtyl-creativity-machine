import { memo } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreativeConcept } from '@repo/shared';

interface ConceptCardProps {
  concept: CreativeConcept;
  isSelected: boolean;
  onSelect: (concept: CreativeConcept) => void;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-20 h-20',
  lg: 'w-24 h-24',
};

export const ConceptCard = memo(function ConceptCard({
  concept,
  isSelected,
  onSelect,
  size = 'md',
}: ConceptCardProps) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(concept)}
      className={cn(
        'group relative flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-200',
        'hover:bg-white/10 dark:hover:bg-white/5',
        isSelected && 'bg-blue-500/10 dark:bg-blue-500/20 ring-2 ring-blue-500/50'
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div
        className={cn(
          'relative rounded-lg overflow-hidden',
          'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800',
          'ring-1 ring-black/5 dark:ring-white/10',
          sizeClasses[size]
        )}
      >
        {concept.thumbnail_url ? (
          <img
            src={concept.thumbnail_url}
            alt={concept.name}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl opacity-50">{concept.icon || '🎯'}</span>
          </div>
        )}

        {isSelected && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 bg-blue-500/30 flex items-center justify-center"
          >
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          </motion.div>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </div>

      <span
        className={cn(
          'text-xs font-medium text-center truncate w-full px-1',
          'text-gray-700 dark:text-gray-300',
          isSelected && 'text-blue-600 dark:text-blue-400'
        )}
      >
        {concept.name_pt || concept.name}
      </span>
    </motion.button>
  );
});
