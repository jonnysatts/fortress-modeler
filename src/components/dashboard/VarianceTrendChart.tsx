import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
  ComposedChart
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle,
  Info,
  Activity,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VarianceTrend, VariancePoint, AnomalyPoint } from '@/services/VarianceTrendService';

interface VarianceTrendChartProps {
  varianceTrend: VarianceTrend;
  title?: string;
  showInsights?: boolean;
  height?: number;
}

export const VarianceTrendChart: React.FC<VarianceTrendChartProps> = ({
  varianceTrend,
  title,
  showInsights = true,
  height = 300
}) => {
  const getTrendIcon = () => {
    switch (varianceTrend.trendDirection) {
      case 'improving':
        return <TrendingDown className="h-4 w-4 text-green-600" />;
      case 'worsening':
        return <TrendingUp className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    switch (varianceTrend.trendDirection) {
      case 'improving':
        return 'text-green-600 bg-green-100';
      case 'worsening':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatChartData = () => {
    return varianceTrend.timeSeriesData.map(point => ({
      period: point.period,
      variance: Number(point.variance.toFixed(2)),
      isAnomaly: point.isAnomaly,
      riskLevel: point.riskLevel,
      actual: point.actual,
      projected: point.projected,
      // Add anomaly data for scatter overlay
      anomalyValue: point.isAnomaly ? point.variance : null
    }));
  };

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const variance = data.variance;
      const isAnomaly = data.isAnomaly;
      const anomaly = varianceTrend.anomalies.find(a => a.period === label);
      
      return (
        <div className="bg-white p-3 border rounded-lg shadow-md">
          <p className="font-medium">{label}</p>
          <p className={cn(
            "text-sm",
            variance >= 0 ? "text-green-600" : "text-red-600"
          )}>
            Variance: {variance >= 0 ? '+' : ''}{variance.toFixed(1)}%
          </p>
          {data.actual !== undefined && data.projected !== undefined && (
            <>
              <p className="text-xs text-gray-600">
                Actual: {typeof data.actual === 'number' ? data.actual.toLocaleString() : data.actual}
              </p>
              <p className="text-xs text-gray-600">
                Projected: {typeof data.projected === 'number' ? data.projected.toLocaleString() : data.projected}
              </p>
            </>
          )}
          {isAnomaly && anomaly && (
            <>
              <div className="mt-2 pt-2 border-t">
                <p className="text-xs font-medium text-amber-600">⚠️ Anomaly Detected</p>
                <p className="text-xs text-gray-600">
                  Severity: <span className="capitalize">{anomaly.severity}</span>
                </p>
                <p className="text-xs text-gray-600">
                  {anomaly.deviationFromNorm.toFixed(1)}σ from norm
                </p>
              </div>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  const getLineColor = () => {
    switch (varianceTrend.trendDirection) {
      case 'improving':
        return '#059669'; // green-600
      case 'worsening':
        return '#DC2626'; // red-600
      default:
        return '#6B7280'; // gray-500
    }
  };

  if (varianceTrend.timeSeriesData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-fortress-emerald" />
            {title || `${varianceTrend.metric} Variance Trend`}
          </CardTitle>
          <CardDescription>
            Variance analysis over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No variance data available. Add actual performance data to see trend analysis.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const chartData = formatChartData();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-fortress-emerald" />
          {title || `${varianceTrend.metric} Variance Trend`}
        </CardTitle>
        <CardDescription>
          Performance variance analysis over {varianceTrend.timeSeriesData.length} periods
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Trend Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Trend Direction</p>
              <div className="flex items-center gap-1">
                {getTrendIcon()}
                <Badge className={cn("text-xs", getTrendColor())}>
                  {varianceTrend.trendDirection}
                </Badge>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Average Variance</p>
              <p className={cn(
                "font-medium",
                varianceTrend.averageVariance >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {varianceTrend.averageVariance >= 0 ? '+' : ''}{varianceTrend.averageVariance.toFixed(1)}%
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Volatility</p>
              <p className={cn(
                "font-medium",
                varianceTrend.volatility > 20 ? "text-red-600" : 
                varianceTrend.volatility > 10 ? "text-yellow-600" : "text-green-600"
              )}>
                {varianceTrend.volatility.toFixed(1)}%
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Anomalies</p>
              <div className="flex items-center gap-1">
                {varianceTrend.anomalies.length > 0 && (
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                )}
                <span className="font-medium">{varianceTrend.anomalies.length}</span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 12 }}
                  stroke="#666"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#666"
                  label={{ value: 'Variance (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={customTooltip} />
                
                {/* Zero reference line */}
                <ReferenceLine y={0} stroke="#ccc" strokeDasharray="2 2" />
                
                {/* Main variance line */}
                <Line
                  type="monotone"
                  dataKey="variance"
                  stroke={getLineColor()}
                  strokeWidth={2}
                  dot={{ r: 4, fill: getLineColor() }}
                  activeDot={{ r: 6 }}
                />

                {/* Anomaly overlay */}
                <Scatter
                  dataKey="anomalyValue"
                  fill="#EF4444"
                  shape="circle"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Seasonal Pattern Info */}
          {varianceTrend.seasonalPattern?.detected && (
            <Alert>
              <Target className="h-4 w-4" />
              <AlertDescription>
                <strong>Seasonal pattern detected:</strong> {' '}
                {(varianceTrend.seasonalPattern.strength * 100).toFixed(0)}% strength seasonal variation.
                Consider incorporating seasonal adjustments into forecasting.
              </AlertDescription>
            </Alert>
          )}

          {/* Anomaly Details */}
          {showInsights && varianceTrend.anomalies.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Notable Anomalies</h4>
              <div className="space-y-2">
                {varianceTrend.anomalies.slice(0, 3).map((anomaly, index) => (
                  <div key={index} className="text-xs p-2 border rounded bg-amber-50">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{anomaly.period}</span>
                      <Badge className={cn(
                        "text-xs",
                        anomaly.severity === 'severe' ? 'bg-red-100 text-red-700' :
                        anomaly.severity === 'moderate' ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      )}>
                        {anomaly.severity}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">
                      {anomaly.variance >= 0 ? '+' : ''}{anomaly.variance.toFixed(1)}% variance
                      ({anomaly.deviationFromNorm.toFixed(1)}σ from normal)
                    </p>
                    {anomaly.potentialCauses.length > 0 && (
                      <p className="text-muted-foreground mt-1">
                        <strong>Potential cause:</strong> {anomaly.potentialCauses[0]}
                      </p>
                    )}
                  </div>
                ))}
                {varianceTrend.anomalies.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{varianceTrend.anomalies.length - 3} more anomalies detected
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Simplified version for dashboard overview
interface VarianceTrendSummaryProps {
  varianceTrends: VarianceTrend[];
  title?: string;
}

export const VarianceTrendSummary: React.FC<VarianceTrendSummaryProps> = ({
  varianceTrends,
  title = "Variance Trends"
}) => {
  const totalAnomalies = varianceTrends.reduce((sum, trend) => sum + trend.anomalies.length, 0);
  const worseningTrends = varianceTrends.filter(trend => trend.trendDirection === 'worsening').length;
  const avgVolatility = varianceTrends.length > 0 
    ? varianceTrends.reduce((sum, trend) => sum + trend.volatility, 0) / varianceTrends.length 
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Activity className="h-5 w-5 text-fortress-emerald" />
          {title}
        </CardTitle>
        <CardDescription>Portfolio variance analysis summary</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Worsening Trends</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{worseningTrends}</span>
              {worseningTrends > 0 && (
                <TrendingUp className="h-4 w-4 text-red-600" />
              )}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Anomalies</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{totalAnomalies}</span>
              {totalAnomalies > 0 && (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Avg Volatility</p>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-2xl font-bold",
                avgVolatility > 20 ? "text-red-600" : 
                avgVolatility > 10 ? "text-yellow-600" : "text-green-600"
              )}>
                {avgVolatility.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
        
        {varianceTrends.length === 0 && (
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              No variance trends available. Add actual performance data to projects to see variance analysis.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};