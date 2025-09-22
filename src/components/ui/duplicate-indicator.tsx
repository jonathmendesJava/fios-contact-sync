import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Phone, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DuplicateIndicatorProps {
  isDuplicate: boolean;
  duplicateType?: 'phone' | 'email';
  variant?: 'badge' | 'icon' | 'inline';
  size?: 'sm' | 'md';
  className?: string;
}

export const DuplicateIndicator: React.FC<DuplicateIndicatorProps> = ({
  isDuplicate,
  duplicateType,
  variant = 'badge',
  size = 'md',
  className,
}) => {
  if (!isDuplicate) return null;

  const getIcon = () => {
    switch (duplicateType) {
      case 'phone':
        return Phone;
      case 'email':
        return Mail;
      default:
        return AlertTriangle;
    }
  };

  const getLabel = () => {
    switch (duplicateType) {
      case 'phone':
        return 'Telefone Duplicado';
      case 'email':
        return 'Email Duplicado';
      default:
        return 'Duplicado';
    }
  };

  const Icon = getIcon();
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  if (variant === 'badge') {
    return (
      <Badge 
        variant="destructive" 
        className={cn(
          'text-xs px-2 py-0.5 flex items-center space-x-1',
          size === 'sm' && 'px-1.5 py-0.5 text-xs',
          className
        )}
      >
        <Icon className={iconSize} />
        <span>{size === 'sm' ? 'DUP' : 'DUPLICADO'}</span>
      </Badge>
    );
  }

  if (variant === 'icon') {
    return (
      <div title={getLabel()}>
        <Icon 
          className={cn(
            iconSize,
            'text-destructive',
            className
          )}
        />
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn(
        'flex items-center space-x-1 text-destructive',
        size === 'sm' ? 'text-xs' : 'text-sm',
        className
      )}>
        <Icon className={iconSize} />
        <span>{getLabel()}</span>
      </div>
    );
  }

  return null;
};