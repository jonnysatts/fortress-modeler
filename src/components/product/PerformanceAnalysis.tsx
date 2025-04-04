import React, { useState, useMemo } from 'react';
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
    if (!trendData || trendData.length === 0) return [];

    // Get the last 5 periods with actual data
    const periodsWithActuals = trendData
      .filter(period => period.revenueActual !== undefined)
      .slice(-5);

    return periodsWithActuals.map(period => ({
      subject: `${timeUnit} ${period.period}`,
      'Actual': (period.revenueActual || 0) / (period.revenueForecast || 1) * 100,
      'Target': 100,
      'Previous': 90, // Example value
    }));
  }, [trendData, timeUnit]);

  // Log trendData before rendering charts
  console.log("[PerfAnalysis Component] Trend Data for Charts:", trendData);

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
                    actual={revisedTotalRevenue}
                    forecast={totalRevenueForecast}
                    previousPeriod={totalRevenueForecast * 0.9} // Example previous period
                    target={totalRevenueForecast * 1.1} // Example target
                    trend={trendData.map(d => d.revenueActual || 0).filter(Boolean)}
                    isCurrency={true}
                />

                <PerformanceScorecard
                    title="Cost Management"
                    metric="cost"
                    actual={revisedTotalCost}
                    forecast={totalCostForecast}
                    previousPeriod={totalCostForecast * 1.1} // Example previous period
                    target={totalCostForecast * 0.9} // Example target
                    trend={trendData.map(d => d.costActual || 0).filter(Boolean)}
                    isCurrency={true}
                />

                <PerformanceScorecard
                    title="Profit Achievement"
                    metric="profit"
                    actual={revisedTotalProfit}
                    forecast={totalProfitForecast}
                    previousPeriod={totalProfitForecast * 0.8} // Example previous period
                    target={totalProfitForecast * 1.2} // Example target
                    trend={trendData.map(d => d.profitActual || 0).filter(Boolean)}
                    isCurrency={true}
                />
            </div>

            {/* Enhanced Variance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <VarianceCard
                    title="Total Revenue"
                    forecast={totalRevenueForecast}
                    actual={revisedTotalRevenue}
                    actualLabel="Revised Outlook"
                    trend={trendData.slice(-10).map(d => d.revenueActual || 0).filter(Boolean)}
                    description="Projected total revenue based on actuals"
                />
                 <VarianceCard
                    title="Total Costs"
                    forecast={totalCostForecast}
                    actual={revisedTotalCost}
                    actualLabel="Revised Outlook"
                    higherIsBad={true}
                    trend={trendData.slice(-10).map(d => d.costActual || 0).filter(Boolean)}
                    description="Projected total costs based on actuals"
                />
                 <VarianceCard
                    title="Total Profit"
                    forecast={totalProfitForecast}
                    actual={revisedTotalProfit}
                    actualLabel="Revised Outlook"
                    trend={trendData.slice(-10).map(d => d.profitActual || 0).filter(Boolean)}
                    description="Projected total profit based on actuals"
                />
                 <VarianceCard
                    title="Avg. Profit Margin"
                    forecast={avgProfitMarginForecast}
                    actual={revisedAvgProfitMargin}
                    actualLabel="Revised Outlook %"
                    isPercentage={true}
                    description="Average profit margin across all periods"
                />
                {isWeeklyEvent && (
                    <VarianceCard
                        title="Total Attendance"
                        forecast={totalAttendanceForecast}
                        actual={totalAttendanceActual}
                        actualLabel="Actual"
                        isUnits={true}
                        trend={trendData.slice(-10).map(d => d.attendanceActual || 0).filter(Boolean)}
                        description="Total attendance across all events"
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

            {/* View Mode Selector */}
            <div className="flex justify-end items-center mb-6">
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
                <RadarChart
                  data={radarData}
                  dataKeys={['Actual', 'Target', 'Previous']}
                  height={300}
                  isPercentage={true}
                  maxValue={120}
                />
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
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={dataColors.grid} />
                      <XAxis dataKey="point" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={val => val.toLocaleString()} tick={{ fontSize: 10 }}/>
                      <Tooltip content={renderEnhancedTooltip} />
                      <Legend />
                      <Bar
                        dataKey="attendanceForecast"
                        name="Forecast"
                        fill={dataColors.forecast}
                        fillOpacity={0.7}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="attendanceActual"
                        name="Actual"
                        fill={dataColors.attendance}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
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
