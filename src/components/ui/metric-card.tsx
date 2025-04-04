import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Sparkline } from '@/components/ui/sparkline';
import { dataColors } from '@/lib/colors';

interface MetricCardProps {
  title: string;
  value: string | number;
  previousValue?: string | number;
  change?: number;
  trend?: number[];
  icon?: React.ReactNode;
  status?: 'positive' | 'negative' | 'neutral';
  description?: string;
  className?: string;
  isCurrency?: boolean;
  isPercentage?: boolean;
  footer?: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  previousValue,
  change,
  trend,
  icon,
  status,
  description,
  className,
  isCurrency = false,
  isPercentage = false,
  footer,
}) => {
  // Determine status based on change if not explicitly provided
  const derivedStatus = status || (change ? (change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral') : 'neutral');
  
  // Determine color based on status
  const getStatusColor = () => {
    switch (derivedStatus) {
      case 'positive':
        return dataColors.positive;
      case 'negative':
        return dataColors.negative;
      default:
        return dataColors.neutral;
    }
  };
  
  // Get appropriate icon based on status
  const getStatusIcon = () => {
    switch (derivedStatus) {
      case 'positive':
        return <ArrowUpRight className="w-4 h-4" style={{ color: dataColors.positive }} />;
      case 'negative':
        return <ArrowDownRight className="w-4 h-4" style={{ color: dataColors.negative }} />;
      default:
        return <Minus className="w-4 h-4" style={{ color: dataColors.neutral }} />;
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
            
            {(change !== undefined || previousValue !== undefined) && (
              <div className="flex items-center mt-2">
                {getStatusIcon()}
                <span className="text-sm font-medium ml-1" style={{ color: getStatusColor() }}>
                  {change !== undefined && (change > 0 ? '+' : '')}{change !== undefined ? `${change.toFixed(1)}%` : ''}
                </span>
                {previousValue && (
                  <span className="text-xs text-muted-foreground ml-1">
                    vs {previousValue}
                  </span>
                )}
              </div>
            )}
            
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          
          {icon && (
            <div className="bg-muted/30 p-2 rounded-full">
              {icon}
            </div>
          )}
        </div>
        
        {trend && trend.length > 0 && (
          <div className="mt-4 h-10">
            <Sparkline 
              data={trend} 
              color={getStatusColor()}
              height={40}
              width={100}
              fillOpacity={0.2}
              strokeWidth={1.5}
            />
          </div>
        )}
        
        {footer && (
          <div className="mt-4 pt-3 border-t border-border/50">
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard;
