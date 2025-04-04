import React, { useMemo } from 'react';
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

interface WaterfallItem {
  name: string;
  value: number;
  isTotal?: boolean;
  isStartValue?: boolean;
  color?: string;
}

interface WaterfallChartProps {
  data: WaterfallItem[];
  height?: number;
  isCurrency?: boolean;
  isPercentage?: boolean;
  showConnectors?: boolean;
  showValues?: boolean;
  baseValue?: number;
  positiveColor?: string;
  negativeColor?: string;
  totalColor?: string;
  startColor?: string;
}

const WaterfallChart: React.FC<WaterfallChartProps> = ({
  data,
  height = 400,
  isCurrency = true,
  isPercentage = false,
  showConnectors = true,
  showValues = true,
  baseValue = 0,
  positiveColor = dataColors.positive,
  negativeColor = dataColors.negative,
  totalColor = dataColors.neutral,
  startColor = dataColors.series[0],
}) => {
  // Process data to calculate running total
  const processedData = useMemo(() => {
    let runningTotal = baseValue;
    
    return data.map((item, index) => {
      const start = runningTotal;
      
      // If it's a total or start value, set the absolute value
      if (item.isTotal || item.isStartValue) {
        runningTotal = item.value;
      } else {
        runningTotal += item.value;
      }
      
      return {
        ...item,
        start,
        end: runningTotal,
        // For rendering, we need positive values
        value: Math.abs(item.value),
      };
    });
  }, [data, baseValue]);
  
  // Format value based on type
  const formatValue = (value: number): string => {
    if (isPercentage) return formatPercent(value);
    if (isCurrency) return formatCurrency(value);
    return value.toLocaleString();
  };
  
  // Custom tooltip formatter
  const tooltipFormatter = (value: any, name: string, props: any): [string, string] => {
    const item = props.payload;
    
    if (name === 'value') {
      // For total/start items, show the absolute value
      if (item.isTotal || item.isStartValue) {
        return [formatValue(item.end), item.name];
      }
      
      // For regular items, show the change
      const changeValue = item.value * (item.end > item.start ? 1 : -1);
      const formattedChange = (changeValue > 0 ? '+' : '') + formatValue(changeValue);
      return [formattedChange, item.name];
    }
    
    return [formatValue(value), name];
  };
  
  // Get color for a bar
  const getBarColor = (item: WaterfallItem) => {
    if (item.color) return item.color;
    if (item.isTotal) return totalColor;
    if (item.isStartValue) return startColor;
    return item.value >= 0 ? positiveColor : negativeColor;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={processedData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis 
          dataKey="name" 
          axisLine={false}
          tickLine={false}
        />
        <YAxis 
          tickFormatter={formatValue}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip 
          content={<EnhancedChartTooltip 
            isCurrency={isCurrency} 
            isPercentage={isPercentage}
            formatter={tooltipFormatter}
          />} 
        />
        <Legend />
        <ReferenceLine y={0} stroke="#000" />
        
        {/* Invisible bars for start values */}
        <Bar
          dataKey="start"
          fill="transparent"
          stroke="transparent"
          stackId="stack"
          isAnimationActive={false}
        />
        
        {/* Visible bars for values */}
        <Bar
          dataKey="value"
          name="Change"
          stackId="stack"
          label={showValues ? {
            position: 'top',
            formatter: (value: number, entry: any) => {
              const item = entry.payload;
              if (item.isTotal || item.isStartValue) {
                return formatValue(item.end);
              }
              const changeValue = value * (item.end > item.start ? 1 : -1);
              return (changeValue > 0 ? '+' : '') + formatValue(changeValue);
            },
            fill: '#333',
            fontSize: 12,
          } : false}
        >
          {processedData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={getBarColor(entry)}
            />
          ))}
        </Bar>
        
        {/* Connector lines */}
        {showConnectors && (
          <Bar
            dataKey="end"
            fill="transparent"
            stroke="#333"
            strokeDasharray="3 3"
            stackId="connector"
            isAnimationActive={false}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default WaterfallChart;
