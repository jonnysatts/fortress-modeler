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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatPercent } from "@/lib/utils";
import { VarianceCard } from '@/components/ui/VarianceCard';
import { useForecastAnalysis } from '@/hooks/useForecastAnalysis';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ChartContainer from '@/components/common/ChartContainer';
import { TypographyH4, TypographyMuted } from '@/components/ui/typography';

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

  // Use the custom hook to get analysis data
  const { summary, trendData, isWeeklyEvent } = useForecastAnalysis(
    financialModels,
    actualsData,
    selectedModelId
  );

  if (financialModels.length === 0) {
     return <p className="text-muted-foreground">No product forecasts exist for this project to analyze performance against.</p>;
  }

  // Helper function for chart tooltips
  const ChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border px-2 py-1 rounded shadow-lg text-xs">
          <p className="font-semibold mb-1">{label}</p>
          {payload.map((pld: any, index: number) => {
              // Determine if the key is attendance-related
              const isAttendance = pld.dataKey === 'attendanceForecast' || pld.dataKey === 'attendanceActual';
              // Format value based on whether it's attendance or currency
              const formattedValue = isAttendance 
                  ? pld.value.toLocaleString() // Format as plain number with commas
                  : formatCurrency(pld.value); // Format as currency
              
              return (
                 <p key={index} style={{ color: pld.color }}>
                   {`${pld.name}: ${formattedValue}`}
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
                    <LineChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="point" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={val => formatCurrency(val)} tick={{ fontSize: 10 }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="revenueForecast" name="Forecast" stroke="#8884d8" strokeDasharray="5 5" dot={false} />
                      <Line type="monotone" dataKey="revenueActual" name="Actual" stroke="#82ca9d" dot={false}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {/* Cost Chart */}
                <div>
                  <TypographyH4 className="mb-2">Costs</TypographyH4>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="point" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={val => formatCurrency(val)} tick={{ fontSize: 10 }}/>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="costForecast" name="Forecast" stroke="#ff7300" strokeDasharray="5 5" dot={false} />
                      <Line type="monotone" dataKey="costActual" name="Actual" stroke="#ff0000" dot={false}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {/* Profit Chart */}
                <div>
                  <TypographyH4 className="mb-2">Profit</TypographyH4>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="point" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={val => formatCurrency(val)} tick={{ fontSize: 10 }}/>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="profitForecast" name="Forecast" stroke="#3b82f6" strokeDasharray="5 5" dot={false}/>
                      <Line type="monotone" dataKey="profitActual" name="Actual" stroke="#22c55e" dot={false}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {/* Attendance Chart */}
                {isWeeklyEvent && (
                  <div>
                    <TypographyH4 className="mb-2">Attendance</TypographyH4>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="point" tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={val => val.toLocaleString()} tick={{ fontSize: 10 }}/>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend />
                        <Line type="monotone" dataKey="attendanceForecast" name="Forecast" stroke="#9C27B0" strokeDasharray="5 5" dot={false} />
                        <Line type="monotone" dataKey="attendanceActual" name="Actual" stroke="#6366f1" dot={false}/>
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
