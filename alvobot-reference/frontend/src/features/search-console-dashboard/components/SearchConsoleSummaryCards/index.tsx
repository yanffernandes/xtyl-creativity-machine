import { MousePointer, Eye, TrendingUp, Hash } from 'lucide-react';
import { SummaryCardsGrid, type CardConfig } from '@/shared/components/SummaryCardsGrid';
import type { SearchConsoleSummary } from '../../types';

interface SearchConsoleSummaryCardsProps {
  summary?: SearchConsoleSummary;
  isLoading?: boolean;
}

function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString('pt-BR');
}

export function SearchConsoleSummaryCards({ summary, isLoading }: SearchConsoleSummaryCardsProps) {
  const cards: CardConfig[] = [
    {
      icon: MousePointer,
      label: 'Cliques',
      value: summary ? formatNumber(summary.clicks) : '0',
      color: '#3B82F6', // Blue
    },
    {
      icon: Eye,
      label: 'Impressões',
      value: summary ? formatNumber(summary.impressions) : '0',
      color: '#8B5CF6', // Purple
    },
    {
      icon: TrendingUp,
      label: 'CTR',
      value: summary ? `${(summary.ctr * 100).toFixed(2)}%` : '0%',
      color: '#10B981', // Green
    },
    {
      icon: Hash,
      label: 'Posição Média',
      value: summary ? summary.position.toFixed(1) : '0',
      color: '#F59E0B', // Yellow
    },
  ];

  return <SummaryCardsGrid cards={cards} isLoading={isLoading} />;
}
