import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  Cell,
  TooltipProps
} from 'recharts';
import { dataColors } from '@/lib/colors';
import type { AnalysisPeriodData } from '@/hooks/useForecastAnalysis';

interface AttendanceTrackingChartProps {
  data: AnalysisPeriodData[];
  viewMode: 'period' | 'cumulative' | 'projected';
  height?: number;
  animate?: boolean;
}

interface AttendanceDataPoint {
  week: number;
  actual: number;
  forecast: number;
  [key: string]: number;
}

// Enhanced tooltip component
const EnhancedTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as AttendanceDataPoint;
    
    // Determine which data to show based on what's available in the payload
    const forecastValue = data.attendanceForecast || 0;
    const actualValue = data.attendanceActual !== undefined ? data.attendanceActual : null;
    
    // Calculate variance if both values are available
    const variance = actualValue !== null ? actualValue - forecastValue : null;
    const variancePercent = variance !== null && forecastValue !== 0 
      ? (variance / forecastValue) * 100 
      : null;
    
    // Determine color for variance
    const varianceColor = variance === null 
      ? 'text-gray-500' 
      : variance >= 0 
        ? 'text-green-600' 
        : 'text-red-600';

    return (
      <div className="bg-white dark:bg-gray-800 p-4 border rounded-md shadow-lg min-w-[200px]">
        <h3 className="font-semibold text-sm border-b pb-1 mb-2">{label}</h3>
        
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Forecast:</span>
            <span className="font-medium">{forecastValue.toLocaleString()}</span>
          </div>
          
          {actualValue !== null && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Actual:</span>
              <span className="font-medium">{actualValue.toLocaleString()}</span>
            </div>
          )}
          
          {variance !== null && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Variance:</span>
                <span className={`font-medium ${varianceColor}`}>
                  {variance >= 0 ? '+' : ''}{variance.toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Variance %:</span>
                <span className={`font-medium ${varianceColor}`}>
                  {variancePercent !== null ? (
                    `${variancePercent >= 0 ? '+' : ''}${variancePercent.toFixed(1)}%`
                  ) : '-'}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
  return null;
};

// Custom label for variance percentage
type VarianceLabelData = AttendanceDataPoint | AnalysisPeriodData;

function isAttendanceDataPoint(obj: any): obj is AttendanceDataPoint {
  return (
    typeof obj.week === 'number' &&
    typeof obj.actual === 'number' &&
    typeof obj.forecast === 'number'
  );
}

const VarianceLabel = (props: { x: number; y: number; width: number; height: number; value: number; index: number; data: VarianceLabelData[] }) => {
  const { x, y, width, height, value, index, data } = props;
  
  if (value === undefined || value === null) return null;
  
  const item = data[index];
  const forecast = isAttendanceDataPoint(item) ? item.forecast : item.attendanceForecast || 0;
  const actual = isAttendanceDataPoint(item) ? item.actual : item.attendanceActual;
  
  if (actual === undefined || forecast === 0) return null;
  
  const variance = actual - forecast;
  const variancePercent = (variance / forecast) * 100;
  
  // Only show label if there's a significant variance
  if (Math.abs(variancePercent) < 5) return null;
  
  const formattedValue = `${variancePercent >= 0 ? '+' : ''}${variancePercent.toFixed(0)}%`;
  const color = variancePercent >= 0 ? '#10B981' : '#EF4444';
  
  return (
    <g>
      <text
        x={x + width / 2}
        y={y - 10}
        fill={color}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={10}
        fontWeight="bold"
      >
        {formattedValue}
      </text>
    </g>
  );
};

// Fix: Ensure VarianceLabel is only called with all required props
// If you are using <LabelList data={...} content={VarianceLabel} />, ensure you pass all required props or use a wrapper

// Example wrapper for LabelList usage:
const VarianceLabelWrapper = (props: any) => {
  // Only render VarianceLabel if all required props are present
  if (
    props.x !== undefined &&
    props.y !== undefined &&
    props.width !== undefined &&
    props.height !== undefined &&
    props.value !== undefined &&
    props.index !== undefined &&
    props.data !== undefined
  ) {
    return <VarianceLabel {...props} />;
  }
  return null;
};

const AttendanceTrackingChart: React.FC<AttendanceTrackingChartProps> = ({
  data,
  viewMode,
  height = 350,
  animate = true
}) => {
  const [animationProgress, setAnimationProgress] = useState(0);
  
  // Animation effect
  useEffect(() => {
    if (animate) {
      setAnimationProgress(0);
      const duration = 1000; // Animation duration in ms
      const interval = 16; // Update interval in ms (roughly 60fps)
      const steps = duration / interval;
      let step = 0;
      
      const timer = setInterval(() => {
        step += 1;
        setAnimationProgress(Math.min(step / steps, 1));
        
        if (step >= steps) {
          clearInterval(timer);
        }
      }, interval);
      
      return () => clearInterval(timer);
    } else {
      setAnimationProgress(1);
    }
  }, [animate, data, viewMode]);
  
  // Filter data for animation
  const animatedData = animate 
    ? data.slice(0, Math.ceil(data.length * animationProgress))
    : data;
  
  // Filter data to only include periods with attendance data
  const filteredData = animatedData.filter(point => 
    point.attendanceForecast !== undefined || point.attendanceActual !== undefined
  );
  
  // If no attendance data, show a message
  if (filteredData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <p className="text-gray-500">No attendance data available</p>
      </div>
    );
  }
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={filteredData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={dataColors.grid} />
        <XAxis 
          dataKey="point" 
          tick={{ fontSize: 11 }}
          tickLine={{ stroke: dataColors.grid }}
          axisLine={{ stroke: dataColors.grid }}
        />
        <YAxis 
          tickFormatter={val => val.toLocaleString()} 
          tick={{ fontSize: 11 }}
          tickLine={{ stroke: dataColors.grid }}
          axisLine={{ stroke: dataColors.grid }}
          width={60}
        />
        <Tooltip content={<EnhancedTooltip />} />
        <Legend 
          verticalAlign="top" 
          height={36}
          iconType="square"
          iconSize={10}
          wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
        />
        
        {/* Forecast bars */}
        <Bar 
          dataKey="attendanceForecast" 
          name="Forecast" 
          fill={dataColors.neutral[400]}
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        />
        
        {/* Actual bars with variance labels */}
        <Bar 
          dataKey="attendanceActual" 
          name="Actual" 
          fill={dataColors.attendance}
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        >
          <LabelList 
            dataKey="attendanceActual" 
            content={<VarianceLabelWrapper data={filteredData} />} 
            position="top"
          />
          
          {/* Color cells based on performance */}
          {filteredData.map((entry, index) => {
            const forecast = entry.attendanceForecast || 0;
            const actual = entry.attendanceActual;
            
            if (actual === undefined || forecast === 0) {
              return <Cell key={`cell-${index}`} fill={dataColors.attendance} />;
            }
            
            const variance = actual - forecast;
            return (
              <Cell 
                key={`cell-${index}`} 
                fill={variance >= 0 ? dataColors.attendance : '#A78BFA'} // Lighter purple if underperforming
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default AttendanceTrackingChart;
