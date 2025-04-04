import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { dataColors } from '@/lib/colors';
import { formatCurrency, formatPercent } from '@/lib/utils';
import EnhancedChartTooltip from './enhanced-chart-tooltip';

interface BulletChartItem {
  name: string;
  actual: number;
  target: number;
  forecast?: number;
  ranges?: number[]; // For background ranges (e.g., [poor, satisfactory, good])
}

interface BulletChartProps {
  data: BulletChartItem[];
  height?: number;
  isCurrency?: boolean;
  isPercentage?: boolean;
  layout?: 'vertical' | 'horizontal';
  showLabels?: boolean;
  actualColor?: string;
  targetColor?: string;
  forecastColor?: string;
  rangeColors?: string[];
}

const BulletChart: React.FC<BulletChartProps> = ({
  data,
  height = 400,
  isCurrency = true,
  isPercentage = false,
  layout = 'horizontal',
  showLabels = true,
  actualColor = dataColors.actual,
  targetColor = dataColors.target,
  forecastColor = dataColors.forecast,
  rangeColors = ['#f1f5f9', '#e2e8f0', '#cbd5e1'], // Light grays
}) => {
  // Format value based on type
  const formatValue = (value: number): string => {
    if (isPercentage) return formatPercent(value);
    if (isCurrency) return formatCurrency(value);
    return value.toLocaleString();
  };
  
  // Find the maximum value for scaling
  const maxValue = Math.max(
    ...data.flatMap(item => [
      item.actual,
      item.target,
      item.forecast || 0,
      ...(item.ranges || [])
    ])
  );
  
  // Process data to include ranges as separate bars
  const processedData = data.map(item => {
    const result: any = { ...item };
    
    // Add ranges if provided
    if (item.ranges && item.ranges.length > 0) {
      item.ranges.forEach((range, index) => {
        result[`range${index}`] = range;
      });
    }
    
    return result;
  });
  
  // Determine if we're using vertical or horizontal layout
  const isVertical = layout === 'vertical';
  
  // Custom tooltip formatter
  const tooltipFormatter = (value: any, name: string, props: any): [string, string] => {
    if (name.startsWith('range')) {
      return ['', ''];  // Don't show tooltips for ranges
    }
    
    let label = name;
    if (name === 'actual') label = 'Actual';
    if (name === 'target') label = 'Target';
    if (name === 'forecast') label = 'Forecast';
    
    return [formatValue(value), label];
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={processedData}
        layout={layout}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        {isVertical ? (
          <>
            <XAxis type="number" tickFormatter={formatValue} />
            <YAxis dataKey="name" type="category" width={100} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" />
            <YAxis tickFormatter={formatValue} />
          </>
        )}
        <Tooltip 
          content={<EnhancedChartTooltip 
            isCurrency={isCurrency} 
            isPercentage={isPercentage}
            formatter={tooltipFormatter}
          />} 
        />
        <Legend />
        
        {/* Background ranges */}
        {rangeColors.map((color, index) => (
          <Bar
            key={`range-${index}`}
            dataKey={`range${index}`}
            name={`Range ${index + 1}`}
            fill={color}
            radius={0}
            barSize={isVertical ? 30 : 40}
            isAnimationActive={false}
            hide={true} // Hide from legend
          />
        ))}
        
        {/* Forecast bar */}
        <Bar
          dataKey="forecast"
          name="Forecast"
          fill={forecastColor}
          radius={0}
          barSize={isVertical ? 20 : 20}
        />
        
        {/* Actual bar */}
        <Bar
          dataKey="actual"
          name="Actual"
          fill={actualColor}
          radius={0}
          barSize={isVertical ? 10 : 10}
          label={showLabels ? {
            position: isVertical ? 'right' : 'top',
            formatter: (value: number) => formatValue(value),
            fill: '#333',
            fontSize: 12,
          } : false}
        />
        
        {/* Target markers */}
        {processedData.map((entry, index) => (
          <ReferenceLine
            key={`target-${index}`}
            {...(isVertical 
              ? { y: index, x: entry.target } 
              : { x: index, y: entry.target }
            )}
            stroke={targetColor}
            strokeWidth={2}
            strokeDasharray="3 3"
            label={{
              value: formatValue(entry.target),
              position: isVertical ? 'right' : 'top',
              fill: targetColor,
              fontSize: 12,
            }}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default BulletChart;
