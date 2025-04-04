import React from 'react';
import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { dataColors } from '@/lib/colors';
import { formatCurrency, formatPercent } from '@/lib/utils';
import EnhancedChartTooltip from './enhanced-chart-tooltip';

interface RadarDataItem {
  subject: string;
  [key: string]: string | number;
}

interface RadarChartProps {
  data: RadarDataItem[];
  height?: number;
  dataKeys: string[];
  colors?: string[];
  isCurrency?: boolean;
  isPercentage?: boolean;
  maxValue?: number;
  fillOpacity?: number;
  legendPosition?: 'top' | 'bottom' | 'right' | 'left';
}

const RadarChart: React.FC<RadarChartProps> = ({
  data,
  height = 400,
  dataKeys,
  colors = dataColors.series,
  isCurrency = false,
  isPercentage = true,
  maxValue,
  fillOpacity = 0.2,
  legendPosition = 'bottom',
}) => {
  // Format value based on type
  const formatValue = (value: number): string => {
    if (isPercentage) return formatPercent(value);
    if (isCurrency) return formatCurrency(value);
    return value.toLocaleString();
  };
  
  // Custom tooltip formatter
  const tooltipFormatter = (value: any, name: string, props: any): [string, string] => {
    return [formatValue(value), name];
  };
  
  // Calculate legend position
  const getLegendProps = () => {
    switch (legendPosition) {
      case 'top':
        return { verticalAlign: 'top', height: 36 };
      case 'bottom':
        return { verticalAlign: 'bottom', height: 36 };
      case 'right':
        return { layout: 'vertical', verticalAlign: 'middle', align: 'right' };
      case 'left':
        return { layout: 'vertical', verticalAlign: 'middle', align: 'left' };
      default:
        return { verticalAlign: 'bottom', height: 36 };
    }
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsRadarChart 
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
      >
        <PolarGrid gridType="polygon" />
        <PolarAngleAxis dataKey="subject" />
        <PolarRadiusAxis 
          tickFormatter={formatValue}
          domain={[0, maxValue || 'auto']}
          angle={90}
        />
        
        {dataKeys.map((key, index) => (
          <Radar
            key={key}
            name={key}
            dataKey={key}
            stroke={colors[index % colors.length]}
            fill={colors[index % colors.length]}
            fillOpacity={fillOpacity}
          />
        ))}
        
        <Tooltip 
          content={<EnhancedChartTooltip 
            isCurrency={isCurrency} 
            isPercentage={isPercentage}
            formatter={tooltipFormatter}
            periodLabel="Dimension"
          />} 
        />
        
        <Legend {...getLegendProps()} />
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
};

export default RadarChart;
