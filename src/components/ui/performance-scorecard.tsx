import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn, formatCurrency, formatPercent } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, TrendingDown } from 'lucide-react';
import { Sparkline } from '@/components/ui/sparkline';
import { dataColors } from '@/lib/colors';
import { Progress } from '@/components/ui/progress';

interface PerformanceScorecardProps {
  title: string;
  metric: 'revenue' | 'cost' | 'profit' | 'attendance' | string;
  actual: number;
  forecast?: number;
  target?: number;
  previousPeriod?: number;
  trend?: number[];
  className?: string;
  isCurrency?: boolean;
  isPercentage?: boolean;
}

const PerformanceScorecard: React.FC<PerformanceScorecardProps> = ({
  title,
  metric,
  actual,
  forecast,
  target,
  previousPeriod,
  trend,
  className,
  isCurrency = true,
  isPercentage = false,
}) => {
  // Format value based on type
  const formatValue = (value: number): string => {
    if (isPercentage) return formatPercent(value);
    if (isCurrency) return formatCurrency(value);
    return value.toLocaleString();
  };
  
  // Calculate variance against forecast
  const forecastVariance = forecast !== undefined 
    ? actual - forecast 
    : undefined;
  
  const forecastVariancePercent = forecast !== undefined && forecast !== 0
    ? ((actual - forecast) / Math.abs(forecast)) * 100
    : undefined;
  
  // Calculate variance against previous period
  const previousVariance = previousPeriod !== undefined 
    ? actual - previousPeriod 
    : undefined;
  
  const previousVariancePercent = previousPeriod !== undefined && previousPeriod !== 0
    ? ((actual - previousPeriod) / Math.abs(previousPeriod)) * 100
    : undefined;
  
  // Calculate progress against target
  const targetProgress = target !== undefined && target !== 0
    ? (actual / target) * 100
    : undefined;
  
  // Determine status colors
  const getForecastStatusColor = () => {
    if (forecastVariance === undefined) return dataColors.neutral;
    return forecastVariance >= 0 ? dataColors.positive : dataColors.negative;
  };
  
  const getPreviousStatusColor = () => {
    if (previousVariance === undefined) return dataColors.neutral;
    return previousVariance >= 0 ? dataColors.positive : dataColors.negative;
  };
  
  // Get metric color
  const getMetricColor = () => {
    switch (metric) {
      case 'revenue':
        return dataColors.revenue;
      case 'cost':
        return dataColors.cost;
      case 'profit':
        return dataColors.profit;
      case 'attendance':
        return dataColors.attendance;
      default:
        return dataColors.neutral;
    }
  };
  
  // Get appropriate icon based on status
  const getForecastStatusIcon = () => {
    if (forecastVariance === undefined) return <Minus className="w-4 h-4" style={{ color: dataColors.neutral }} />;
    return forecastVariance >= 0 
      ? <ArrowUpRight className="w-4 h-4" style={{ color: dataColors.positive }} />
      : <ArrowDownRight className="w-4 h-4" style={{ color: dataColors.negative }} />;
  };
  
  const getPreviousStatusIcon = () => {
    if (previousVariance === undefined) return <Minus className="w-4 h-4" style={{ color: dataColors.neutral }} />;
    return previousVariance >= 0 
      ? <TrendingUp className="w-4 h-4" style={{ color: dataColors.positive }} />
      : <TrendingDown className="w-4 h-4" style={{ color: dataColors.negative }} />;
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        {metric && <CardDescription>Performance metrics</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">Actual</p>
            <h3 className="text-2xl font-bold" style={{ color: getMetricColor() }}>
              {formatValue(actual)}
            </h3>
          </div>
          
          {trend && trend.length > 0 && (
            <div className="h-10 w-24">
              <Sparkline 
                data={trend} 
                color={getMetricColor()}
                height={40}
                width={100}
                fillOpacity={0.2}
                strokeWidth={1.5}
              />
            </div>
          )}
        </div>
        
        {forecast !== undefined && (
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">vs Forecast</p>
              <div className="flex items-center">
                {getForecastStatusIcon()}
                <span 
                  className="text-sm font-medium ml-1" 
                  style={{ color: getForecastStatusColor() }}
                >
                  {forecastVariance !== undefined && (forecastVariance > 0 ? '+' : '')}
                  {forecastVariance !== undefined ? formatValue(forecastVariance) : 'N/A'}
                  {forecastVariancePercent !== undefined && ` (${formatPercent(forecastVariancePercent)})`}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Forecast: {formatValue(forecast)}</span>
            </div>
          </div>
        )}
        
        {previousPeriod !== undefined && (
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">vs Previous</p>
              <div className="flex items-center">
                {getPreviousStatusIcon()}
                <span 
                  className="text-sm font-medium ml-1" 
                  style={{ color: getPreviousStatusColor() }}
                >
                  {previousVariance !== undefined && (previousVariance > 0 ? '+' : '')}
                  {previousVariance !== undefined ? formatValue(previousVariance) : 'N/A'}
                  {previousVariancePercent !== undefined && ` (${formatPercent(previousVariancePercent)})`}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Previous: {formatValue(previousPeriod)}</span>
            </div>
          </div>
        )}
        
        {target !== undefined && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Target Progress</p>
              <span className="text-sm font-medium">
                {targetProgress !== undefined ? formatPercent(targetProgress) : 'N/A'}
              </span>
            </div>
            <Progress 
              value={targetProgress} 
              className="h-2" 
              indicatorClassName={cn(
                targetProgress && targetProgress >= 100 
                  ? "bg-emerald-500" 
                  : targetProgress && targetProgress >= 75 
                  ? "bg-amber-500" 
                  : "bg-red-500"
              )} 
            />
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Target: {formatValue(target)}</span>
              <span className="text-muted-foreground">
                {target !== undefined && actual !== undefined 
                  ? `${formatValue(target - actual)} remaining`
                  : 'N/A'
                }
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PerformanceScorecard;
