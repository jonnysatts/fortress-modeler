import React, { useState } from 'react';
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatCurrency, formatPercent } from "@/lib/utils";
import { VarianceCard } from '@/components/ui/VarianceCard';
import { useForecastAnalysis } from '@/hooks/useForecastAnalysis';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ChartContainer from '@/components/common/ChartContainer';
import { TypographyH4, TypographyMuted } from '@/components/ui/typography';
// Import tooltip types
import { TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
// Import the interface used by the hook
import type { AnalysisPeriodData } from '@/hooks/useForecastAnalysis';

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

  // Helper function for chart tooltips with proper types
  const ChartTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => { 
    if (active && payload && payload.length) {
      // Get the full data point for this period from the payload
      const periodData = payload[0].payload as AnalysisPeriodData; 

      return (
        <div className="bg-background border px-2 py-1 rounded shadow-lg text-xs">
          <p className="font-semibold mb-1">{label}</p>
          {payload.map((pld, index) => {
              if (pld.value === undefined || pld.value === null || !pld.name) return null; 
              
              const nameString = pld.name.toString(); // Convert name to string
              const dataKeyString = pld.dataKey?.toString() || ""; // Convert dataKey to string safely
              
              const isAttendance = dataKeyString.includes('attendance');
              const isActual = dataKeyString.includes('Actual');
              const isForecast = dataKeyString.includes('Forecast');
              const formattedValue = isAttendance 
                  ? (pld.value as number).toLocaleString() 
                  : formatCurrency(pld.value as number); 
              
              let variancePercent: number | undefined;
              if (isActual || isForecast) {
                  // Use nameString for includes check
                  if (nameString.includes('Revenue')) variancePercent = periodData.revenueVariancePercent;
                  else if (nameString.includes('Cost')) variancePercent = periodData.costVariancePercent;
                  else if (nameString.includes('Profit')) variancePercent = periodData.profitVariancePercent;
              }

              return (
                 <p key={index} style={{ color: pld.color }}>
                   {`${nameString}: ${formattedValue}`}
                   {isActual && variancePercent !== undefined && (
                       <span className={`ml-2 text-xs ${variancePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {/* Use formatPercent with one argument */}
                           ({variancePercent >= 0 ? '+' : ''}{formatPercent(variancePercent / 100)})
                       </span>
                   )}
                 </p>
              );
          })}
        </div>
      );
    }
    return null;
  };

  // Destructure summary safely
  const {
    totalRevenueForecast = 0,
    totalCostForecast = 0,
    totalProfitForecast = 0,
    revisedTotalRevenue = 0,
    revisedTotalCost = 0,
    revisedTotalProfit = 0,
    totalRevenueVariance = 0,
    totalCostVariance = 0,
    totalProfitVariance = 0,
    avgProfitMarginForecast = 0,
    revisedAvgProfitMargin = 0,
    latestActualPeriod = 0,
    timeUnit = 'Period', // Default timeUnit
    totalAttendanceForecast = 0,
    totalAttendanceActual = 0,
    totalAttendanceVariance = 0,
  } = summary || {};

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
            {/* --- Use VarianceCard with Updated Labels/Values --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <VarianceCard 
                    title="Total Revenue" 
                    forecast={totalRevenueForecast} 
                    actual={revisedTotalRevenue} 
                    actualLabel="Revised Outlook" // Set custom label
                />
                 <VarianceCard 
                    title="Total Costs" 
                    forecast={totalCostForecast} 
                    actual={revisedTotalCost} 
                    actualLabel="Revised Outlook"
                    higherIsBad={true}
                />
                 <VarianceCard 
                    title="Total Profit" 
                    forecast={totalProfitForecast} 
                    actual={revisedTotalProfit}
                    actualLabel="Revised Outlook"
                />
                 <VarianceCard 
                    title="Avg. Profit Margin" 
                    forecast={avgProfitMarginForecast} 
                    actual={revisedAvgProfitMargin} 
                    actualLabel="Revised Outlook %" // Specific label for margin
                    isPercentage={true}
                />
                {isWeeklyEvent && (
                    <VarianceCard 
                        title="Total Attendance" 
                        forecast={totalAttendanceForecast} 
                        actual={totalAttendanceActual}
                        actualLabel="Actual"
                        isUnits={true}
                    />
                )}
            </div>
            <TypographyMuted className="text-right">
                * Actuals calculated up to {timeUnit} {latestActualPeriod}
            </TypographyMuted>

            {/* --- Variance Trend Charts --- */}
            <ChartContainer
              title="Forecast vs. Actual Trends"
              height={600}
            >
              <div className="space-y-8">
                {/* Revenue Chart */}
                <div>
                  <TypographyH4 className="mb-2">Revenue</TypographyH4>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="point" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={val => formatCurrency(val)} tick={{ fontSize: 10 }} domain={['auto', 'auto']}/>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend />
                      <Line type="natural" dataKey={viewMode === 'cumulative' ? "cumulativeRevenueForecast" : "revenueForecast"} name="Forecast" stroke="#8884d8" strokeWidth={2} dot={false} />
                      <Line type="natural" dataKey={viewMode === 'cumulative' ? "cumulativeRevenueActual" : "revenueActual"} name="Actual" stroke="#82ca9d" strokeWidth={2} dot={{ r: 3 }} connectNulls/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {/* Cost Chart */}
                <div>
                  <TypographyH4 className="mb-2">Costs</TypographyH4>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="point" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={val => formatCurrency(val)} tick={{ fontSize: 10 }} domain={['auto', 'auto']}/>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend />
                      <Line type="natural" dataKey={viewMode === 'cumulative' ? "cumulativeCostForecast" : "costForecast"} name="Forecast" stroke="#ff7300" strokeWidth={2} dot={false} />
                      <Line type="natural" dataKey={viewMode === 'cumulative' ? "cumulativeCostActual" : "costActual"} name="Actual" stroke="#ff0000" strokeWidth={2} dot={{ r: 3 }} connectNulls/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {/* Profit Chart */}
                <div>
                  <TypographyH4 className="mb-2">Profit</TypographyH4>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="point" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={val => formatCurrency(val)} tick={{ fontSize: 10 }} domain={['auto', 'auto']}/>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend />
                      <ReferenceLine y={0} stroke="#b0b0b0" strokeDasharray="2 2"/>
                      <Line type="natural" dataKey={viewMode === 'cumulative' ? "cumulativeProfitForecast" : "profitForecast"} name="Forecast" stroke="#3b82f6" strokeWidth={2} dot={false}/>
                      <Line type="natural" dataKey={viewMode === 'cumulative' ? "cumulativeProfitActual" : "profitActual"} name="Actual" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} connectNulls/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {/* Attendance Chart */}
                {isWeeklyEvent && viewMode === 'weekly' && (
                  <div>
                    <TypographyH4 className="mb-2">Attendance</TypographyH4>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="point" tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={val => val.toLocaleString()} tick={{ fontSize: 10 }}/>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend />
                        <Line type="natural" dataKey="attendanceForecast" name="Forecast" stroke="#9C27B0" strokeWidth={2} dot={false} />
                        <Line type="natural" dataKey="attendanceActual" name="Actual" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} connectNulls/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </ChartContainer>

            {/* TODO: Add Category Variance Breakdown Table */}
         </>
      )}
    </div>
  );
};
