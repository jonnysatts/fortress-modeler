import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 space-y-4 text-center",
      className
    )}>
      {icon && (
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          {icon}
        </div>
      )}
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-muted-foreground text-center max-w-md">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button 
          onClick={onAction} 
          className="bg-fortress-emerald hover:bg-fortress-emerald/90"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
