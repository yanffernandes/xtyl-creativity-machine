import { Select } from '@/shared/components';
import { SEARCH_TYPE_LABELS, type SearchType  } from '../../types';

interface SearchTypeFilterProps {
  value: SearchType;
  onChange: (value: SearchType) => void;
}

export function SearchTypeFilter({ value, onChange }: SearchTypeFilterProps) {
  const options: SearchType[] = ['web', 'image', 'video', 'news', 'discover'];

  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as SearchType)}
      options={options.map((option) => ({
        value: option,
        label: SEARCH_TYPE_LABELS[option],
      }))}
      placeholder="Tipo de busca"
      size="md"
    />
  );
}
