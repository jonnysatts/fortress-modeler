import React from 'react';
import { 
  Radar, 
  RadarChart as RechartsRadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer, 
  Legend,
  Tooltip
} from 'recharts';
import { useTheme } from '@/components/theme-provider';
import { dataColors } from '@/lib/colors';

interface RadarChartProps {
  data: any[];
  dataKeys: string[];
  height?: number;
  isPercentage?: boolean;
  maxValue?: number;
}

const RadarChart: React.FC<RadarChartProps> = ({
  data,
  dataKeys,
  height = 300,
  isPercentage = false,
  maxValue,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Define colors for each data key
  const colors = [
    dataColors.primary,
    dataColors.secondary,
    dataColors.tertiary,
    dataColors.quaternary,
    dataColors.quinary,
  ];

  // Custom tooltip formatter
  const formatTooltipValue = (value: number) => {
    if (isPercentage) {
      return `${value.toFixed(1)}%`;
    }
    return value.toFixed(1);
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsRadarChart 
        data={data} 
        margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
      >
        <PolarGrid stroke={isDark ? '#444' : '#ddd'} />
        <PolarAngleAxis 
          dataKey="name" 
          tick={{ fill: isDark ? '#ccc' : '#333', fontSize: 12 }}
        />
        <PolarRadiusAxis 
          angle={90} 
          domain={[0, maxValue || 'auto']}
          tick={{ fill: isDark ? '#ccc' : '#333', fontSize: 10 }}
          tickFormatter={(value) => isPercentage ? `${value}%` : value}
        />
        
        {dataKeys.map((key, index) => (
          <Radar
            key={key}
            name={key}
            dataKey={key}
            stroke={colors[index % colors.length]}
            fill={colors[index % colors.length]}
            fillOpacity={0.2}
            dot={true}
            isAnimationActive={true}
          />
        ))}
        
        <Tooltip 
          formatter={(value: number) => [formatTooltipValue(value)]}
          contentStyle={{ 
            backgroundColor: isDark ? '#333' : '#fff',
            border: `1px solid ${isDark ? '#555' : '#ddd'}`,
            borderRadius: '4px',
            color: isDark ? '#fff' : '#333'
          }}
        />
        
        <Legend 
          wrapperStyle={{ paddingTop: 10 }}
          formatter={(value) => <span style={{ color: isDark ? '#fff' : '#333' }}>{value}</span>}
        />
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
};

export default RadarChart;
