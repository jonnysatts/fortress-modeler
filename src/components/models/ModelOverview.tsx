import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Model, RevenueStream, CostCategory, ActualsPeriodEntry } from "@/types/models";
import { formatCurrency } from "@/lib/utils";
import { useEffect, useState, useMemo, memo, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  XAxis, // Keep XAxis if we want period labels on tooltips
} from "recharts";
import { Button } from "@/components/ui/button";
import { Edit, Download, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/db";

interface ModelOverviewProps {
  model: Model;
  projectId: string | undefined; // Need projectId for navigation
  actualsData?: ActualsPeriodEntry[]; // Add actuals data prop
}

interface SimulationPeriod {
  period: number;
  point: string;
  revenue: number;
  costs: number;
  profit: number;
  cumulativeRevenue: number;
  cumulativeCosts: number;
  cumulativeProfit: number;
  attendance?: number;
}

const ModelOverview = ({ model, projectId, actualsData = [] }: ModelOverviewProps) => {
  const navigate = useNavigate();
  // Calculate isWeekly here, outside useMemo
  const isWeekly = model?.assumptions?.metadata?.type === "WeeklyEvent"; 

  // Run simulation to get period-by-period data and totals
  const simulationResults = useMemo(() => {
    if (!model?.assumptions?.metadata || !model?.assumptions?.revenue || !model?.assumptions?.costs) {
      console.warn("Incomplete model data for overview simulation.");
      return null;
    }

    const metadata = model.assumptions.metadata;
    // Use the isWeekly calculated outside
    const duration = isWeekly ? metadata.weeks || 12 : 12;
    const timeUnit = isWeekly ? "Week" : "Month";

    const revenueStreams = model.assumptions.revenue;
    const costs = model.assumptions.costs;
    const marketingSetup = model.assumptions.marketing || { allocationMode: 'channels', channels: [] };

    let cumulativeRevenue = 0;
    let cumulativeCosts = 0;
    let cumulativeProfit = 0;
    let totalAttendance = 0;
    let totalFixedCosts = 0;
    let totalOtherCosts = 0;
    const revenueTotalsPerStream: Record<string, number> = {};
    revenueStreams.forEach(s => revenueTotalsPerStream[s.name] = 0);

    const periodicData: SimulationPeriod[] = [];

    for (let period = 1; period <= duration; period++) {
      const point = `${timeUnit} ${period}`;
      
      let currentAttendance = metadata.initialWeeklyAttendance || 0;
      if (isWeekly && period > 1 && metadata.growth) {
         const attendanceGrowthRate = (metadata.growth.attendanceGrowthRate || 0) / 100;
         currentAttendance = (metadata.initialWeeklyAttendance || 0) * Math.pow(1 + attendanceGrowthRate, period - 1);
      }
      if (isWeekly) { // Only sum attendance if it's meaningful weekly data
         totalAttendance += currentAttendance;
      }
      
      let periodRevenue = 0;
      revenueStreams.forEach(stream => {
          let streamRevenue = 0;
          const baseValue = stream.value;
          
          if (isWeekly) {
              if (stream.name === "F&B Sales") {
                  let spend = metadata.perCustomer?.fbSpend || 0;
                  if (period > 1 && metadata.growth?.useCustomerSpendGrowth) {
                      spend *= Math.pow(1 + (metadata.growth.fbSpendGrowth || 0) / 100, period - 1);
                  }
                  streamRevenue = currentAttendance * spend;
              } else if (stream.name === "Merchandise Sales") {
                  let spend = metadata.perCustomer?.merchandiseSpend || 0;
                  if (period > 1 && metadata.growth?.useCustomerSpendGrowth) {
                      spend *= Math.pow(1 + (metadata.growth.merchandiseSpendGrowth || 0) / 100, period - 1);
                  }
                  streamRevenue = currentAttendance * spend;
              } else { // Other streams (Ticket, Online, Misc)
                  streamRevenue = baseValue;
                  if (period > 1 && metadata.growth?.useCustomerSpendGrowth) {
                      let growthRate = 0;
                      switch(stream.name) {
                          case "Ticket Sales": growthRate = (metadata.growth.ticketPriceGrowth || 0) / 100; break;
                          case "Online Sales": growthRate = (metadata.growth.onlineSpendGrowth || 0) / 100; break;
                          case "Miscellaneous Revenue": growthRate = (metadata.growth.miscSpendGrowth || 0) / 100; break;
                      }
                      streamRevenue *= Math.pow(1 + growthRate, period - 1);
                  }
              }
          } else { // Non-weekly
               streamRevenue = baseValue;
               if (period > 1) {
                   const { type, rate } = model.assumptions.growthModel;
                   if (type === "linear") streamRevenue = baseValue * (1 + rate * (period - 1));
                   else streamRevenue = baseValue * Math.pow(1 + rate, period - 1);
               }
          }
          periodRevenue += streamRevenue;
          revenueTotalsPerStream[stream.name] = (revenueTotalsPerStream[stream.name] || 0) + streamRevenue; // Track total per stream
      });

      let periodCosts = 0;
      // Regular Costs
      costs.forEach(cost => {
          let costValue = 0;
          const costType = cost.type?.toLowerCase();
          const baseValue = cost.value;

          if (isWeekly) {
              if (costType === "fixed") {
                  costValue = period === 1 ? baseValue : 0;
                  if (period === 1) totalFixedCosts += costValue;
                  else totalOtherCosts += costValue; 
              } else if (costType === "variable") {
                  if (cost.name === "F&B COGS") {
                       const cogsPct = metadata.costs?.fbCOGSPercent || 30;
                       let fbRevenueThisPeriod = 0;
                       let fbSpend = metadata.perCustomer?.fbSpend || 0;
                       if (period > 1 && metadata.growth?.useCustomerSpendGrowth) {
                           fbSpend *= Math.pow(1 + (metadata.growth.fbSpendGrowth || 0) / 100, period - 1);
                       }
                       fbRevenueThisPeriod = currentAttendance * fbSpend;
                       costValue = (fbRevenueThisPeriod * cogsPct) / 100;
                  } else {
                     costValue = baseValue; 
                  }
                   totalOtherCosts += costValue; 
              } else { // Recurring or Unspecified
                 costValue = baseValue;
                 if(cost.name === "Setup Costs" && metadata.weeks && metadata.weeks > 0) {
                    const setupIsFixed = costs.find(c => c.name === "Setup Costs")?.type?.toLowerCase() === 'fixed';
                    if (!setupIsFixed) {
                       costValue = baseValue / metadata.weeks; 
                    }
                 }
                  totalOtherCosts += costValue;
              }
          } else { // Non-weekly cost calculation
               if (costType === "fixed") {
                 costValue = period === 1 ? baseValue : 0;
                 if (period === 1) totalFixedCosts += costValue;
                 else totalOtherCosts += costValue;
               } else {
                  costValue = baseValue; 
                  totalOtherCosts += costValue;
               }
          }
          periodCosts += costValue;
      });

      // --- Calculate Marketing Cost based on mode --- 
      let periodMarketingCost = 0;
      if (marketingSetup.allocationMode === 'channels') {
         const totalWeeklyBudget = marketingSetup.channels.reduce((sum, ch) => sum + (ch.weeklyBudget || 0), 0);
         periodMarketingCost = isWeekly ? totalWeeklyBudget : totalWeeklyBudget * (365.25 / 7 / 12);
      } else if (marketingSetup.allocationMode === 'highLevel' && marketingSetup.totalBudget) {
         const totalBudget = marketingSetup.totalBudget;
         const application = marketingSetup.budgetApplication || 'spreadEvenly';
         const modelDuration = duration; // Use duration calculated at start of useMemo
             
         if (application === 'upfront') {
            periodMarketingCost = (period === 1) ? totalBudget : 0;
         } else if (application === 'spreadEvenly') {
            periodMarketingCost = totalBudget / modelDuration;
         } else if (application === 'spreadCustom' && marketingSetup.spreadDuration && marketingSetup.spreadDuration > 0) {
            const spreadDuration = marketingSetup.spreadDuration;
            periodMarketingCost = (period <= spreadDuration) ? (totalBudget / spreadDuration) : 0;
         }
      }
      
      // Add Marketing Cost to Period Costs & totalOtherCosts
      if (periodMarketingCost > 0) {
         periodCosts += periodMarketingCost;
         totalOtherCosts += periodMarketingCost; 
      }
      
      const periodProfit = periodRevenue - periodCosts;
      cumulativeRevenue += periodRevenue;
      cumulativeCosts += periodCosts;
      cumulativeProfit += periodProfit;

      periodicData.push({
        period,
        point,
        revenue: Math.ceil(periodRevenue),
        costs: Math.ceil(periodCosts),
        profit: Math.ceil(periodProfit),
        cumulativeRevenue: Math.ceil(cumulativeRevenue),
        cumulativeCosts: Math.ceil(cumulativeCosts),
        cumulativeProfit: Math.ceil(cumulativeProfit),
        attendance: isWeekly ? Math.round(currentAttendance) : undefined,
      });
    } // End simulation loop

    const initialPeriod = periodicData[0];
    const finalPeriod = periodicData[periodicData.length - 1];
    
    let breakEvenPoint: number | null = null;
    for(const p of periodicData) {
        if (p.cumulativeProfit >= 0) {
            breakEvenPoint = p.period;
            break;
        }
    }

    const totalRevenue = finalPeriod?.cumulativeRevenue || 0;
    const totalCosts = finalPeriod?.cumulativeCosts || 0;
    const totalProfit = finalPeriod?.cumulativeProfit || 0;
    
    const initialHighestRevenue = [...model.assumptions.revenue].sort((a, b) => (b?.value || 0) - (a?.value || 0))[0];
    const initialLargestCost = [...model.assumptions.costs].sort((a, b) => (b?.value || 0) - (a?.value || 0))[0];

    // Calculate Risk Metrics
    const highestStreamTotal = Math.max(0, ...Object.values(revenueTotalsPerStream)); // Ensure non-negative
    const revenueConcentration = totalRevenue > 0 ? (highestStreamTotal / totalRevenue) * 100 : 0;
    const fixedCostRatio = (totalFixedCosts + totalOtherCosts) > 0 ? 
                           (totalFixedCosts / (totalFixedCosts + totalOtherCosts)) * 100 : 0;

    // --- NEW: Process Actuals --- 
    let latestActualPeriod = 0;
    let totalActualRevenue = 0;
    let totalActualCosts = 0;
    let finalPeriodActualRevenue = 0;
    let finalPeriodActualCosts = 0;

    const actualsMap = new Map(actualsData.map(a => [a.period, a]));

    // Integrate actuals into periodicData and calculate actual totals
    const processedPeriodicData = periodicData.map(forecastPeriod => {
        const actualEntry = actualsMap.get(forecastPeriod.period);
        let periodActualRevenue = 0;
        let periodActualCost = 0;
        let hasActuals = false;

        if (actualEntry) {
            hasActuals = true;
            latestActualPeriod = Math.max(latestActualPeriod, forecastPeriod.period);
            // Sum actuals from the records
            periodActualRevenue = Object.values(actualEntry.revenueActuals || {}).reduce((s, v) => s + v, 0);
            periodActualCost = Object.values(actualEntry.costActuals || {}).reduce((s, v) => s + v, 0);
            
            totalActualRevenue += periodActualRevenue;
            totalActualCosts += periodActualCost;
            finalPeriodActualRevenue = periodActualRevenue; // Keep track of last actual period
            finalPeriodActualCosts = periodActualCost;
        }

        return {
            ...forecastPeriod,
            revenueActual: hasActuals ? Math.ceil(periodActualRevenue) : undefined,
            costActual: hasActuals ? Math.ceil(periodActualCost) : undefined,
            profitActual: hasActuals ? Math.ceil(periodActualRevenue - periodActualCost) : undefined,
            hasActuals: hasActuals
        };
    });
    // --- End Process Actuals --- 
    
    // Calculate actual profit totals and margins
    const totalActualProfit = totalActualRevenue - totalActualCosts;
    const finalActualProfit = finalPeriodActualRevenue - finalPeriodActualCosts;
    const finalActualMargin = finalPeriodActualRevenue > 0 ? (finalActualProfit / finalPeriodActualRevenue) * 100 : 0;

    // Return both forecast and actual summary data
    return {
      periodicData: processedPeriodicData, // Now includes actuals
      duration,
      timeUnit,
      initialRevenue: initialPeriod?.revenue || 0,
      initialCosts: initialPeriod?.costs || 0,
      initialProfit: initialPeriod?.profit || 0,
      initialMargin: initialPeriod?.revenue ? (initialPeriod.profit / initialPeriod.revenue) * 100 : 0,
      finalWeekRevenue: finalPeriod?.revenue || 0,
      finalWeekCosts: finalPeriod?.costs || 0,
      finalWeekProfit: finalPeriod?.profit || 0,
      finalWeekMargin: finalPeriod?.revenue ? (finalPeriod.profit / finalPeriod.revenue) * 100 : 0,
      totalRevenue,
      totalCosts,
      totalProfit,
      breakEvenPoint,
      highestInitialRevenue: initialHighestRevenue || { name: 'N/A', value: 0 },
      largestInitialCost: initialLargestCost || { name: 'N/A', value: 0 },
      totalAttendance: Math.round(totalAttendance),
      revenueConcentration, // Percentage
      fixedCostRatio, // Percentage
      latestActualPeriod,
      totalActualRevenue,
      totalActualCosts,
      totalActualProfit,
      finalPeriodActualRevenue,
      finalPeriodActualCosts,
      finalActualProfit,
      finalActualMargin,
    };
  }, [model, isWeekly, actualsData]); // Add actualsData to dependency array

  if (!simulationResults) return <p className="text-red-500">Unable to load overview: Simulation failed due to incomplete model data.</p>;

  const {
    periodicData,
    duration,
    timeUnit,
    initialRevenue,
    initialCosts,
    initialProfit,
    initialMargin,
    finalWeekRevenue,
    finalWeekCosts,
    finalWeekProfit,
    finalWeekMargin,
    totalRevenue,
    totalCosts,
    totalProfit,
    breakEvenPoint,
    highestInitialRevenue,
    largestInitialCost,
    totalAttendance,
    revenueConcentration,
    fixedCostRatio,
    latestActualPeriod,
    totalActualRevenue,
    totalActualCosts,
    totalActualProfit,
    finalPeriodActualRevenue,
    finalPeriodActualCosts,
    finalActualProfit,
    finalActualMargin,
  } = simulationResults;

  // Simplified Tooltip for Sparklines
  interface SparklineTooltipProps {
    active?: boolean;
    payload?: Array<{
      value: number;
      dataKey: string;
      color: string;
    }>;
    label?: string;
  }
  
  const SparklineTooltip = ({ active, payload, label }: SparklineTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload; // Access the full data point
      return (
        <div className="bg-background border px-2 py-1 rounded shadow-lg text-xs">
          <p className="font-semibold">{data.point}</p>
          {payload[0].dataKey === 'attendance' ? (
             <p>{`Attendance: ${Math.round(payload[0].value).toLocaleString()}`}</p>
          ) : (
             <p>{`${payload[0].name}: ${formatCurrency(payload[0].value)}`}</p>
          )}
        </div>
      );
    }
    return null;
  };

  const handleEdit = useCallback(() => {
    if (projectId && model.id) {
        navigate(`/projects/${projectId}/models/${model.id}/edit`);
    }
  }, [navigate, projectId, model.id]);
  
  // Download report functionality
  const handleDownload = useCallback(async () => {
    if (!projectId || !model) {
      alert("Missing project or model data.");
      return;
    }

    try {
      // Get project data
      const project = await db.projects.get(Number(projectId));
      if (!project) {
        alert("Project not found.");
        return;
      }

      // Show format selection with 3 options
      const choice = prompt("Choose export format:\n1 = Rich PDF with Charts\n2 = Product Strategy PDF\n3 = Excel Report\n\nEnter 1, 2, or 3:");
      
      if (choice === "1") {
        // Export rich PDF with charts and financial data
        const { exportRichPDF } = await import("@/lib/rich-pdf-export");
        await exportRichPDF({
          project,
          model,
          simulationResults
        });
      } else if (choice === "2") {
        // Export product strategy PDF
        const { exportBoardReadyPDF, prepareBoardReadyData } = await import("@/lib/board-ready-export");
        const reportData = await prepareBoardReadyData(project, [model], 36, 0.1);
        await exportBoardReadyPDF(reportData);
      } else if (choice === "3") {
        // Export Excel using enhanced export
        const { exportEnhancedExcel } = await import("@/lib/enhanced-excel-export");
        await exportEnhancedExcel({
          project,
          models: [model],
          includeScenarios: true,
          includeSensitivity: true,
          periods: 36,
          discountRate: 0.1
        });
      } else {
        return; // User cancelled or invalid choice
      }
    } catch (error) {
      console.error('Download error:', error);
      alert(`Download failed: ${error.message}`);
    }
  }, [projectId, model, simulationResults]);
  
  const handleShare = useCallback(() => {
    alert("Share model functionality not implemented yet.");
  }, []);

  return (
    <div className="space-y-6">
      {/* Quick Actions Bar */}
       <div className="flex space-x-2 mb-4 border-b pb-4">
          <Button variant="outline" size="sm" onClick={handleEdit} disabled={!projectId || !model.id}>
              <Edit className="mr-1 h-4 w-4" /> Edit Model
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-1 h-4 w-4" /> Download Report
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="mr-1 h-4 w-4" /> Share Model
          </Button>
       </div>

      {/* Key Metrics Dashboard - Update to show Actual vs Forecast */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Revenue Card */}
        <Card>
          <CardHeader><CardTitle className="text-lg font-semibold text-primary">Revenue</CardTitle></CardHeader>
          <CardContent className="space-y-3">
             <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Initial {timeUnit}</span>
                <span className="text-lg font-semibold">{formatCurrency(initialRevenue)}</span>
             </div>
             <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Final {timeUnit}</span>
                <span className="text-lg font-semibold">{formatCurrency(finalWeekRevenue)}</span>
             </div>
              <div className="border-t pt-3 mt-3 flex justify-between items-baseline">
                <span className="text-sm font-medium text-muted-foreground">Total Projected</span>
                <span className="text-2xl font-bold text-green-700">{formatCurrency(totalRevenue)}</span>
             </div>
             {/* NEW: Actual Total Revenue */} 
             {latestActualPeriod > 0 && (
               <div className="flex justify-between items-baseline">
                 <span className="text-sm text-green-600">Total Actual ({timeUnit} 1-{latestActualPeriod})</span>
                 <span className="text-lg font-semibold text-green-600">{formatCurrency(totalActualRevenue)}</span>
               </div>
             )}
             <div className="pt-2">
                <p className="text-xs text-muted-foreground">Highest Initial Stream</p>
                <p className="text-sm font-medium">{highestInitialRevenue.name} ({formatCurrency(highestInitialRevenue.value)})</p>
              </div>
          </CardContent>
        </Card>

        {/* Costs Card */}
        <Card>
           <CardHeader><CardTitle className="text-lg font-semibold text-primary">Costs</CardTitle></CardHeader>
           <CardContent className="space-y-3">
              <div className="flex justify-between items-baseline">
                 <span className="text-sm text-muted-foreground">Initial {timeUnit}</span>
                 <span className="text-lg font-semibold">{formatCurrency(initialCosts)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                 <span className="text-sm text-muted-foreground">Final {timeUnit}</span>
                 <span className="text-lg font-semibold">{formatCurrency(finalWeekCosts)}</span>
              </div>
              <div className="border-t pt-3 mt-3 flex justify-between items-baseline">
                 <span className="text-sm font-medium text-muted-foreground">Total Projected</span>
                 <span className="text-2xl font-bold text-red-700">{formatCurrency(totalCosts)}</span>
              </div>
               {/* NEW: Actual Total Costs */} 
               {latestActualPeriod > 0 && (
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-red-600">Total Actual ({timeUnit} 1-{latestActualPeriod})</span>
                    <span className="text-lg font-semibold text-red-600">{formatCurrency(totalActualCosts)}</span>
                  </div>
               )}
              <div className="pt-2">
                <p className="text-xs text-muted-foreground">Largest Initial Cost</p>
                <p className="text-sm font-medium">{largestInitialCost.name} ({formatCurrency(largestInitialCost.value)})</p>
              </div>
           </CardContent>
        </Card>

        {/* Profitability Card */}
        <Card>
           <CardHeader><CardTitle className="text-lg font-semibold text-primary">Profitability</CardTitle></CardHeader>
            <CardContent className="space-y-3">
                <div className="flex justify-between items-baseline">
                   <span className="text-sm text-muted-foreground">Initial Margin</span>
                   <span className="text-lg font-semibold">{initialMargin.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-baseline">
                   <span className="text-sm text-muted-foreground">Final {timeUnit} Margin</span>
                    <span className="text-lg font-semibold">{finalWeekMargin.toFixed(1)}%</span>
                </div>
                <div className="border-t pt-3 mt-3 flex justify-between items-baseline">
                   <span className="text-sm font-medium text-muted-foreground">Total Projected Profit</span>
                    <span className="text-2xl font-bold text-blue-700">{formatCurrency(totalProfit)}</span>
                </div>
                {/* NEW: Actual Total Profit & Margin */} 
                {latestActualPeriod > 0 && (
                 <>
                   <div className="flex justify-between items-baseline">
                     <span className="text-sm text-blue-600">Total Actual Profit ({timeUnit} 1-{latestActualPeriod})</span>
                     <span className="text-lg font-semibold text-blue-600">{formatCurrency(totalActualProfit)}</span>
                   </div>
                   <div className="flex justify-between items-baseline">
                      <span className="text-sm text-purple-600">Actual Margin ({timeUnit} {latestActualPeriod})</span>
                      <span className="text-lg font-semibold text-purple-600">{finalActualMargin.toFixed(1)}%</span>
                   </div>
                 </>
                )}
                <div className="pt-2">
                   <p className="text-xs text-muted-foreground">Break-even Point</p>
                   <p className="text-sm font-medium">{breakEvenPoint ? `${timeUnit} ${breakEvenPoint}` : 'Never'}</p>
               </div>
            </CardContent>
        </Card>
      </div>

      {/* --- NEW: Growth Indicators Section --- */}
      <Card>
          <CardHeader>
              <CardTitle className="text-lg font-semibold text-primary">Growth Indicators</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {/* Revenue Trend Sparkline */}
              <div className="text-center">
                  <p className="text-sm font-medium mb-1">Revenue Trend</p>
                  <div className="h-20 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={periodicData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                              <Tooltip content={<SparklineTooltip />} cursor={{ fill: 'transparent' }} />
                              <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} dot={false} name="Revenue"/>
                          </LineChart>
                      </ResponsiveContainer>
                  </div>
              </div>
              {/* Cost Trend Sparkline */}
              <div className="text-center">
                  <p className="text-sm font-medium mb-1">Cost Trend</p>
                  <div className="h-20 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={periodicData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                              <Tooltip content={<SparklineTooltip />} cursor={{ fill: 'transparent' }}/>
                              <Line type="monotone" dataKey="costs" stroke="#dc2626" strokeWidth={2} dot={false} name="Costs"/>
                          </LineChart>
                      </ResponsiveContainer>
                  </div>
              </div>
              {/* Attendance Trend / Total */}
              <div className="text-center">
                  <p className="text-sm font-medium mb-1">Attendance</p>
                   <div className="h-20 w-full">
                      {isWeekly ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={periodicData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                <Tooltip content={<SparklineTooltip />} cursor={{ fill: 'transparent' }}/>
                                <Line type="monotone" dataKey="attendance" stroke="#6366f1" strokeWidth={2} dot={false} name="Attendance"/>
                          </LineChart>
                      </ResponsiveContainer>
                      ) : (
                          <p className="text-xs text-muted-foreground h-full flex items-center justify-center">(Weekly Only)</p>
                      )}
                   </div>
                   {isWeekly && (
                        <p className="text-xs text-muted-foreground mt-1">Total Est. Attendance: {totalAttendance.toLocaleString()}</p>
                   )}
              </div>
          </CardContent>
      </Card>

      {/* --- NEW: Risk Indicators Section --- */}
      <Card>
        <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary">Risk Indicators</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
                <p className="text-sm font-medium text-muted-foreground">Revenue Concentration</p>
                <p className="text-2xl font-bold">{revenueConcentration.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">From highest stream ({highestInitialRevenue.name})</p>
            </div>
            <div>
                <p className="text-sm font-medium text-muted-foreground">Fixed Cost Ratio</p>
                <p className="text-2xl font-bold">{fixedCostRatio.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Percentage of total costs</p>
            </div>
             <div>
                <p className="text-sm font-medium text-muted-foreground">Sensitivity Analysis</p>
                <p className="text-sm italic text-muted-foreground">(Not Implemented)</p>
                <p className="text-xs text-muted-foreground">e.g., Impact of ±10% attendance</p>
            </div>
        </CardContent>
      </Card>

      {/* Critical Assumptions */}
      <Card>
         <CardHeader>
           <CardTitle className="text-lg font-semibold text-primary">Critical Assumptions</CardTitle>
         </CardHeader>
         <CardContent>
            {/* Existing Assumptions Content */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             <div>
               <h3 className="font-medium mb-2">Event Structure</h3>
               <div className="space-y-1">
                 <p className="text-sm">
                   <span className="text-muted-foreground">Duration: </span>
                   {duration} {timeUnit}s
                 </p>
                 <p className="text-sm">
                   <span className="text-muted-foreground">Initial Attendance: </span>
                   {model.assumptions.metadata?.initialWeeklyAttendance ? model.assumptions.metadata.initialWeeklyAttendance.toLocaleString() : 'N/A'} {isWeekly ? 'per week' : ''}
                 </p>
               </div>
             </div>
             <div>
               <h3 className="font-medium mb-2">Growth Rates</h3>
               <div className="space-y-1">
                 <p className="text-sm">
                   <span className="text-muted-foreground">Attendance Growth: </span>
                   {model.assumptions.metadata?.growth?.attendanceGrowthRate ?? 'N/A'}% {isWeekly ? 'weekly' : 'N/A'}
                 </p>
                 {model.assumptions.metadata?.growth?.useCustomerSpendGrowth ? (
                   <>
                     <p className="text-sm">
                       <span className="text-muted-foreground">F&B Spend Growth: </span>
                       {model.assumptions.metadata?.growth?.fbSpendGrowth ?? 'N/A'}% {isWeekly ? 'weekly' : 'N/A'}
                     </p>
                      <p className="text-sm">
                       <span className="text-muted-foreground">Merch Spend Growth: </span>
                       {model.assumptions.metadata?.growth?.merchandiseSpendGrowth ?? 'N/A'}% {isWeekly ? 'weekly' : 'N/A'}
                     </p>
                   </>
                 ) : (
                   <p className="text-sm text-muted-foreground">Customer spend growth not applied.</p>
                 )}
               </div>
             </div>
             <div>
               <h3 className="font-medium mb-2">Cost Factors</h3>
               <div className="space-y-1">
                  <p className="text-sm">
                   <span className="text-muted-foreground">Setup Costs: </span>
                   {formatCurrency(model.assumptions.costs.find(c => c.name === "Setup Costs")?.value || 0)}
                 </p>
                 <p className="text-sm">
                   <span className="text-muted-foreground">F&B COGS %: </span>
                   {model.assumptions.metadata?.costs?.fbCOGSPercent ?? 'N/A'}%
                 </p>
                 <p className="text-sm">
                   <span className="text-muted-foreground">Staff Count: </span>
                   {model.assumptions.metadata?.costs?.staffCount ?? 'N/A'}
                 </p>
               </div>
             </div>
           </div>
         </CardContent>
      </Card>
    </div>
  );
};

export default memo(ModelOverview); 