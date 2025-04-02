import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={cn(
      "w-full px-4 sm:px-6 md:px-8 mx-auto",
      "max-w-7xl",
      className
    )}>
      {children}
    </div>
  );
};

export default ResponsiveContainer;
