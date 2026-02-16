import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface CreativitySliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

const CREATIVITY_LABELS = [
  { min: 0, max: 20, label: 'Conservador', description: 'Segue o prompt fielmente' },
  { min: 21, max: 40, label: 'Balanceado', description: 'Equilibrio entre fidelidade e criatividade' },
  { min: 41, max: 60, label: 'Criativo', description: 'Adiciona detalhes artisticos' },
  { min: 61, max: 80, label: 'Expressivo', description: 'Interpretacao artistica livre' },
  { min: 81, max: 100, label: 'Experimental', description: 'Resultados surpreendentes' },
];

function getLevel(value: number) {
  return CREATIVITY_LABELS.find((l) => value >= l.min && value <= l.max) || CREATIVITY_LABELS[2];
}

function getColor(value: number): string {
  if (value <= 20) return 'text-blue-500';
  if (value <= 40) return 'text-cyan-500';
  if (value <= 60) return 'text-green-500';
  if (value <= 80) return 'text-amber-500';
  return 'text-red-500';
}

export function CreativitySlider({
  value,
  onChange,
  disabled = false,
  className,
}: CreativitySliderProps) {
  const [isHovered, setIsHovered] = useState(false);
  const level = getLevel(value);
  const colorClass = getColor(value);

  const handleChange = useCallback(
    (values: number[]) => {
      onChange(values[0]);
    },
    [onChange]
  );

  return (
    <div
      className={cn('space-y-3', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
          <Sparkles className={cn('w-4 h-4', colorClass)} /> Criatividade
        </label>
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-semibold', colorClass)}>{level.label}</span>
          <span className="text-xs text-gray-400">{value}%</span>
        </div>
      </div>

      <Slider
        value={[value]}
        onValueChange={handleChange}
        min={0}
        max={100}
        step={5}
        disabled={disabled}
        className={cn('w-full', disabled && 'opacity-50 cursor-not-allowed')}
      />

      <motion.div
        initial={false}
        animate={{ opacity: isHovered ? 1 : 0.7, y: isHovered ? 0 : 2 }}
        className="text-xs text-gray-500"
      >
        {level.description}
      </motion.div>

      <div className="flex gap-1">
        {[0, 25, 50, 75, 100].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            disabled={disabled}
            className={cn(
              'flex-1 py-1 text-[10px] rounded transition-colors',
              value === preset
                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500',
              'hover:bg-blue-500/10',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {preset}%
          </button>
        ))}
      </div>
    </div>
  );
}
