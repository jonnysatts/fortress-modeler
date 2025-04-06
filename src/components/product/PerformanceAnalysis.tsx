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
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ChartContainer from '@/components/common/ChartContainer';
import { TypographyH4, TypographyMuted } from '@/components/ui/typography';
import { TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import type { AnalysisPeriodData, AnalysisSummary } from '@/hooks/useForecastAnalysis';
import { useForecastAnalysis } from '@/hooks/useForecastAnalysis';
import { SimpleVarianceCard } from './SimpleVarianceCard';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileJson, FileSpreadsheet, FileText } from "lucide-react";

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

import useStore from '@/store/useStore'; // Import useStore
// Import the shared type
import type { ExportDataType } from '@/store/useStore';

interface PerformanceAnalysisProps {
  financialModels: FinancialModel[];
  actualsData: ActualsPeriodEntry[];
  projectId: string | undefined;
}

// Updated Tooltip to show variance vs Period Forecast
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as AnalysisPeriodData; // Access the data point
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border rounded shadow-lg text-xs">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((entry: any, index: number) => {
          let valueText = formatCurrency(entry.value);
          let varianceText = '';
          let varianceColor = 'text-muted-foreground';

          // Determine forecast value for comparison
          let forecastValue: number | undefined;
          if(entry.name === 'Actual Revenue') forecastValue = data.revenueForecast;
          else if (entry.name === 'Actual Costs') forecastValue = data.costForecast;
          else if (entry.name === 'Actual Profit') forecastValue = data.profitForecast;
          // Add attendance if needed

          // Calculate variance if actual and forecast exist
          if (entry.value !== undefined && forecastValue !== undefined) {
              const variance = entry.value - forecastValue;
              const variancePercent = forecastValue !== 0 ? (variance / forecastValue) * 100 : 0;
              varianceText = ` (${variance >= 0 ? '+' : ''}${formatCurrency(variance)}, ${variancePercent.toFixed(1)}%)`;
              varianceColor = variance >= 0 ? 'text-green-600' : 'text-red-600';
              // Special case for costs: positive variance is bad
              if (entry.name === 'Actual Costs') {
                  varianceColor = variance > 0 ? 'text-red-600' : 'text-green-600';
              }
          }

          return (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {`${entry.name}: ${valueText}`}
              {varianceText && <span className={`ml-1 ${varianceColor}`}>{varianceText}</span>}
            </p>
          )
        })}
      </div>
    );
  }
  return null;
};

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

  // Get store actions
  const { registerExportFunction, unregisterExportFunction } = useStore(
    (state) => ({ 
      registerExportFunction: state.registerExportFunction, 
      unregisterExportFunction: state.unregisterExportFunction 
    })
  );

  useEffect(() => {
    setIsDark(resolvedTheme === 'dark' || theme === 'dark');
  }, [theme, resolvedTheme]);

  const { summary, trendData, isWeeklyEvent, selectedModel } = useForecastAnalysis(
    financialModels,
    actualsData,
    selectedModelId
  );

  // Function to gather data for export
  const getDataForExport = (): ExportDataType => {
      if (!summary || !selectedModel) {
          console.error("Cannot export, data not ready.");
          return { error: "Data not available" };
      }
      return {
          reportType: 'Performance Analysis',
          generatedAt: new Date().toISOString(),
          projectName: selectedModel.name, 
          modelName: selectedModel.name,
          summaryMetrics: summary,
          trendData: trendData,
          assumptions: selectedModel.assumptions,
      };
  };

  // Register and unregister the export function
  useEffect(() => {
    // Only register if data is available
    if (summary && selectedModel) {
      const key = 'Performance Analysis'; 
      registerExportFunction(key, getDataForExport);
      
      // Cleanup function to unregister
      return () => {
        unregisterExportFunction(key);
      };
    }
    // No cleanup needed if never registered
    return undefined; 
  // Depend on summary and selectedModel availability
  }, [summary, selectedModel, registerExportFunction, unregisterExportFunction]); 

  // --- Add explicit check for summary before proceeding --- 
  useEffect(() => {
    if(summary) {
      console.log('[PerformanceAnalysis] Received summary. Actual Total Attendance:', summary.actualTotalAttendance);
    }
  }, [summary]);

  // Show loading/pending state if summary is not yet calculated
  if (!summary) {
     // Keep ONLY the loading message if no model selector needed
     return (
        <div className="space-y-6">
           <p className="text-muted-foreground">Calculating analysis...</p>
        </div>
     );
  }
  // --- If summary exists, proceed with destructuring --- 
  const {
    periodSpecificRevenueForecast = 0,
    periodSpecificCostForecast = 0,
    periodSpecificProfitForecast = 0,
    periodSpecificProfitMargin = 0,
    periodSpecificAttendanceForecast = 0,
    actualTotalRevenue = 0,
    actualTotalCost = 0,
    actualTotalProfit = 0,
    actualAvgProfitMargin = 0,
    actualTotalAttendance = 0, // Default re-added
    latestActualPeriod = 0,
    timeUnit = 'Period',
    totalRevenueForecast = 0, 
    totalCostForecast = 0,    
    totalProfitForecast = 0,   
    avgProfitMarginForecast = 0, 
    totalAttendanceForecast = 0, 
  } = summary; // Destructure from validated summary

  // --- Calculations (can now safely use destructured values) --- 
  const revenueVarianceSummary = actualTotalRevenue - periodSpecificRevenueForecast;
  const profitMarginActualPercent = actualTotalRevenue > 0 ? (actualTotalProfit / actualTotalRevenue) * 100 : 0;
  const attendanceVarianceSummary = actualTotalAttendance - (periodSpecificAttendanceForecast ?? 0);
  const revenueVariancePercentSummary = periodSpecificRevenueForecast !== 0 ? (revenueVarianceSummary / periodSpecificRevenueForecast) * 100 : 0;
  const attendanceVariancePercent = (periodSpecificAttendanceForecast ?? 0) !== 0 ? (attendanceVarianceSummary / (periodSpecificAttendanceForecast ?? 1)) * 100 : 0;

  const overallStatus = useMemo(() => {
      const profitVariancePercent = periodSpecificProfitForecast !== 0 ? (actualTotalProfit - periodSpecificProfitForecast) / periodSpecificProfitForecast * 100 : 0;
      if (Math.abs(profitVariancePercent) <= 15) return { text: 'On Track', color: 'blue' };
      if (profitVariancePercent > 15) return { text: 'Exceeding', color: 'green' };
      return { text: 'At Risk', color: 'red' };
  }, [summary, actualTotalProfit, periodSpecificProfitForecast]);

  const overallStatusColorMap: { [key: string]: string } = {
      green: 'bg-green-100 text-green-800 border-green-300',
      red: 'bg-red-100 text-red-800 border-red-300',
      blue: 'bg-blue-100 text-blue-800 border-blue-300',
      gray: 'bg-gray-100 text-gray-800 border-gray-300',
  };

  const renderEnhancedTooltip = CustomTooltip; 

  const radarData = useMemo(() => {
    const targetValue = 100;
    return [
      {
        subject: 'Revenue',
        'Actual': periodSpecificRevenueForecast > 0 ? (actualTotalRevenue / periodSpecificRevenueForecast) * 100 : 0,
        'Target': targetValue,
      },
      {
        subject: 'Cost Eff.', 
        'Actual': periodSpecificCostForecast > 0 ? (2 - (actualTotalCost / periodSpecificCostForecast)) * 100 : 0, 
        'Target': targetValue,
      },
      {
        subject: 'Profit',
        'Actual': periodSpecificProfitForecast > 0 ? (actualTotalProfit / periodSpecificProfitForecast) * 100 : 0,
        'Target': targetValue,
      },
       {
        subject: 'Margin', 
        'Actual': periodSpecificProfitMargin > 0 ? (actualAvgProfitMargin / periodSpecificProfitMargin) * 100 : 0,
        'Target': targetValue,
      },
      {
        subject: 'Attend.', 
        'Actual': isWeeklyEvent && (periodSpecificAttendanceForecast ?? 0) > 0 ? 
          (actualTotalAttendance / (periodSpecificAttendanceForecast ?? 1)) * 100 : 0,
        'Target': targetValue,
      }
    ].filter(item => !isNaN(item.Actual) && item.Actual !== 0);
  }, [summary, isWeeklyEvent, 
      actualTotalRevenue, periodSpecificRevenueForecast, 
      actualTotalCost, periodSpecificCostForecast,
      actualTotalProfit, periodSpecificProfitForecast,
      actualAvgProfitMargin, periodSpecificProfitMargin,
      actualTotalAttendance, periodSpecificAttendanceForecast
  ]);

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
      {/* === Header Section === */}
       <div className="mb-6">
         {/* Summary Sentence */}
         {summary && (
             <p className="text-lg text-muted-foreground">
                 {`As of ${timeUnit} ${latestActualPeriod}, revenue is `}
                 <span className={cn(revenueVarianceSummary >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold")}>
                     {`${revenueVarianceSummary >= 0 ? 'over' : 'under'} forecast by ${formatCurrency(Math.abs(revenueVarianceSummary))} (${revenueVariancePercentSummary.toFixed(1)}%)`}
                 </span>
                 {`, profit margin is `}
                 <span className="font-semibold">{`${formatPercent(profitMarginActualPercent)}`}</span>
                 {isWeeklyEvent && `, and attendance is `}
                 {isWeeklyEvent && 
                    <span className={cn(attendanceVariancePercent >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold")}>
                        {`${attendanceVariancePercent >= 0 ? 'above' : 'below'} target by ${formatPercent(Math.abs(attendanceVariancePercent))}`}
                   </span>
                 }
                 {`.`}
             </p>
         )}
         {!summary && <p className="text-muted-foreground">Calculating analysis...</p>}
      </div>

      {/* === Rest of the component (only renders if summary exists) === */}
      {summary && (
         <>
           {/* === Overall Status Row === */}
           <div className="flex items-center space-x-4 mb-6 p-4 border rounded-lg bg-card">
              {/* Prominent Status Badge */}
             <span className={cn(
                 `px-4 py-1.5 rounded-full text-sm font-bold border-2 shadow-sm`,
                 overallStatusColorMap[overallStatus.color]
             )}>
               Status: {overallStatus.text}
             </span>
             {/* Explicit Progress Bar Label */}
             <div className="flex-grow flex items-center space-x-2">
               <Label className="text-sm font-medium text-muted-foreground">Overall Target Progress:</Label>
               {/* TODO: Calculate actual progress based on a primary goal (e.g., profit) */}
               <Progress value={13.6} className="w-[200px] h-2.5" /> 
               <span className="text-sm font-semibold">13.6%</span>{/* Placeholder */}
             </div>
           </div>

           {/* === KPI Metric Cards (Use Period Specific Forecast) === */}
           <div className="space-y-6">
             <div>
               <TypographyH4 className="mb-3 text-base font-semibold">Revenue & Profit</TypographyH4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <PerformanceScorecard 
                     title="Revenue Performance (vs Forecast-to-Date)" 
                     metric="revenue" 
                     actual={actualTotalRevenue} 
                     forecast={periodSpecificRevenueForecast}
                     target={periodSpecificRevenueForecast * 1.05}
                     trend={trendData.filter(d => d.revenueActual !== undefined).map(d => d.revenueActual! || 0).slice(-6)}
                     isCurrency={true} 
                 />
                 <PerformanceScorecard 
                     title="Profit Achievement (vs Forecast-to-Date)" 
                     metric="profit" 
                     actual={actualTotalProfit} 
                     forecast={periodSpecificProfitForecast}
                     target={periodSpecificProfitForecast * 1.1}
                     trend={trendData.filter(d => d.profitActual !== undefined).map(d => d.profitActual! || 0).slice(-6)}
                     isCurrency={true} 
                 />
               </div>
             </div>
             <div>
               <TypographyH4 className="mb-3 text-base font-semibold">Costs & Attendance</TypographyH4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <PerformanceScorecard 
                    title="Cost Management (vs Forecast-to-Date)" 
                    metric="cost" 
                    actual={actualTotalCost} 
                    forecast={periodSpecificCostForecast}
                    target={periodSpecificCostForecast * 0.95}
                    trend={trendData.filter(d => d.costActual !== undefined).map(d => d.costActual! || 0).slice(-6)} 
                    isCurrency={true} 
                    higherIsBad={true}
                 />
                 {isWeeklyEvent && (
                     <PerformanceScorecard
                         title="Attendance Tracking (vs Forecast-to-Date)"
                         metric="attendance"
                         actual={actualTotalAttendance}
                         forecast={periodSpecificAttendanceForecast}
                         target={periodSpecificAttendanceForecast}
                         trend={trendData.filter(d => d.attendanceActual !== undefined).map(d => d.attendanceActual! || 0).slice(-6)}
                         isCurrency={false}
                     />
                 )}
               </div>
             </div>
           </div>
           
           {/* === Graph Section === */}
           <div> 
              {/* Tabs: Period/Cumulative/Projected */}
              <div className="mb-4 flex justify-center">
                  {/* Re-style these buttons later */}
                  <Tabs value={comparisonMode} onValueChange={(value) => setComparisonMode(value as any)} className="w-auto">
                      <TabsList>
                          <TabsTrigger value="period">Period to Period</TabsTrigger>
                          <TabsTrigger value="cumulative">Cumulative</TabsTrigger>
                          <TabsTrigger value="projected">Projected Outcome</TabsTrigger>
                      </TabsList>
                  </Tabs>
              </div>
              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                 {/* Revenue Performance Chart (With view toggle) */}
                 <ChartContainer title="Revenue Performance" description="Forecast vs. Actual Revenue" height={350} allowDownload={true} allowExpand={true} downloadData={trendData} downloadFilename="revenue-performance.csv">
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
                  {/* Profit Performance Chart (With view toggle) */}
                  <ChartContainer title="Profit Performance" description="Forecast vs. Actual Profit" height={350} allowDownload={true} allowExpand={true} downloadData={trendData} downloadFilename="profit-performance.csv">
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
               {/* Advanced Visualizations */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Radar Chart (Removed 'Previous' key) */}
                   <ChartContainer title="Performance Radar" description="Multi-dimensional performance view" height={350} allowDownload={true} downloadData={radarData} downloadFilename="performance-radar.csv">
                      {radarData && radarData.length > 0 ? (
                         <div className="flex flex-col justify-center items-center h-full">
                            <RadarChart data={radarData} dataKeys={['Actual', 'Target']} height={300} isPercentage={true} maxValue={120} />
                            <p className="text-xs text-muted-foreground mt-2 text-center px-4">Visualises multi-dimensional performance across revenue, cost efficiency, profit, margin, and attendance. Actual vs Target.</p>
                         </div>
                       ) : ( <div className="flex justify-center items-center h-full"><p className="text-muted-foreground">No data available for radar</p></div> )}
                   </ChartContainer>
                    {/* Attendance Chart */}
                   {isWeeklyEvent ? (
                       <ChartContainer title="Attendance Tracking" description="Forecast vs. Actual Attendance" height={350} allowDownload={true} downloadData={trendData} downloadFilename="attendance-data.csv">
                           {trendData && trendData.length > 0 ? (
                               <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                     <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                     <XAxis dataKey="point" tick={{ fontSize: 10 }} />
                                     <YAxis tickFormatter={val => val.toLocaleString()} tick={{ fontSize: 10 }}/>
                                     <Tooltip content={renderEnhancedTooltip} />
                                     <Legend />
                                     <Bar dataKey="attendanceForecast" name="Forecast" fill={dataColors.neutral[300]} radius={[4, 4, 0, 0]} barSize={20} />
                                     <Bar dataKey="attendanceActual" name="Actual" fill={dataColors.attendance} radius={[4, 4, 0, 0]} barSize={20} />
                                  </BarChart>
                               </ResponsiveContainer>
                           ) : (
                               <div className="flex justify-center items-center h-full">
                                   <p className="text-muted-foreground">No attendance data available</p>
                               </div>
                           )}
                       </ChartContainer>
                   ) : (
                       <ChartContainer title="Cost Breakdown" description="Cost distribution by category" height={350} allowDownload={true}>
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
           </div>

           {/* Placeholder for original SimpleVarianceCards if needed later */}
           {/* 
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" key={`variance-cards-${refreshKey}-${comparisonMode}`}>
             <SimpleVarianceCard ... /> 
             </div>
           */}

         </>
      )}
    </div>
  );
};
