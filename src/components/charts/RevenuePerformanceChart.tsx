import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Label,
  Area,
  ComposedChart
} from 'recharts';
import { dataColors } from '@/lib/colors';
import { formatCurrency } from '@/lib/utils';
import type { AnalysisPeriodData } from '@/hooks/useForecastAnalysis';

interface RevenuePerformanceChartProps {
  data: AnalysisPeriodData[];
  viewMode: 'period' | 'cumulative' | 'projected';
  height?: number;
  animate?: boolean;
}

// Enhanced tooltip component
const EnhancedTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as AnalysisPeriodData;
    
    // Determine which data to show based on what's available in the payload
    const showForecast = payload.some((p: any) => 
      p.dataKey === 'revenueForecast' || p.dataKey === 'cumulativeRevenueForecast');
    const showActual = payload.some((p: any) => 
      p.dataKey === 'revenueActual' || p.dataKey === 'cumulativeRevenueActual');
    
    // Get the appropriate values based on the data keys
    const forecastValue = showForecast 
      ? (payload.find((p: any) => p.dataKey === 'revenueForecast' || p.dataKey === 'cumulativeRevenueForecast')?.value || 0) 
      : 0;
    
    const actualValue = showActual 
      ? (payload.find((p: any) => p.dataKey === 'revenueActual' || p.dataKey === 'cumulativeRevenueActual')?.value || null) 
      : null;
    
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
            <span className="font-medium">{formatCurrency(forecastValue)}</span>
          </div>
          
          {actualValue !== null && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Actual:</span>
              <span className="font-medium">{formatCurrency(actualValue)}</span>
            </div>
          )}
          
          {variance !== null && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Variance:</span>
                <span className={`font-medium ${varianceColor}`}>
                  {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
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

const RevenuePerformanceChart: React.FC<RevenuePerformanceChartProps> = ({
  data,
  viewMode,
  height = 350,
  animate = true
}) => {
  const [animationProgress, setAnimationProgress] = useState(0);
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Find breakeven point (where profit becomes positive)
  const breakevenPoint = data.findIndex(point => 
    (viewMode === 'cumulative' ? point.cumulativeProfitForecast : point.profitForecast) > 0
  );
  
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
  
  // Determine which data keys to use based on view mode
  const forecastKey = viewMode === 'cumulative' ? 'cumulativeRevenueForecast' : 'revenueForecast';
  const actualKey = viewMode === 'cumulative' ? 'cumulativeRevenueActual' : 'revenueActual';
  
  // Filter data for animation
  const animatedData = animate 
    ? data.slice(0, Math.ceil(data.length * animationProgress))
    : data;
  
  // Find the last period with actual data
  const lastActualPeriod = data.reduce((last, point, index) => {
    return point[actualKey] !== undefined ? index : last;
  }, -1);
  
  // Prepare projected data if in projected mode
  const projectedData = viewMode === 'projected' && lastActualPeriod >= 0
    ? data.map((point, index) => {
        if (index <= lastActualPeriod) return point;
        
        // Simple linear projection based on the last actual data point
        const lastActual = data[lastActualPeriod][actualKey];
        const lastForecast = data[lastActualPeriod][forecastKey];
        
        if (lastActual === undefined || lastForecast === 0) return point;
        
        const ratio = lastActual / lastForecast;
        const projectedValue = point[forecastKey] * ratio;
        
        return {
          ...point,
          projectedRevenue: projectedValue,
          cumulativeProjectedRevenue: viewMode === 'cumulative' ? projectedValue : undefined
        };
    })
    : data;
  
  // Determine if we should show the projection line
  const showProjection = viewMode === 'projected' && lastActualPeriod >= 0;
  const projectionKey = viewMode === 'cumulative' ? 'cumulativeProjectedRevenue' : 'projectedRevenue';
  
  return (
    <div ref={chartRef} className="w-full h-full">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart 
          data={showProjection ? projectedData : animatedData}
          margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={dataColors.grid} />
          <XAxis 
            dataKey="point" 
            tick={{ fontSize: 11 }}
            tickLine={{ stroke: dataColors.grid }}
            axisLine={{ stroke: dataColors.grid }}
          />
          <YAxis 
            tickFormatter={val => formatCurrency(val)} 
            tick={{ fontSize: 11 }}
            tickLine={{ stroke: dataColors.grid }}
            axisLine={{ stroke: dataColors.grid }}
            width={60}
          />
          <Tooltip content={<EnhancedTooltip />} />
          <Legend 
            verticalAlign="top" 
            height={36}
            iconType="line"
            iconSize={10}
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
          />
          
          {/* Breakeven reference line */}
          {breakevenPoint >= 0 && (
            <ReferenceLine 
              x={data[breakevenPoint].point} 
              stroke="#10B981" 
              strokeDasharray="3 3"
              label={
                <Label 
                  value="Breakeven" 
                  position="insideTopRight" 
                  fill="#10B981"
                  fontSize={10}
                />
              }
            />
          )}
          
          {/* Forecast line */}
          <Line
            type="monotone"
            dataKey={forecastKey}
            name="Forecast"
            stroke={dataColors.forecast}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 0 }}
            activeDot={{ r: 6, strokeWidth: 1 }}
            isAnimationActive={false}
          />
          
          {/* Actual line with area fill */}
          <Area
            type="monotone"
            dataKey={actualKey}
            name="Actual"
            stroke={dataColors.revenue}
            fill={dataColors.revenue}
            fillOpacity={0.1}
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 1 }}
            activeDot={{ r: 6, strokeWidth: 1 }}
            connectNulls
            isAnimationActive={false}
          />
          
          {/* Projection line (only shown in projected mode) */}
          {showProjection && (
            <Line
              type="monotone"
              dataKey={projectionKey}
              name="Projected"
              stroke="#F59E0B"
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={{ r: 0 }}
              activeDot={{ r: 6, strokeWidth: 1 }}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenuePerformanceChart;
