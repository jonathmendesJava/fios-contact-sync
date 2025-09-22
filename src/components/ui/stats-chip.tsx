import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsChipProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  color?: 'primary' | 'secondary' | 'destructive' | 'muted';
  size?: 'sm' | 'md';
  className?: string;
}

export const StatsChip: React.FC<StatsChipProps> = ({
  icon: Icon,
  label,
  value,
  color = 'primary',
  size = 'md',
  className,
}) => {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    secondary: 'bg-secondary/10 text-secondary border-secondary/20',
    destructive: 'bg-destructive/10 text-destructive border-destructive/20',
    muted: 'bg-muted text-muted-foreground border-border',
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
  };

  return (
    <div className={cn(
      'flex items-center space-x-2 rounded-md border transition-colors',
      colorClasses[color],
      sizeClasses[size],
      className
    )}>
      <Icon className={cn(
        size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
      )} />
      <div className="flex flex-col">
        <span className="font-semibold">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        <span className={cn(
          'opacity-70',
          size === 'sm' ? 'text-xs' : 'text-xs'
        )}>
          {label}
        </span>
      </div>
    </div>
  );
};