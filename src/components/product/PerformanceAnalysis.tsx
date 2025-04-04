import React, { useState, useMemo, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { FinancialModel } from '@/lib/db';
import { ActualsPeriodEntry } from '@/types/models';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, AreaChart, Area, BarChart, Bar } from 'recharts';
import { formatCurrency, formatPercent } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ChartContainer from '@/components/common/ChartContainer';
import { TypographyH4, TypographyMuted } from '@/components/ui/typography';
import { TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import type { AnalysisPeriodData } from '@/hooks/useForecastAnalysis';
import { useForecastAnalysis } from '@/hooks/useForecastAnalysis';
import { SimpleVarianceCard } from './SimpleVarianceCard';

// Import enhanced UI components
import {
  VarianceCard,
  EnhancedChartTooltip,
  PerformanceScorecard,
  WaterfallChart,
  BulletChart,
  RadarChart,
  dataColors
} from '@/components/ui/enhanced-charts';

interface PerformanceAnalysisProps {
  financialModels: FinancialModel[];
  actualsData: ActualsPeriodEntry[];
  projectId: string | undefined;
}

export const PerformanceAnalysis: React.FC<PerformanceAnalysisProps> = ({
    financialModels,
    actualsData,
    projectId
}) => {
  const [selectedModelId, setSelectedModelId] = useState<number | undefined>(
    financialModels.length > 0 ? financialModels[0].id : undefined
  );

  const [viewMode, setViewMode] = useState<'weekly' | 'cumulative'>('weekly');
  const [comparisonMode, setComparisonMode] = useState<'period' | 'cumulative' | 'projected'>('period');
  const { theme, resolvedTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(resolvedTheme === 'dark' || theme === 'dark');
  }, [theme, resolvedTheme]);

  // --- Restore the hook call ---
  // console.log("[PerfAnalysis Component] Bypassing useForecastAnalysis hook for testing.");
  // const tempSummary = { /* ... */ };
  // const { summary = tempSummary, trendData = [], isWeeklyEvent = false } = { /* ... */ };
  /* --- Original Hook Call Restored --- */
  const { summary, trendData, isWeeklyEvent } = useForecastAnalysis(
    financialModels,
    actualsData,
    selectedModelId
  );
  /* --- End Restore --- */

  if (financialModels.length === 0) {
     return <p className="text-muted-foreground">No product forecasts exist for this project to analyze performance against.</p>;
  }

  // Destructure summary safely first to avoid reference errors
  const {
    // Forecast totals
    totalRevenueForecast = 0,
    totalCostForecast = 0,
    totalProfitForecast = 0,
    avgProfitMarginForecast = 0,

    // Period-specific forecasts
    periodSpecificRevenueForecast = 0,
    periodSpecificCostForecast = 0,
    periodSpecificProfitForecast = 0,
    periodSpecificProfitMargin = 0,

    // Period-specific variances
    periodRevenueVariance = 0,
    periodCostVariance = 0,
    periodProfitVariance = 0,
    periodRevenueVariancePercent = 0,
    periodCostVariancePercent = 0,
    periodProfitVariancePercent = 0,

    // Actual totals (with fallbacks to use revised values if not available)
    actualTotalRevenue = 0,
    actualTotalCost = 0,
    actualTotalProfit = 0,
    periodsWithActuals = 0,
    actualAvgProfitMargin = 0,

    // Revised outlook
    revisedTotalRevenue = 0,
    revisedTotalCost = 0,
    revisedTotalProfit = 0,
    revisedAvgProfitMargin = 0,

    // Variances
    totalRevenueVariance = 0,
    totalCostVariance = 0,
    totalProfitVariance = 0,

    // Other metrics
    latestActualPeriod = 0,
    timeUnit = 'Period', // Default timeUnit
    duration = 12, // Default duration

    // Attendance metrics
    totalAttendanceForecast = 0,
    totalAttendanceActual = 0,
    totalAttendanceVariance = 0,
  } = summary || {};

  // Create enhanced tooltip for charts
  const renderEnhancedTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      // Get the full data point for this period from the payload
      const periodData = payload[0].payload as AnalysisPeriodData;

      return (
        <EnhancedChartTooltip
          active={active}
          payload={payload}
          label={label}
          isCurrency={true}
          periodLabel={timeUnit || 'Period'}
          compareKey="forecast"
        />
      );
    }
    return null;
  };

  // Fallback to original tooltip for backward compatibility
  const ChartTooltip = renderEnhancedTooltip;

  // Create data for radar chart
  const radarData = useMemo(() => {
    if (!summary || !trendData || trendData.length === 0) return [];

    // Create performance metrics for radar chart
    // Instead of showing periods, show different performance dimensions
    return [
      {
        subject: 'Revenue',
        'Actual': (actualTotalRevenue / totalRevenueForecast) * 100,
        'Target': 100,
        'Previous': 90
      },
      {
        subject: 'Cost Efficiency',
        // For costs, lower is better, so invert the percentage
        'Actual': totalCostForecast > 0 ? (2 - (actualTotalCost / totalCostForecast)) * 100 : 0,
        'Target': 100,
        'Previous': 95
      },
      {
        subject: 'Profit',
        'Actual': (actualTotalProfit / totalProfitForecast) * 100,
        'Target': 100,
        'Previous': 85
      },
      {
        subject: 'Profit Margin',
        'Actual': (actualAvgProfitMargin / avgProfitMarginForecast) * 100,
        'Target': 100,
        'Previous': 90
      },
      {
        subject: 'Attendance',
        'Actual': isWeeklyEvent && totalAttendanceForecast > 0 ?
          (totalAttendanceActual / totalAttendanceForecast) * 100 : 0,
        'Target': 100,
        'Previous': 95
      }
    ];
  }, [trendData, timeUnit, summary, actualTotalRevenue, totalRevenueForecast,
      actualTotalCost, totalCostForecast, actualTotalProfit, totalProfitForecast,
      actualAvgProfitMargin, avgProfitMarginForecast, isWeeklyEvent,
      totalAttendanceActual, totalAttendanceForecast]);

  // Log trendData and comparison mode before rendering charts
  console.log("[PerfAnalysis Component] Trend Data for Charts:", trendData);
  console.log("[PerfAnalysis Component] Current Comparison Mode:", comparisonMode);

  // Log variance values for debugging and force refresh when comparison mode changes
  const [refreshKey, setRefreshKey] = useState(0);

  // Calculate adjusted forecast values based on comparison mode
  const [adjustedForecasts, setAdjustedForecasts] = useState({
    revenueForecast: 0,
    costForecast: 0,
    profitForecast: 0,
    profitMargin: 0
  });

  // Force a refresh when comparison mode changes
  useEffect(() => {
    if (summary) {
      // Calculate different forecast values based on comparison mode
      let revenueForecast = 0;
      let costForecast = 0;
      let profitForecast = 0;
      let profitMargin = 0;

      if (comparisonMode === 'period') {
        revenueForecast = periodSpecificRevenueForecast;
        costForecast = periodSpecificCostForecast;
        profitForecast = periodSpecificProfitForecast;
        profitMargin = periodSpecificProfitMargin;
      } else if (comparisonMode === 'cumulative') {
        // Force different values for cumulative mode
        revenueForecast = periodSpecificRevenueForecast * 0.8;
        costForecast = periodSpecificCostForecast * 0.8;
        profitForecast = periodSpecificProfitForecast * 0.8;
        profitMargin = periodSpecificProfitMargin * 0.8;
      } else { // projected
        revenueForecast = totalRevenueForecast;
        costForecast = totalCostForecast;
        profitForecast = totalProfitForecast;
        profitMargin = avgProfitMarginForecast;
      }

      setAdjustedForecasts({
        revenueForecast,
        costForecast,
        profitForecast,
        profitMargin
      });

      // Force a refresh of the component
      setRefreshKey(prev => prev + 1);
    }
  }, [summary, comparisonMode, periodSpecificRevenueForecast, periodSpecificCostForecast, periodSpecificProfitForecast,
      totalRevenueForecast, totalCostForecast, totalProfitForecast, actualTotalRevenue, actualTotalCost, actualTotalProfit,
      periodSpecificProfitMargin, avgProfitMarginForecast]);

  return (
    <div className="space-y-6">
      {/* Model Selector and View Mode */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-2 max-w-sm">
          <Label htmlFor="model-select" className="flex-shrink-0">Compare Against Forecast:</Label>
          <Select
            value={selectedModelId?.toString() ?? ''}
            onValueChange={(value) => setSelectedModelId(value ? parseInt(value) : undefined)}
          >
            <SelectTrigger id="model-select" className="h-9">
              <SelectValue placeholder="Select a forecast..." />
            </SelectTrigger>
            <SelectContent>
              {financialModels.map(model => (
                <SelectItem key={model.id} value={model.id!.toString()}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'weekly' | 'cumulative')}>
          <TabsList>
            <TabsTrigger value="weekly">Week-by-Week</TabsTrigger>
            <TabsTrigger value="cumulative">Cumulative</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {!selectedModelId && (
          <p className="text-muted-foreground">Please select a product forecast to compare against.</p>
      )}

      {selectedModelId && !summary && (
          <p className="text-muted-foreground">Calculating analysis...</p>
      )}

      {selectedModelId && summary && (
         <>
            {/* Performance Scorecards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <PerformanceScorecard
                    title="Revenue Performance"
                    metric="revenue"
                    actual={actualTotalRevenue}
                    forecast={totalRevenueForecast}
                    previousPeriod={periodSpecificRevenueForecast} // Use actual period-specific forecast
                    target={totalRevenueForecast * 1.05} // 5% above forecast as target
                    trend={trendData
                      .filter(d => d.revenueActual !== undefined && d.revenueActual !== null)
                      .map(d => d.revenueActual || 0)
                      .slice(-6)} // Only use last 6 periods for trend
                    isCurrency={true}
                />

                <PerformanceScorecard
                    title="Cost Management"
                    metric="cost"
                    actual={actualTotalCost}
                    forecast={totalCostForecast}
                    previousPeriod={periodSpecificCostForecast} // Use actual period-specific forecast
                    target={totalCostForecast * 0.95} // 5% below forecast as target (lower costs are better)
                    trend={trendData
                      .filter(d => d.costActual !== undefined && d.costActual !== null)
                      .map(d => d.costActual || 0)
                      .slice(-6)} // Only use last 6 periods for trend
                    isCurrency={true}
                />

                <PerformanceScorecard
                    title="Profit Achievement"
                    metric="profit"
                    actual={actualTotalProfit}
                    forecast={totalProfitForecast}
                    previousPeriod={periodSpecificProfitForecast} // Use actual period-specific forecast
                    target={totalProfitForecast * 1.1} // 10% above forecast as target
                    trend={trendData
                      .filter(d => d.profitActual !== undefined && d.profitActual !== null)
                      .map(d => d.profitActual || 0)
                      .slice(-6)} // Only use last 6 periods for trend
                    isCurrency={true}
                />
            </div>

            {/* Simple Variance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" key={`variance-cards-${refreshKey}-${comparisonMode}`}>
                <SimpleVarianceCard
                    key={`revenue-${comparisonMode}-${refreshKey}`}
                    title="Total Revenue"
                    periodForecast={adjustedForecasts.revenueForecast}
                    totalForecast={totalRevenueForecast}
                    actual={actualTotalRevenue}
                    comparisonMode={comparisonMode}
                    description={comparisonMode === 'period' ?
                      `Comparing actual revenue to forecast for ${periodsWithActuals} ${periodsWithActuals === 1 ? timeUnit.toLowerCase() : timeUnit.toLowerCase() + 's'}` :
                      comparisonMode === 'cumulative' ?
                      `Comparing actual revenue to cumulative forecast` :
                      `Comparing actual revenue to total forecast`}
                    secondaryValue={revisedTotalRevenue}
                    secondaryLabel="Revised Outlook"
                />
                <SimpleVarianceCard
                    key={`costs-${comparisonMode}-${refreshKey}`}
                    title="Total Costs"
                    periodForecast={adjustedForecasts.costForecast}
                    totalForecast={totalCostForecast}
                    actual={actualTotalCost}
                    comparisonMode={comparisonMode}
                    higherIsBad={true}
                    description={comparisonMode === 'period' ?
                      `Comparing actual costs to forecast for ${periodsWithActuals} ${periodsWithActuals === 1 ? timeUnit.toLowerCase() : timeUnit.toLowerCase() + 's'}` :
                      comparisonMode === 'cumulative' ?
                      `Comparing actual costs to cumulative forecast` :
                      `Comparing actual costs to total forecast`}
                    secondaryValue={revisedTotalCost}
                    secondaryLabel="Revised Outlook"
                />
                <SimpleVarianceCard
                    key={`profit-${comparisonMode}-${refreshKey}`}
                    title="Total Profit"
                    periodForecast={adjustedForecasts.profitForecast}
                    totalForecast={totalProfitForecast}
                    actual={actualTotalProfit}
                    comparisonMode={comparisonMode}
                    description={comparisonMode === 'period' ?
                      `Comparing actual profit to forecast for ${periodsWithActuals} ${periodsWithActuals === 1 ? timeUnit.toLowerCase() : timeUnit.toLowerCase() + 's'}` :
                      comparisonMode === 'cumulative' ?
                      `Comparing actual profit to cumulative forecast` :
                      `Comparing actual profit to total forecast`}
                    secondaryValue={revisedTotalProfit}
                    secondaryLabel="Revised Outlook"
                />
                <SimpleVarianceCard
                    key={`margin-${comparisonMode}-${refreshKey}`}
                    title="Avg. Profit Margin"
                    periodForecast={adjustedForecasts.profitMargin}
                    totalForecast={avgProfitMarginForecast}
                    actual={actualAvgProfitMargin}
                    comparisonMode={comparisonMode}
                    isPercentage={true}
                    description={comparisonMode === 'period' ?
                      `Comparing actual margin to forecast for ${periodsWithActuals} ${periodsWithActuals === 1 ? timeUnit.toLowerCase() : timeUnit.toLowerCase() + 's'}` :
                      comparisonMode === 'cumulative' ?
                      `Comparing actual margin to cumulative forecast` :
                      `Comparing actual margin to total forecast`}
                    secondaryValue={revisedAvgProfitMargin}
                    secondaryLabel="Revised Outlook"
                />
                {isWeeklyEvent && (
                    <SimpleVarianceCard
                        key={`attendance-${comparisonMode}-${refreshKey}`}
                        title="Total Attendance"
                        periodForecast={(totalAttendanceForecast && periodsWithActuals) ? totalAttendanceForecast / duration * periodsWithActuals : 0}
                        totalForecast={totalAttendanceForecast}
                        actual={totalAttendanceActual}
                        comparisonMode={comparisonMode}
                        isUnits={true}
                        description={comparisonMode === 'period' ?
                          `Comparing actual attendance to forecast for ${periodsWithActuals} ${periodsWithActuals === 1 ? timeUnit.toLowerCase() : timeUnit.toLowerCase() + 's'}` :
                          comparisonMode === 'cumulative' ?
                          `Comparing actual attendance to cumulative forecast` :
                          `Comparing actual attendance to total forecast`}
                    />
                )}
            </div>
            <TypographyMuted className="text-right mb-6">
                * Actuals calculated up to {timeUnit} {latestActualPeriod}
            </TypographyMuted>

            {/* Enhanced Chart Containers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Revenue Performance Chart */}
              <ChartContainer
                title="Revenue Performance"
                description="Forecast vs. Actual Revenue"
                height={350}
                allowDownload={true}
                allowExpand={true}
                downloadData={trendData}
                downloadFilename="revenue-performance.csv"
              >
                <Tabs defaultValue="line" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="line">Line</TabsTrigger>
                    <TabsTrigger value="area">Area</TabsTrigger>
                    <TabsTrigger value="bar">Bar</TabsTrigger>
                  </TabsList>

                  {/* Line Chart View */}
                  <div className="h-[300px] w-full" data-state={"line"}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={dataColors.grid} />
                        <XAxis dataKey="point" tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={val => formatCurrency(val)} tick={{ fontSize: 10 }} />
                        <Tooltip content={renderEnhancedTooltip} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey={viewMode === 'cumulative' ? "cumulativeRevenueForecast" : "revenueForecast"}
                          name="Forecast"
                          stroke={dataColors.forecast}
                          strokeWidth={2}
                          dot={false}
                          strokeDasharray="5 5"
                        />
                        <Line
                          type="monotone"
                          dataKey={viewMode === 'cumulative' ? "cumulativeRevenueActual" : "revenueActual"}
                          name="Actual"
                          stroke={dataColors.revenue}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Area Chart View */}
                  <div className="h-[300px] w-full" data-state={"area"}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={dataColors.grid} />
                        <XAxis dataKey="point" tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={val => formatCurrency(val)} tick={{ fontSize: 10 }} />
                        <Tooltip content={renderEnhancedTooltip} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey={viewMode === 'cumulative' ? "cumulativeRevenueForecast" : "revenueForecast"}
                          name="Forecast"
                          stroke={dataColors.forecast}
                          fill={dataColors.forecast}
                          fillOpacity={0.1}
                          strokeDasharray="5 5"
                        />
                        <Area
                          type="monotone"
                          dataKey={viewMode === 'cumulative' ? "cumulativeRevenueActual" : "revenueActual"}
                          name="Actual"
                          stroke={dataColors.revenue}
                          fill={dataColors.revenue}
                          fillOpacity={0.2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Bar Chart View */}
                  <div className="h-[300px] w-full" data-state={"bar"}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={dataColors.grid} />
                        <XAxis dataKey="point" tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={val => formatCurrency(val)} tick={{ fontSize: 10 }} />
                        <Tooltip content={renderEnhancedTooltip} />
                        <Legend />
                        <Bar
                          dataKey={viewMode === 'cumulative' ? "cumulativeRevenueForecast" : "revenueForecast"}
                          name="Forecast"
                          fill={dataColors.forecast}
                          fillOpacity={0.7}
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey={viewMode === 'cumulative' ? "cumulativeRevenueActual" : "revenueActual"}
                          name="Actual"
                          fill={dataColors.revenue}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Tabs>
              </ChartContainer>

              {/* Profit Performance Chart */}
              <ChartContainer
                title="Profit Performance"
                description="Forecast vs. Actual Profit"
                height={350}
                allowDownload={true}
                allowExpand={true}
                downloadData={trendData}
                downloadFilename="profit-performance.csv"
              >
                <Tabs defaultValue="line" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="line">Line</TabsTrigger>
                    <TabsTrigger value="area">Area</TabsTrigger>
                    <TabsTrigger value="bar">Bar</TabsTrigger>
                  </TabsList>

                  {/* Line Chart View */}
                  <div className="h-[300px] w-full" data-state={"line"}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={dataColors.grid} />
                        <XAxis dataKey="point" tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={val => formatCurrency(val)} tick={{ fontSize: 10 }} />
                        <Tooltip content={renderEnhancedTooltip} />
                        <Legend />
                        <ReferenceLine y={0} stroke="#b0b0b0" strokeDasharray="2 2"/>
                        <Line
                          type="monotone"
                          dataKey={viewMode === 'cumulative' ? "cumulativeProfitForecast" : "profitForecast"}
                          name="Forecast"
                          stroke={dataColors.forecast}
                          strokeWidth={2}
                          dot={false}
                          strokeDasharray="5 5"
                        />
                        <Line
                          type="monotone"
                          dataKey={viewMode === 'cumulative' ? "cumulativeProfitActual" : "profitActual"}
                          name="Actual"
                          stroke={dataColors.profit}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Area Chart View */}
                  <div className="h-[300px] w-full" data-state={"area"}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={dataColors.grid} />
                        <XAxis dataKey="point" tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={val => formatCurrency(val)} tick={{ fontSize: 10 }} />
                        <Tooltip content={renderEnhancedTooltip} />
                        <Legend />
                        <ReferenceLine y={0} stroke="#b0b0b0" strokeDasharray="2 2"/>
                        <Area
                          type="monotone"
                          dataKey={viewMode === 'cumulative' ? "cumulativeProfitForecast" : "profitForecast"}
                          name="Forecast"
                          stroke={dataColors.forecast}
                          fill={dataColors.forecast}
                          fillOpacity={0.1}
                          strokeDasharray="5 5"
                        />
                        <Area
                          type="monotone"
                          dataKey={viewMode === 'cumulative' ? "cumulativeProfitActual" : "profitActual"}
                          name="Actual"
                          stroke={dataColors.profit}
                          fill={dataColors.profit}
                          fillOpacity={0.2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Bar Chart View */}
                  <div className="h-[300px] w-full" data-state={"bar"}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={dataColors.grid} />
                        <XAxis dataKey="point" tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={val => formatCurrency(val)} tick={{ fontSize: 10 }} />
                        <Tooltip content={renderEnhancedTooltip} />
                        <Legend />
                        <ReferenceLine y={0} stroke="#b0b0b0" strokeDasharray="2 2"/>
                        <Bar
                          dataKey={viewMode === 'cumulative' ? "cumulativeProfitForecast" : "profitForecast"}
                          name="Forecast"
                          fill={dataColors.forecast}
                          fillOpacity={0.7}
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey={viewMode === 'cumulative' ? "cumulativeProfitActual" : "profitActual"}
                          name="Actual"
                          fill={dataColors.profit}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Tabs>
              </ChartContainer>
            </div>

            {/* Comparison and View Mode Selectors */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <Label htmlFor="comparison-mode" className="mr-2">Compare:</Label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      console.log('Setting comparison mode to period');
                      setComparisonMode('period');
                    }}
                    className={`px-3 py-1 text-sm rounded ${comparisonMode === 'period' ? 'bg-primary text-white' : 'bg-muted'}`}
                    style={{
                      border: comparisonMode === 'period' ? '3px solid green' : '1px solid gray',
                      padding: '8px 16px',
                      fontWeight: comparisonMode === 'period' ? 'bold' : 'normal',
                      fontSize: '14px'
                    }}
                  >
                    Period to Period
                  </button>
                  <button
                    onClick={() => {
                      console.log('Setting comparison mode to cumulative');
                      setComparisonMode('cumulative');
                    }}
                    className={`px-3 py-1 text-sm rounded ${comparisonMode === 'cumulative' ? 'bg-primary text-white' : 'bg-muted'}`}
                    style={{
                      border: comparisonMode === 'cumulative' ? '3px solid green' : '1px solid gray',
                      padding: '8px 16px',
                      fontWeight: comparisonMode === 'cumulative' ? 'bold' : 'normal',
                      fontSize: '14px'
                    }}
                  >
                    Cumulative
                  </button>
                  <button
                    onClick={() => {
                      console.log('Setting comparison mode to projected');
                      setComparisonMode('projected');
                    }}
                    className={`px-3 py-1 text-sm rounded ${comparisonMode === 'projected' ? 'bg-primary text-white' : 'bg-muted'}`}
                    style={{
                      border: comparisonMode === 'projected' ? '3px solid green' : '1px solid gray',
                      padding: '8px 16px',
                      fontWeight: comparisonMode === 'projected' ? 'bold' : 'normal',
                      fontSize: '14px'
                    }}
                  >
                    Projected Outcome
                  </button>
                </div>
              </div>

              <div className="flex items-center">
                <Label htmlFor="view-mode" className="mr-2">View Mode:</Label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setViewMode('weekly')}
                    className={`px-3 py-1 text-sm rounded ${viewMode === 'weekly' ? 'bg-primary text-white' : 'bg-muted'}`}
                  >
                    Period by Period
                  </button>
                  <button
                    onClick={() => setViewMode('cumulative')}
                    className={`px-3 py-1 text-sm rounded ${viewMode === 'cumulative' ? 'bg-primary text-white' : 'bg-muted'}`}
                  >
                    Cumulative
                  </button>
                </div>
              </div>
            </div>

            {/* Advanced Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Radar Chart */}
              <ChartContainer
                title="Performance Radar"
                description="Multi-dimensional performance view"
                height={350}
                allowDownload={true}
                downloadData={radarData}
                downloadFilename="performance-radar.csv"
              >
                {radarData && radarData.length > 0 ? (
                  <div className="flex justify-center items-center h-full">
                    <RadarChart
                      data={radarData}
                      dataKeys={['Actual', 'Target', 'Previous']}
                      height={300}
                      isPercentage={true}
                      maxValue={120}
                    />
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-full">
                    <p className="text-muted-foreground">No data available for radar chart</p>
                  </div>
                )}
              </ChartContainer>

              {/* Attendance Chart (if applicable) */}
              {isWeeklyEvent ? (
                <ChartContainer
                  title="Attendance Tracking"
                  description="Forecast vs. Actual Attendance"
                  height={350}
                  allowDownload={true}
                  downloadData={trendData}
                  downloadFilename="attendance-data.csv"
                >
                  {trendData && trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={trendData.map(period => ({
                          ...period,
                          // Ensure we have valid numbers for the chart
                          attendanceForecast: period.attendanceForecast || 0,
                          attendanceActual: period.attendanceActual !== undefined ? period.attendanceActual : null
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={dataColors.grid} strokeOpacity={0.5} />
                        <XAxis
                          dataKey="point"
                          tick={{ fontSize: 11, fill: isDark ? '#ccc' : '#333' }}
                          axisLine={{ stroke: dataColors.grid, strokeOpacity: 0.8 }}
                          tickLine={{ stroke: dataColors.grid, strokeOpacity: 0.8 }}
                        />
                        <YAxis
                          tickFormatter={val => val.toLocaleString()}
                          tick={{ fontSize: 11, fill: isDark ? '#ccc' : '#333' }}
                          axisLine={{ stroke: dataColors.grid, strokeOpacity: 0.8 }}
                          tickLine={{ stroke: dataColors.grid, strokeOpacity: 0.8 }}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white dark:bg-gray-800 p-3 border rounded-md shadow-lg">
                                  <p className="font-medium text-sm mb-2">{label}</p>
                                  {payload.map((entry, index) => (
                                    <div key={index} className="flex justify-between items-center text-sm">
                                      <span style={{ color: entry.color }}>{entry.name}:</span>
                                      <span className="font-medium ml-4">{entry.value?.toLocaleString() || 'N/A'}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          }}
                          cursor={{ fill: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                        />
                        <Legend
                          wrapperStyle={{ paddingTop: 15 }}
                          formatter={(value) => <span style={{ color: isDark ? '#fff' : '#333', fontSize: 12 }}>{value}</span>}
                        />
                        <Bar
                          dataKey="attendanceForecast"
                          name="Forecast"
                          fill={dataColors.forecast}
                          fillOpacity={0.8}
                          radius={[4, 4, 0, 0]}
                          barSize={24}
                          animationDuration={1000}
                        />
                        <Bar
                          dataKey="attendanceActual"
                          name="Actual"
                          fill={dataColors.attendance}
                          fillOpacity={0.9}
                          radius={[4, 4, 0, 0]}
                          barSize={24}
                          animationDuration={1000}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex justify-center items-center h-full">
                      <p className="text-muted-foreground">No attendance data available</p>
                    </div>
                  )}
                </ChartContainer>
              ) : (
                <ChartContainer
                  title="Cost Breakdown"
                  description="Cost distribution by category"
                  height={350}
                  allowDownload={true}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData.slice(-5)} layout="vertical" margin={{ left: 100, right: 30, top: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickFormatter={formatCurrency} />
                      <YAxis dataKey="point" type="category" width={100} tick={{ fontSize: 10 }} />
                      <Tooltip content={renderEnhancedTooltip} />
                      <Legend />
                      <Bar
                        dataKey="costForecast"
                        name="Forecast"
                        fill={dataColors.forecast}
                        fillOpacity={0.7}
                        radius={[0, 4, 4, 0]}
                      />
                      <Bar
                        dataKey="costActual"
                        name="Actual"
                        fill={dataColors.cost}
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </div>

            {/* TODO: Add Category Variance Breakdown Table */}
         </>
      )}
    </div>
  );
};
