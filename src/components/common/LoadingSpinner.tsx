import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: 'primary' | 'secondary' | 'accent';
}

/**
 * A reusable loading spinner component with customizable size and color.
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '',
  color = 'primary'
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-16 w-16 border-4',
  };

  const colorClasses = {
    primary: 'border-t-fortress-blue',
    secondary: 'border-t-fortress-emerald',
    accent: 'border-t-fortress-gold',
  };

  return (
    <div 
      className={cn(
        sizeClasses[size], 
        colorClasses[color],
        'border-gray-200 dark:border-gray-700 rounded-full animate-spin',
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default LoadingSpinner;
