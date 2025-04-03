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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatPercent } from "@/lib/utils";
import { VarianceCard } from '@/components/ui/VarianceCard';

interface PerformanceAnalysisProps {
  financialModels: FinancialModel[];
  actualsData: ActualsPeriodEntry[];
  projectId: string | undefined;
}

// Interface for the combined analysis data for a period
interface AnalysisPeriodData {
  period: number;
  point: string; // e.g., "Week 1"
  revenueForecast: number;
  costForecast: number;
  profitForecast: number;
  revenueActual?: number;
  costActual?: number;
  profitActual?: number;
  revenueVariance?: number;
  costVariance?: number;
  profitVariance?: number;
  revenueVariancePercent?: number;
  costVariancePercent?: number;
  profitVariancePercent?: number;
  attendanceForecast?: number;
  attendanceActual?: number;
  attendanceVariance?: number;
}

// Interface for the summary KPIs
interface AnalysisSummary {
  totalRevenueForecast: number;
  totalCostForecast: number;
  totalProfitForecast: number;
  revisedTotalRevenue: number;
  revisedTotalCost: number;
  revisedTotalProfit: number;
  totalRevenueVariance: number;
  totalCostVariance: number;
  totalProfitVariance: number;
  avgProfitMarginForecast: number;
  revisedAvgProfitMargin: number;
  latestActualPeriod: number;
  timeUnit: 'Week' | 'Month';
  totalAttendanceForecast: number;
  totalAttendanceActual: number;
  totalAttendanceVariance: number;
}

export const PerformanceAnalysis: React.FC<PerformanceAnalysisProps> = ({ 
    financialModels, 
    actualsData, 
    projectId 
}) => {

  const [selectedModelId, setSelectedModelId] = useState<number | undefined>(
    financialModels.length > 0 ? financialModels[0].id : undefined
  );

  // Find the selected model object
  const selectedModel = useMemo(() => {
    return financialModels.find(m => m.id === selectedModelId);
  }, [selectedModelId, financialModels]);

  // Calculate combined forecast, actuals, and variance data
  const analysisData = useMemo(() => {
    if (!selectedModel?.assumptions) return null;
    
    console.log(`[PerformanceAnalysis] Calculating for Model ID: ${selectedModelId}`);
    
    const { assumptions } = selectedModel;
    const metadata = assumptions.metadata;
    const isWeekly = metadata?.type === "WeeklyEvent";
    const duration = isWeekly ? metadata?.weeks || 12 : 12;
    const timeUnit = isWeekly ? "Week" : "Month";

    const revenueStreams = assumptions.revenue || [];
    const costs = assumptions.costs || [];
    const marketingSetup = assumptions.marketing || { allocationMode: 'channels', channels: [] };

    const periodicAnalysisData: AnalysisPeriodData[] = [];
    const actualsMap = new Map(actualsData.map(a => [a.period, a]));
    let latestActualPeriod = 0;

    let cumulativeRevenueForecast = 0;
    let cumulativeCostForecast = 0;
    let cumulativeRevenueActual = 0;
    let cumulativeCostActual = 0;
    let cumulativeAttendanceForecast = 0;
    let cumulativeAttendanceActual = 0;

    // --- Run Forecast Simulation & Merge Actuals Period-by-Period ---
    for (let period = 1; period <= duration; period++) {
      const point = `${timeUnit} ${period}`;
      
      // --- Forecast Calculations (similar to ModelOverview) ---
      let currentAttendance = metadata?.initialWeeklyAttendance || 0;
      if (isWeekly && period > 1 && metadata?.growth) {
         const rate = (metadata.growth.attendanceGrowthRate || 0) / 100;
         currentAttendance = (metadata.initialWeeklyAttendance || 0) * Math.pow(1 + rate, period - 1);
      }

      let periodRevenueForecast = 0;
      // ... (Calculate periodRevenueForecast based on assumptions) ...
      revenueStreams.forEach(stream => {
          let streamRevenue = 0;
          const baseValue = stream.value;
          if (isWeekly && metadata) {
             if (stream.name === "F&B Sales") { let spend = metadata.perCustomer?.fbSpend || 0; if (period > 1 && metadata.growth?.useCustomerSpendGrowth) { spend *= Math.pow(1 + (metadata.growth.fbSpendGrowth || 0) / 100, period - 1); } streamRevenue = currentAttendance * spend; } 
             else if (stream.name === "Merchandise Sales") { let spend = metadata.perCustomer?.merchandiseSpend || 0; if (period > 1 && metadata.growth?.useCustomerSpendGrowth) { spend *= Math.pow(1 + (metadata.growth.merchandiseSpendGrowth || 0) / 100, period - 1); } streamRevenue = currentAttendance * spend; } 
             else { streamRevenue = baseValue; if (period > 1 && metadata.growth?.useCustomerSpendGrowth) { let growthRate = 0; switch(stream.name) { case "Ticket Sales": growthRate = (metadata.growth.ticketPriceGrowth || 0) / 100; break; case "Online Sales": growthRate = (metadata.growth.onlineSpendGrowth || 0) / 100; break; case "Miscellaneous Revenue": growthRate = (metadata.growth.miscSpendGrowth || 0) / 100; break; } streamRevenue *= Math.pow(1 + growthRate, period - 1); } }
          } else { streamRevenue = baseValue; if (period > 1 && assumptions.growthModel) { const { type, rate } = assumptions.growthModel; if (type === "linear") streamRevenue = baseValue * (1 + rate * (period - 1)); else streamRevenue = baseValue * Math.pow(1 + rate, period - 1); } }
          periodRevenueForecast += streamRevenue;
      });

      let periodCostForecast = 0;
      // ... (Calculate periodCostForecast based on assumptions, including marketing mode) ...
       costs.forEach(cost => { let costValue = 0; const costType = cost.type?.toLowerCase(); const baseValue = cost.value; if (isWeekly && metadata) { if (costType === "fixed") { costValue = period === 1 ? baseValue : 0; } else if (costType === "variable") { if (cost.name === "F&B COGS") { const cogsPct = metadata.costs?.fbCOGSPercent || 30; let fbRevenueThisPeriod = 0; let fbSpend = metadata.perCustomer?.fbSpend || 0; if (period > 1 && metadata.growth?.useCustomerSpendGrowth) { fbSpend *= Math.pow(1 + (metadata.growth.fbSpendGrowth || 0) / 100, period - 1); } fbRevenueThisPeriod = currentAttendance * fbSpend; costValue = (fbRevenueThisPeriod * cogsPct) / 100; } else { costValue = baseValue; } } else { costValue = baseValue; if(cost.name === "Setup Costs" && metadata.weeks && metadata.weeks > 0) { const setupIsFixed = costs.find(c => c.name === "Setup Costs")?.type?.toLowerCase() === 'fixed'; if (!setupIsFixed) { costValue = baseValue / metadata.weeks; } } } } else { if (costType === "fixed") costValue = period === 1 ? baseValue : 0; else costValue = baseValue; } periodCostForecast += costValue; });
       let periodMarketingCost = 0; if (marketingSetup.allocationMode === 'channels') { const budget = marketingSetup.channels.reduce((s, ch) => s + (ch.weeklyBudget || 0), 0); periodMarketingCost = isWeekly ? budget : budget * (365.25 / 7 / 12); } else if (marketingSetup.allocationMode === 'highLevel' && marketingSetup.totalBudget) { const tb = marketingSetup.totalBudget; const app = marketingSetup.budgetApplication || 'spreadEvenly'; const sd = marketingSetup.spreadDuration; const md = duration; if (app === 'upfront') periodMarketingCost = (period === 1) ? tb : 0; else if (app === 'spreadEvenly') periodMarketingCost = tb / md; else if (app === 'spreadCustom' && sd && sd > 0) periodMarketingCost = (period <= sd) ? (tb / sd) : 0; } if (periodMarketingCost > 0) periodCostForecast += periodMarketingCost;
       
      const periodProfitForecast = periodRevenueForecast - periodCostForecast;
      cumulativeRevenueForecast += periodRevenueForecast;
      cumulativeCostForecast += periodCostForecast;

      // --- Get Actuals for the period ---
      const actualEntry = actualsMap.get(period);
      let periodRevenueActual: number | undefined = undefined;
      let periodCostActual: number | undefined = undefined;
      let periodProfitActual: number | undefined = undefined;
      let periodAttendanceActual: number | undefined = undefined;

      if (actualEntry) {
          latestActualPeriod = Math.max(latestActualPeriod, period);
          periodRevenueActual = Object.values(actualEntry.revenueActuals || {}).reduce((s, v) => s + v, 0);
          periodCostActual = Object.values(actualEntry.costActuals || {}).reduce((s, v) => s + v, 0);
          periodProfitActual = periodRevenueActual - periodCostActual;
          cumulativeRevenueActual += periodRevenueActual;
          cumulativeCostActual += periodCostActual;
          if (isWeekly && actualEntry.attendanceActual !== undefined && actualEntry.attendanceActual !== null) {
              periodAttendanceActual = actualEntry.attendanceActual;
              cumulativeAttendanceActual += periodAttendanceActual;
          }
      }

      // --- Calculate Variances ---
      const revenueVariance = periodRevenueActual !== undefined ? periodRevenueActual - periodRevenueForecast : undefined;
      const costVariance = periodCostActual !== undefined ? periodCostActual - periodCostForecast : undefined; // Higher actual cost is negative variance
      const profitVariance = periodProfitActual !== undefined ? periodProfitActual - periodProfitForecast : undefined;
      const revenueVariancePercent = periodRevenueForecast !== 0 && revenueVariance !== undefined ? (revenueVariance / periodRevenueForecast) * 100 : undefined;
      const costVariancePercent = periodCostForecast !== 0 && costVariance !== undefined ? (costVariance / periodCostForecast) * 100 : undefined;
      const profitVariancePercent = periodProfitForecast !== 0 && profitVariance !== undefined ? (profitVariance / periodProfitForecast) * 100 : undefined;
      
      let currentAttendanceForecast = 0;
      if (isWeekly && metadata) {
          currentAttendanceForecast = metadata.initialWeeklyAttendance || 0;
          if (period > 1 && metadata.growth) {
              const rate = (metadata.growth.attendanceGrowthRate || 0) / 100;
              currentAttendanceForecast = (metadata.initialWeeklyAttendance || 0) * Math.pow(1 + rate, period - 1);
          }
          currentAttendanceForecast = Math.round(currentAttendanceForecast);
          cumulativeAttendanceForecast += currentAttendanceForecast;
      }

      const attendanceVariance = periodAttendanceActual !== undefined ? periodAttendanceActual - currentAttendanceForecast : undefined;

      periodicAnalysisData.push({
          period,
          point,
          revenueForecast: Math.ceil(periodRevenueForecast),
          costForecast: Math.ceil(periodCostForecast),
          profitForecast: Math.ceil(periodProfitForecast),
          revenueActual: periodRevenueActual !== undefined ? Math.ceil(periodRevenueActual) : undefined,
          costActual: periodCostActual !== undefined ? Math.ceil(periodCostActual) : undefined,
          profitActual: periodProfitActual !== undefined ? Math.ceil(periodProfitActual) : undefined,
          revenueVariance, costVariance, profitVariance,
          revenueVariancePercent, costVariancePercent, profitVariancePercent,
          attendanceForecast: isWeekly ? currentAttendanceForecast : undefined,
          attendanceActual: periodAttendanceActual,
          attendanceVariance,
      });
    }
    // --- End Loop ---

    // --- Calculate Summary Metrics ---
    const totalRevenueForecast = cumulativeRevenueForecast;
    const totalCostForecast = cumulativeCostForecast;
    const totalProfitForecast = totalRevenueForecast - totalCostForecast;
    const totalRevenueActual = cumulativeRevenueActual;
    const totalCostActual = cumulativeCostActual;
    const totalProfitActual = totalRevenueActual - totalCostActual;
    const avgProfitMarginForecast = totalRevenueForecast > 0 ? (totalProfitForecast / totalRevenueForecast) * 100 : 0;
    const avgProfitMarginActual = totalRevenueActual > 0 ? (totalProfitActual / totalRevenueActual) * 100 : 0;

    // Calculate Revised Outlook Totals
    let revisedTotalRevenue = 0;
    let revisedTotalCost = 0;
    let revisedTotalProfit = 0;
    let revisedAvgProfitMargin = 0;

    for (let period = 1; period <= duration; period++) {
        const p = periodicAnalysisData[period - 1];
        if (p.revenueActual !== undefined && period <= latestActualPeriod) {
            revisedTotalRevenue += p.revenueActual;
            revisedTotalCost += p.costActual ?? 0;
            revisedTotalProfit += p.profitActual ?? 0;
        } else {
            revisedTotalRevenue += p.revenueForecast;
            revisedTotalCost += p.costForecast;
            revisedTotalProfit += p.profitForecast;
        }
    }
    revisedAvgProfitMargin = revisedTotalRevenue > 0 ? (revisedTotalProfit / revisedTotalRevenue) * 100 : 0;

    // Calculate Variance between Original Forecast and Revised Outlook
    const totalRevenueVariance = revisedTotalRevenue - totalRevenueForecast;
    const totalCostVariance = revisedTotalCost - totalCostForecast;
    const totalProfitVariance = revisedTotalProfit - totalProfitForecast;
    const totalAttendanceVariance = cumulativeAttendanceActual - cumulativeAttendanceForecast;

    const summary: AnalysisSummary = {
       totalRevenueForecast, totalCostForecast, totalProfitForecast,
       revisedTotalRevenue, revisedTotalCost, revisedTotalProfit, 
       totalRevenueVariance,
       totalCostVariance,
       totalProfitVariance,
       avgProfitMarginForecast, 
       revisedAvgProfitMargin,
       latestActualPeriod, 
       timeUnit,
       totalAttendanceForecast: cumulativeAttendanceForecast,
       totalAttendanceActual: cumulativeAttendanceActual,
       totalAttendanceVariance,
    };
    
    return {
        summary: summary,
        trendData: periodicAnalysisData 
    };

  }, [selectedModel, actualsData, selectedModelId]);

  if (financialModels.length === 0) {
     return <p className="text-muted-foreground">No financial models exist for this project to analyze performance against.</p>;
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

  // Destructure ALL results including actuals
  const {
    summary,
    trendData
  } = analysisData || { summary: null, trendData: [] }; // Default structure if null

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
  } = summary || {}; // Default empty object if summary is null

  const isWeeklyEvent = selectedModel?.assumptions?.metadata?.type === "WeeklyEvent";

  return (
    <div className="space-y-6">
      {/* Model Selector */}
      <div className="flex items-center space-x-2 max-w-sm">
          <Label htmlFor="model-select" className="flex-shrink-0">Compare Against Model:</Label>
          <Select 
            value={selectedModelId?.toString() ?? ''} 
            onValueChange={(value) => setSelectedModelId(value ? parseInt(value) : undefined)}
          >
            <SelectTrigger id="model-select" className="h-9">
              <SelectValue placeholder="Select a model..." />
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

      {!selectedModel && (
          <p className="text-muted-foreground">Please select a financial model to compare against.</p>
      )}

      {selectedModel && !analysisData && (
          <p className="text-muted-foreground">Calculating analysis...</p>
      )}

      {selectedModel && analysisData && (
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
            <p className="text-xs text-muted-foreground text-right">
                * Actuals calculated up to {timeUnit} {latestActualPeriod}
            </p>

            {/* --- Variance Trend Charts --- */}
            <Card>
                <CardHeader><CardTitle className="text-lg font-semibold">Forecast vs. Actual Trends</CardTitle></CardHeader>
                <CardContent className="space-y-8">
                    {/* Revenue Chart */}
                     <div>
                        <h4 className="text-base font-medium mb-2">Revenue</h4>
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
                        <h4 className="text-base font-medium mb-2">Costs</h4>
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
                        <h4 className="text-base font-medium mb-2">Profit</h4>
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
                           <h4 className="text-base font-medium mb-2">Attendance</h4>
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
                </CardContent>
            </Card>

            {/* TODO: Add Category Variance Breakdown Table */}
         </>
      )}
    </div>
  );
}; 