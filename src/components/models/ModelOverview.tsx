import { Model, RevenueStream, CostCategory, ActualsPeriodEntry } from "@/types/models";
import { useEffect, useState, useMemo, memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getSupabaseStorageService } from "@/services/singleton";
import { ExportModal } from './ExportModal';
import { toast } from 'sonner';
import { db, getProject } from "@/lib/db";
import { isCloudModeEnabled } from "@/config/app.config";
import { MetricsCard, MetricRow } from './MetricsCard';
import { GrowthIndicators } from './GrowthIndicators';
import { RiskIndicators } from './RiskIndicators';
import { CriticalAssumptions } from './CriticalAssumptions';

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

  // Declare all hooks before any conditional returns
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportingOption, setExportingOption] = useState<string>();
  
  const handleEdit = useCallback(() => {
    if (projectId && model.id) {
        navigate(`/projects/${projectId}/models/${model.id}/edit`);
    }
  }, [navigate, projectId, model.id]);

  const handleExport = useCallback(async (optionId: string) => {
    if (!projectId || !model) {
      toast.error("Missing project or model data.");
      return;
    }

    setIsExporting(true);
    setExportingOption(optionId);

    try {
      // Get project data using cloud/local switching
      let project;
      
      if (isCloudModeEnabled()) {
        console.log('🌤️ Getting project from Supabase for download');
        const supabaseStorage = getSupabaseStorageService();
        project = await supabaseStorage.getProject(projectId);
      } else {
        console.log('💾 Getting project from IndexedDB for download');
        project = await getProject(projectId as string | number);
      }
      
      if (!project) {
        toast.error("Project not found.");
        return;
      }

      if (optionId === "rich-pdf") {
        // Export rich PDF with charts and financial data
        const { exportRichPDF } = await import("@/lib/rich-pdf-export");
        await exportRichPDF({
          project,
          model,
          simulationResults
        });
        toast.success("Rich PDF report downloaded successfully!");
      } else if (optionId === "board-pdf") {
        // Export product strategy PDF
        const { exportBoardReadyPDF, prepareBoardReadyData } = await import("@/lib/board-ready-export");
        const reportData = await prepareBoardReadyData(project, [model], 36, 0.1);
        await exportBoardReadyPDF(reportData);
        toast.success("Executive summary downloaded successfully!");
      } else if (optionId === "excel") {
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
        toast.success("Excel analysis downloaded successfully!");
      }
      
      setExportModalOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
      setExportingOption(undefined);
    }
  }, [projectId, model, simulationResults]);

  const handleDownload = useCallback(() => {
    setExportModalOpen(true);
  }, []);

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


  return (
    <div className="space-y-6">
      {/* Quick Actions Bar */}
       <div className="flex space-x-2 mb-4 border-b pb-4">
          <Button variant="outline" size="sm" onClick={handleEdit} disabled={!projectId || !model.id}>
              <Edit className="mr-1 h-4 w-4" /> Edit Scenario
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-1 h-4 w-4" /> Download Report
          </Button>
       </div>

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Revenue Card */}
        <MetricsCard title="Revenue">
          <MetricRow label={`Initial ${timeUnit}`} value={initialRevenue} />
          <MetricRow label={`Final ${timeUnit}`} value={finalWeekRevenue} />
          <MetricRow 
            label="Total Projected" 
            value={totalRevenue} 
            isHighlight 
            colorClass="text-green-700" 
          />
          {latestActualPeriod > 0 && (
            <MetricRow 
              label={`Total Actual (${timeUnit} 1-${latestActualPeriod})`} 
              value={totalActualRevenue}
              colorClass="text-green-600"
            />
          )}
          <div className="pt-2">
            <p className="text-xs text-muted-foreground">Highest Initial Stream</p>
            <p className="text-sm font-medium">{highestInitialRevenue.name} ({new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(highestInitialRevenue.value)})</p>
          </div>
        </MetricsCard>

        {/* Costs Card */}
        <MetricsCard title="Costs">
          <MetricRow label={`Initial ${timeUnit}`} value={initialCosts} />
          <MetricRow label={`Final ${timeUnit}`} value={finalWeekCosts} />
          <MetricRow 
            label="Total Projected" 
            value={totalCosts} 
            isHighlight 
            colorClass="text-red-700" 
          />
          {latestActualPeriod > 0 && (
            <MetricRow 
              label={`Total Actual (${timeUnit} 1-${latestActualPeriod})`} 
              value={totalActualCosts}
              colorClass="text-red-600"
            />
          )}
          <div className="pt-2">
            <p className="text-xs text-muted-foreground">Largest Initial Cost</p>
            <p className="text-sm font-medium">{largestInitialCost.name} ({new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(largestInitialCost.value)})</p>
          </div>
        </MetricsCard>

        {/* Profitability Card */}
        <MetricsCard title="Profitability">
          <MetricRow label="Initial Margin" value={`${initialMargin.toFixed(1)}%`} />
          <MetricRow label={`Final ${timeUnit} Margin`} value={`${finalWeekMargin.toFixed(1)}%`} />
          <MetricRow 
            label="Total Projected Profit" 
            value={totalProfit} 
            isHighlight 
            colorClass="text-blue-700" 
          />
          {latestActualPeriod > 0 && (
           <>
             <MetricRow 
               label={`Total Actual Profit (${timeUnit} 1-${latestActualPeriod})`}
               value={totalActualProfit}
               colorClass="text-blue-600"
             />
             <MetricRow 
               label={`Actual Margin (${timeUnit} ${latestActualPeriod})`}
               value={`${finalActualMargin.toFixed(1)}%`}
               colorClass="text-purple-600"
             />
           </>
          )}
          <div className="pt-2">
            <p className="text-xs text-muted-foreground">Break-even Point</p>
            <p className="text-sm font-medium">{breakEvenPoint ? `${timeUnit} ${breakEvenPoint}` : 'Never'}</p>
          </div>
        </MetricsCard>
      </div>

      {/* Growth Indicators Section */}
      <GrowthIndicators 
        periodicData={periodicData} 
        isWeekly={isWeekly} 
        totalAttendance={totalAttendance} 
      />

      {/* Risk Indicators Section */}
      <RiskIndicators 
        revenueConcentration={revenueConcentration}
        fixedCostRatio={fixedCostRatio}
        highestInitialRevenue={highestInitialRevenue}
      />

      {/* Critical Assumptions */}
      <CriticalAssumptions 
        model={model}
        duration={duration}
        timeUnit={timeUnit}
        isWeekly={isWeekly}
      />

      {/* Export Modal */}
      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        onExport={handleExport}
        isExporting={isExporting}
        exportingOption={exportingOption}
      />
    </div>
  );
};

export default memo(ModelOverview); 