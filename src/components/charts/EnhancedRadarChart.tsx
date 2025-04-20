import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
  ResponsiveContainer,
  Label,
  Text
} from 'recharts';
import { dataColors } from '@/lib/colors';
import { formatPercent } from '@/lib/utils';

interface RadarDataPoint {
  subject: string;
  Actual: number;
  Target: number;
  [key: string]: string | number;
}

interface RadarChartDataPoint {
  [key: string]: string | number;
}

interface EnhancedRadarChartProps {
  data: RadarDataPoint[];
  height?: number;
}

// Custom tooltip for the radar chart
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload?: RadarDataPoint; value?: number; dataKey?: string | number }[] }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    const metric = (dataPoint as RadarDataPoint).subject;
    const actual = Number(payload.find((p) => p.dataKey === 'Actual')?.value) || 0;
    const target = Number(payload.find((p) => p.dataKey === 'Target')?.value) || 0;
    
    // Calculate performance as a percentage of target
    const performance = target !== 0 ? (actual / target) * 100 : 0;
    
    // Determine color based on performance
    const performanceColor = performance >= 100 ? 'text-green-600' : 'text-amber-600';
    
    return (
      <div className="bg-white dark:bg-gray-800 p-4 border rounded-md shadow-lg">
        <h3 className="font-semibold text-sm border-b pb-1 mb-2">{metric}</h3>
        
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Actual:</span>
            <span className="font-medium">{formatPercent(actual / 100)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Target:</span>
            <span className="font-medium">{formatPercent(target / 100)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Performance:</span>
            <span className={`font-medium ${performanceColor}`}>
              {formatPercent(performance / 100)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Custom label component to show values at axis tips
const AxisLabel = (props: { 
  x: number; 
  y: number; 
  textAnchor: string; 
  stroke: string; 
  payload: RadarDataPoint; 
  value: string; 
  index: number; 
  cx: number; 
  cy: number; 
  data: RadarDataPoint[] 
}) => {
  const { x, y, textAnchor, stroke, payload, value, index, cx, cy, data } = props;
  
  // Find the data point for this axis
  const dataPoint = data.find((d: RadarDataPoint) => d.subject === payload.subject);
  if (!dataPoint) return null;
  
  // Calculate the position for the label (a bit further out from the axis end)
  const angle = (Math.PI / 2) - (index * 2 * Math.PI / data.length);
  const radius = Math.max(Math.abs(x - cx), Math.abs(y - cy)) + 15; // Add some padding
  const labelX = cx + radius * Math.cos(angle);
  const labelY = cy - radius * Math.sin(angle);
  
  // Format the value
  const formattedValue = formatPercent(dataPoint.Target / 100);
  
  return (
    <Text
      x={labelX}
      y={labelY}
      textAnchor={labelX > cx ? 'start' : labelX < cx ? 'end' : 'middle'}
      verticalAnchor={labelY > cy ? 'start' : labelY < cy ? 'end' : 'middle'}
      fill={dataColors.forecast}
      fontSize={10}
    >
      {formattedValue}
    </Text>
  );
};

const EnhancedRadarChart: React.FC<EnhancedRadarChartProps> = ({
  data,
  height = 350
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart 
        data={data}
        margin={{ top: 20, right: 30, left: 30, bottom: 20 }}
      >
        <PolarGrid gridType="polygon" stroke={dataColors.grid} />
        <PolarAngleAxis 
          dataKey="subject" 
          tick={{ fontSize: 11, fill: dataColors.forecast }}
          stroke={dataColors.grid}
        />
        <PolarRadiusAxis 
          angle={90} 
          domain={[0, 100]} 
          tickFormatter={(value: number) => `${value}%`}
          tick={{ fontSize: 10 }}
          stroke={dataColors.grid}
        />
        
        {/* Target radar */}
        <Radar
          name="Target"
          dataKey="Target"
          stroke={dataColors.forecast}
          fill={dataColors.forecast}
          fillOpacity={0.1}
          strokeWidth={1}
          strokeDasharray="5 5"
          dot={false}
        />
        
        {/* Actual radar */}
        <Radar
          name="Actual"
          dataKey="Actual"
          stroke={dataColors.actual}
          fill={dataColors.actual}
          fillOpacity={0.3}
          strokeWidth={2}
          dot={{ r: 4, strokeWidth: 1, fill: 'white' }}
          activeDot={{ r: 6, strokeWidth: 2 }}
        />
        
        <Tooltip content={CustomTooltip} />
        
        <Legend 
          verticalAlign="bottom" 
          height={36}
          iconType="circle"
          iconSize={10}
          wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};

export default EnhancedRadarChart;
