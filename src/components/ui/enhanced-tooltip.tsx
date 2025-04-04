import React from 'react';
import { TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { dataColors } from '@/lib/colors';

interface EnhancedTooltipProps extends TooltipProps<ValueType, NameType> {
  showPercentage?: boolean;
  isCurrency?: boolean;
  isPercentage?: boolean;
  compareKey?: string;
  periodLabel?: string;
}

const EnhancedTooltip: React.FC<EnhancedTooltipProps> = ({ 
  active, 
  payload, 
  label, 
  showPercentage = false,
  isCurrency = true,
  isPercentage = false,
  compareKey,
  periodLabel = 'Period'
}) => {
  if (!active || !payload || payload.length === 0) return null;
  
  // Format value based on type
  const formatValue = (value: number): string => {
    if (isPercentage) return formatPercent(value);
    if (isCurrency) return formatCurrency(value);
    return value.toLocaleString();
  };
  
  // Calculate percentage change if compareKey is provided
  const getComparisonData = (entry: any) => {
    if (!compareKey || !entry.payload[compareKey]) return null;
    
    const currentValue = entry.value as number;
    const compareValue = entry.payload[compareKey] as number;
    
    if (compareValue === 0) return { change: 0, percentage: 0 };
    
    const change = currentValue - compareValue;
    const percentage = (change / Math.abs(compareValue)) * 100;
    
    return { change, percentage };
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-3 border rounded-md shadow-lg">
      <p className="font-medium text-sm mb-2">{periodLabel}: {label}</p>
      <div className="space-y-2">
        {payload.map((entry, index) => {
          const comparison = compareKey ? getComparisonData(entry) : null;
          const isPositive = comparison && comparison.change > 0;
          const isNegative = comparison && comparison.change < 0;
          
          return (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm font-medium">{entry.name}</span>
                </div>
                <span className="font-medium">
                  {typeof entry.value === 'number' 
                    ? formatValue(entry.value as number) 
                    : entry.value}
                </span>
              </div>
              
              {comparison && (
                <div className="flex items-center text-xs ml-5">
                  <span className={`font-medium ${isPositive ? 'text-emerald-500' : isNegative ? 'text-red-500' : 'text-gray-500'}`}>
                    {isPositive ? '↑ ' : isNegative ? '↓ ' : ''}
                    {formatValue(comparison.change)}
                    {showPercentage && ` (${formatPercent(comparison.percentage)})`}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EnhancedTooltip;
