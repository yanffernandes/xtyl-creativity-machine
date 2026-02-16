import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { CreativeConcept } from '@repo/shared';

const CATEGORY_LABELS: Record<string, string> = {
  universal: 'Universal',
  narrativa: 'Narrativa',
  prova_social: 'Prova Social',
  produto: 'Produto',
  curiosidade: 'Curiosidade',
  estilo_visual: 'Estilo Visual',
};

const CATEGORY_ORDER = [
  'universal',
  'narrativa',
  'prova_social',
  'produto',
  'curiosidade',
  'estilo_visual',
];

interface ConceptSelectorProps {
  concepts: CreativeConcept[];
  selectedConceptSlug: string | null;
  onSelectConcept: (slug: string | null) => void;
  disabled?: boolean;
  className?: string;
}

export function ConceptSelector({
  concepts,
  selectedConceptSlug,
  onSelectConcept,
  disabled = false,
  className,
}: ConceptSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedConcept = useMemo(
    () => concepts.find((c) => c.slug === selectedConceptSlug) || null,
    [concepts, selectedConceptSlug]
  );

  const grouped = useMemo(() => {
    const groups: Record<string, CreativeConcept[]> = {};
    const sorted = [...concepts].sort((a, b) => a.sort_order - b.sort_order);

    for (const c of sorted) {
      const cat = c.category || 'universal';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(c);
    }

    return CATEGORY_ORDER.filter((cat) => groups[cat]?.length).map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat] || cat,
      concepts: groups[cat],
    }));
  }, [concepts]);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
        <Sparkles className="w-4 h-4" />
        <span>Conceito Criativo</span>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-full justify-between h-10 font-normal bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
              !selectedConcept && 'text-muted-foreground'
            )}
          >
            {selectedConcept ? (
              <span className="flex items-center gap-2 truncate">
                <span className="text-base leading-none">
                  {selectedConcept.icon || '🎯'}
                </span>
                <span className="truncate">
                  {selectedConcept.name_pt || selectedConcept.name}
                </span>
              </span>
            ) : (
              <span>Selecione um conceito...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Buscar conceito..." />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>Nenhum conceito encontrado.</CommandEmpty>

              <CommandGroup>
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onSelectConcept(null);
                    setOpen(false);
                  }}
                  className="gap-2"
                >
                  <span className="text-base leading-none">🚫</span>
                  <span>Nenhum</span>
                  {selectedConceptSlug === null && (
                    <Check className="ml-auto h-4 w-4 text-blue-500" />
                  )}
                </CommandItem>
              </CommandGroup>

              {grouped.map((g) => (
                <CommandGroup key={g.category} heading={g.label}>
                  {g.concepts.map((c) => (
                    <CommandItem
                      key={c.slug}
                      value={`${c.name_pt} ${c.name} ${c.description || ''}`}
                      onSelect={() => {
                        onSelectConcept(
                          c.slug === selectedConceptSlug ? null : c.slug
                        );
                        setOpen(false);
                      }}
                      className="gap-2"
                    >
                      <span className="text-base leading-none shrink-0">
                        {c.icon || '🎯'}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="truncate text-sm">
                          {c.name_pt || c.name}
                        </span>
                        {c.description && (
                          <span className="truncate text-xs text-muted-foreground">
                            {c.description}
                          </span>
                        )}
                      </div>
                      {selectedConceptSlug === c.slug && (
                        <Check className="ml-auto h-4 w-4 shrink-0 text-blue-500" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedConcept && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/50">
          <span className="text-sm leading-none">
            {selectedConcept.icon || '🎯'}
          </span>
          <span className="text-xs text-blue-700 dark:text-blue-300 truncate flex-1">
            {selectedConcept.name_pt}
          </span>
          <button
            type="button"
            onClick={() => onSelectConcept(null)}
            className="p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded"
          >
            <X className="w-3 h-3 text-blue-500" />
          </button>
        </div>
      )}
    </div>
  );
}
