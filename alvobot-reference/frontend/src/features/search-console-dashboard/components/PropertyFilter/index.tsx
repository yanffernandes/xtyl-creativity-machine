import { ChevronDown, Check, Globe } from 'lucide-react';
import { PopoverContent, PopoverRoot, PopoverTrigger } from '@/shared/components';
import styles from './PropertyFilter.module.css';
import type { SearchConsoleProperty } from '../../types';

interface PropertyFilterProps {
  properties: SearchConsoleProperty[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function PropertyFilter({ properties, selectedIds, onChange }: PropertyFilterProps) {
  const handleToggleProperty = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    onChange(properties.map((p) => p.id));
  };

  const handleDeselectAll = () => {
    onChange([]);
  };

  const selectedCount = selectedIds.length;
  const totalCount = properties.length;

  return (
    <PopoverRoot>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={styles.trigger}
        >
          <Globe size={16} />
          <span>
            {selectedCount === 0
              ? 'Selecionar propriedades'
              : selectedCount === totalCount
                ? 'Todas as propriedades'
                : `${selectedCount} propriedade${selectedCount > 1 ? 's' : ''}`}
          </span>
          <ChevronDown size={16} />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className={styles.dropdown}>
        <div className={styles.actions}>
          <button type="button" onClick={handleSelectAll} className={styles.actionBtn}>
            Selecionar todos
          </button>
          <button type="button" onClick={handleDeselectAll} className={styles.actionBtn}>
            Limpar seleção
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.list}>
          {properties.map((property) => {
            const isSelected = selectedIds.includes(property.id);
            return (
              <button
                key={property.id}
                type="button"
                className={`${styles.item} ${isSelected ? styles.selected : ''}`}
                onClick={() => handleToggleProperty(property.id)}
              >
                <div className={`${styles.checkbox} ${isSelected ? styles.checked : ''}`}>
                  {isSelected && <Check size={12} />}
                </div>
                <div className={styles.propertyInfo}>
                  <span className={styles.propertyUrl}>{property.siteUrl}</span>
                  <span className={styles.propertyType}>
                    {property.propertyType === 'DOMAIN' ? 'Domínio' : 'URL'}
                  </span>
                </div>
              </button>
            );
          })}

          {properties.length === 0 && (
            <div className={styles.empty}>
              <p>Nenhuma propriedade ativa</p>
              <p className={styles.emptyHint}>
                Ative propriedades nas configurações de conexão
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </PopoverRoot>
  );
}
