'use client';

import { Brain } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function MemoryEmptyState() {
  const t = useTranslations('memory');

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-muted/50 p-4 mb-4">
        <Brain className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">
        {t('noMemories')}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {t('noMemoriesDescription')}
      </p>
    </div>
  );
}
