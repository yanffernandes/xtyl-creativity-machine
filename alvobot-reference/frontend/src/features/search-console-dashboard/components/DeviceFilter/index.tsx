import { Select } from '@/shared/components';
import { DEVICE_LABELS, type DeviceType  } from '../../types';

interface DeviceFilterProps {
  value: DeviceType | undefined;
  onChange: (value: DeviceType | undefined) => void;
}

export function DeviceFilter({ value, onChange }: DeviceFilterProps) {
  const options: Array<{ value: string; label: string }> = [
    { value: '', label: 'Todos os dispositivos' },
    { value: 'DESKTOP', label: DEVICE_LABELS.DESKTOP },
    { value: 'MOBILE', label: DEVICE_LABELS.MOBILE },
    { value: 'TABLET', label: DEVICE_LABELS.TABLET },
  ];

  const handleChange = (selectedValue: string) => {
    onChange(selectedValue === '' ? undefined : selectedValue as DeviceType);
  };

  return (
    <Select
      value={value || ''}
      onValueChange={handleChange}
      options={options}
      placeholder="Dispositivo"
      size="md"
    />
  );
}
