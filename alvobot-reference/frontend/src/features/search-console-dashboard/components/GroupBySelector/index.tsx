import { Select } from '@/shared/components';
import styles from './GroupBySelector.module.css';
import { GROUP_BY_LABELS, SUB_GROUP_BY_LABELS, VALID_SUB_GROUPINGS, type SearchConsolePrimaryGroupBy, type SearchConsoleSubGroupBy  } from '../../types';

interface GroupBySelectorProps {
  groupBy: SearchConsolePrimaryGroupBy;
  onGroupByChange: (value: SearchConsolePrimaryGroupBy) => void;
  subGroupBy: SearchConsoleSubGroupBy;
  onSubGroupByChange: (value: SearchConsoleSubGroupBy) => void;
}

export function GroupBySelector({
  groupBy,
  onGroupByChange,
  subGroupBy,
  onSubGroupByChange,
}: GroupBySelectorProps) {
  const validSubGroupings = VALID_SUB_GROUPINGS[groupBy];

  // Auto-update subGroupBy if current selection is invalid for new groupBy
  const handleGroupByChange = (value: string) => {
    const newGroupBy = value as SearchConsolePrimaryGroupBy;
    onGroupByChange(newGroupBy);

    const newValidSubGroupings = VALID_SUB_GROUPINGS[newGroupBy];
    if (!newValidSubGroupings.includes(subGroupBy)) {
      onSubGroupByChange(newValidSubGroupings[0]);
    }
  };

  const groupByOptions: SearchConsolePrimaryGroupBy[] = [
    'query',
    'page',
    'country',
    'device',
    'date_day',
    'date_week',
    'date_month',
  ];

  return (
    <div className={styles.container}>
      {/* Primary Group By */}
      <div className={styles.selectorWrapper}>
        <span className={styles.label}>Agrupar por:</span>
        <Select
          value={groupBy}
          onValueChange={handleGroupByChange}
          options={groupByOptions.map((option) => ({
            value: option,
            label: GROUP_BY_LABELS[option],
          }))}
          size="md"
          className={styles.selectTrigger}
        />
      </div>

      {/* Sub Group By */}
      <div className={styles.selectorWrapper}>
        <span className={styles.label}>Expandir por:</span>
        <Select
          value={subGroupBy}
          onValueChange={(v) => onSubGroupByChange(v as SearchConsoleSubGroupBy)}
          options={validSubGroupings.map((option) => ({
            value: option,
            label: SUB_GROUP_BY_LABELS[option],
          }))}
          size="md"
          className={styles.selectTrigger}
        />
      </div>
    </div>
  );
}
