import React from 'react';
import { TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { dataColors } from '@/lib/colors';

interface EnhancedChartTooltipProps extends TooltipProps<ValueType, NameType> {
  isCurrency?: boolean;
  isPercentage?: boolean;
  showTotal?: boolean;
  periodLabel?: string;
  compareKey?: string;
  formatter?: (value: any, name: string, props: any) => [string, string];
}

const EnhancedChartTooltip: React.FC<EnhancedChartTooltipProps> = ({
  active,
  payload,
  label,
  isCurrency = true,
  isPercentage = false,
  showTotal = false,
  periodLabel = 'Period',
  compareKey,
  formatter,
}) => {
  if (!active || !payload || payload.length === 0) return null;

  // Format value based on type
  const formatValue = (value: number): string => {
    if (formatter) {
      const [formattedValue] = formatter(value, '', {});
      return formattedValue;
    }
    
    if (isPercentage) return formatPercent(value);
    if (isCurrency) return formatCurrency(value);
    return value.toLocaleString();
  };

  // Calculate total if needed
  const total = showTotal 
    ? payload.reduce((sum, entry) => sum + (entry.value as number || 0), 0)
    : undefined;

  return (
    <div className="bg-white dark:bg-gray-800 p-3 border rounded-md shadow-lg min-w-[200px]">
      <p className="font-medium text-sm mb-2 border-b pb-1">{periodLabel}: {label}</p>
      
      <div className="space-y-2 pt-1">
        {payload.map((entry, index) => {
          // Get comparison data if available
          const comparison = compareKey && entry.payload[compareKey] 
            ? {
                value: entry.payload[compareKey],
                change: (entry.value as number) - entry.payload[compareKey],
                percent: entry.payload[compareKey] !== 0 
                  ? (((entry.value as number) - entry.payload[compareKey]) / Math.abs(entry.payload[compareKey])) * 100
                  : 0
              }
            : undefined;
            
          const isPositive = comparison && comparison.change > 0;
          const isNegative = comparison && comparison.change < 0;
          
          return (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
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
                <div className="flex justify-end text-xs">
                  <span 
                    style={{ 
                      color: isPositive 
                        ? dataColors.positive 
                        : isNegative 
                        ? dataColors.negative 
                        : dataColors.neutral 
                    }}
                  >
                    {isPositive ? '↑ ' : isNegative ? '↓ ' : ''}
                    {formatValue(comparison.change)}
                    {` (${formatPercent(comparison.percent)})`}
                  </span>
                </div>
              )}
            </div>
          );
        })}
        
        {showTotal && total !== undefined && (
          <div className="pt-2 mt-1 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total</span>
              <span className="font-bold">
                {formatValue(total)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedChartTooltip;
