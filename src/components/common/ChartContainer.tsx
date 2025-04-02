import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ChartContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  height?: string | number;
  actions?: React.ReactNode;
}

const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  description,
  children,
  className,
  height = 300,
  actions,
}) => {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-medium">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {actions && (
            <div className="ml-4">{actions}</div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div style={{ height }} className="w-full">
          {children}
        </div>
      </CardContent>
    </Card>
  );
};

export default ChartContainer;
