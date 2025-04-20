// Add a log to confirm summary mount
console.log('ProductSummary mounted');

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FinancialModel, ActualsPeriodEntry, Scenario } from '@/lib/db';
import useStore from '@/store/useStore';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';
import { generateForecastTimeSeries, ForecastPeriodData } from '@/lib/financialCalculations';
import { TypographyH4, TypographyMuted, TypographyH2, TypographyP } from '@/components/ui/typography';
import ContentCard from '@/components/common/ContentCard';
import ChartContainer from '@/components/common/ChartContainer';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, ReferenceLine, Label as RechartsLabel, AreaChart, Area } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Sparkline } from '@/components/ui/sparkline';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { dataColors } from '@/lib/colors';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { db } from '@/lib/db';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ForecastDataTab from '@/components/product/ForecastDataTab';

// --- Helper: Calculate Revenue Breakdown from Time Series ---
interface RevenueBreakdownItem {
    name: string;
    totalValue: number;
    percentage: number;
}
const calculateRevenueBreakdown = (timeSeries: ForecastPeriodData[], model: FinancialModel | null): RevenueBreakdownItem[] => {
    if (!model?.assumptions || timeSeries.length === 0) return [];

    const breakdown: Record<string, number> = {};
    const revenueStreams = model.assumptions.revenue || [];
    const metadata = model.assumptions.metadata;
    const growthModel = model.assumptions.growthModel;
    const isWeekly = metadata?.type === "WeeklyEvent";

    // Initialize breakdown with all known stream names
    revenueStreams.forEach(s => breakdown[s.name] = 0);
    // Ensure standard streams exist if it's a weekly model
    if (isWeekly) {
        if (!breakdown["Ticket Sales"]) breakdown["Ticket Sales"] = 0;
        if (!breakdown["F&B Sales"]) breakdown["F&B Sales"] = 0;
        if (!breakdown["Merchandise Sales"]) breakdown["Merchandise Sales"] = 0;
    }

    // Sum revenue per stream across all periods
    timeSeries.forEach(periodData => {
        const currentAttendance = periodData.attendance ?? 0;
        const period = periodData.period;

        // Re-calculate per-period stream revenue based on drivers/assumptions
        // (This mirrors logic in generateForecastTimeSeries but sums into breakdown)
         if (isWeekly && metadata?.perCustomer) {
            let currentTicketPrice = metadata.perCustomer.ticketPrice ?? 0;
            let currentFbSpend = metadata.perCustomer.fbSpend ?? 0;
            let currentMerchSpend = metadata.perCustomer.merchandiseSpend ?? 0;
            // Apply growth...
            if (period > 1 && metadata.growth?.useCustomerSpendGrowth) {
                currentTicketPrice *= Math.pow(1 + (metadata.growth.ticketPriceGrowth ?? 0) / 100, period - 1);
                currentFbSpend *= Math.pow(1 + (metadata.growth.fbSpendGrowth ?? 0) / 100, period - 1);
                currentMerchSpend *= Math.pow(1 + (metadata.growth.merchandiseSpendGrowth ?? 0) / 100, period - 1);
            }
            breakdown["Ticket Sales"] += currentAttendance * currentTicketPrice;
            breakdown["F&B Sales"] += currentAttendance * currentFbSpend;
            breakdown["Merchandise Sales"] += currentAttendance * currentMerchSpend;
         }

         revenueStreams.forEach(stream => {
            if (isWeekly && ["Ticket Sales", "F&B Sales", "Merchandise Sales"].includes(stream.name)) return; // Skip already calculated

            let streamRevenue = stream.value ?? 0;
            if (period > 1 && growthModel) { // Apply general growth to others
                if (growthModel.type === "linear") streamRevenue = (stream.value??0) * (1 + growthModel.rate * (period - 1));
                else if (growthModel.type === "exponential") streamRevenue = (stream.value??0) * Math.pow(1 + growthModel.rate, period - 1);
            }
            breakdown[stream.name] = (breakdown[stream.name] || 0) + streamRevenue;
         });
    });

    const totalRevenue = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

    return Object.entries(breakdown)
        .map(([name, totalValue]) => ({
            name,
            totalValue: Math.round(totalValue),
            percentage: totalRevenue > 0 ? Math.round((totalValue / totalRevenue) * 100) : 0,
        }))
        .filter(item => item.totalValue > 0) // Filter out zero-value streams
        .sort((a, b) => b.totalValue - a.totalValue);
};

// --- Helper: Calculate Cost Breakdown from Time Series ---
interface CostBreakdownItem {
    category: string;
    totalValue: number;
    percentage: number;
}
const calculateCostBreakdown = (timeSeries: ForecastPeriodData[], model: FinancialModel | null): CostBreakdownItem[] => {
     if (!model?.assumptions || timeSeries.length === 0) return [];

     const breakdown: Record<string, number> = {
         "COGS": 0,
         "Marketing": 0,
         "Fixed/Setup": 0,
         "Other Recurring": 0,
         "Staffing": 0
     };
     const { assumptions } = model;
     const metadata = assumptions.metadata;
     const costs = assumptions.costs || [];
     const marketingSetup = assumptions.marketing || { allocationMode: 'none', channels: [] };
     const isWeekly = metadata?.type === "WeeklyEvent";
     const duration = timeSeries.length;

     timeSeries.forEach(periodData => {
        const period = periodData.period;
        let periodFBCRevenue = 0; // Need to recalculate revenue for COGS base
        let periodMerchRevenue = 0;
        const currentAttendance = periodData.attendance ?? 0;

        // Simplified revenue recalc for COGS (assumes relevant data is available)
        if (isWeekly && metadata?.perCustomer) {
             let currentFbSpend = metadata.perCustomer.fbSpend ?? 0;
             let currentMerchSpend = metadata.perCustomer.merchandiseSpend ?? 0;
             if (period > 1 && metadata.growth?.useCustomerSpendGrowth) {
                currentFbSpend *= Math.pow(1 + (metadata.growth.fbSpendGrowth ?? 0) / 100, period - 1);
                currentMerchSpend *= Math.pow(1 + (metadata.growth.merchandiseSpendGrowth ?? 0) / 100, period - 1);
             }
             periodFBCRevenue = currentAttendance * currentFbSpend;
             periodMerchRevenue = currentAttendance * currentMerchSpend;
        }

        // 1. COGS
        const fbCogsPercent = metadata?.costs?.fbCOGSPercent ?? 0;
        const merchCogsPercent = metadata?.costs?.merchandiseCogsPercent ?? 0;
        breakdown["COGS"] += (periodFBCRevenue * fbCogsPercent) / 100;
        breakdown["COGS"] += (periodMerchRevenue * merchCogsPercent) / 100;

        // 2. Staff Costs
        if (isWeekly && metadata?.costs?.staffCount && metadata?.costs?.staffCostPerPerson) {
            const periodStaffCost = (metadata.costs.staffCount || 0) * (metadata.costs.staffCostPerPerson || 0);
            breakdown["Staffing"] = (breakdown["Staffing"] || 0) + periodStaffCost;
        }

        // 3. Fixed/Recurring
        costs.forEach(cost => {
            const costType = cost.type?.toLowerCase();
            const baseValue = cost.value ?? 0;
            if (costType === "fixed") {
                if (period === 1) breakdown["Fixed/Setup"] += baseValue;
            } else if (costType === "recurring") {
                 if (cost.name === "Setup Costs" && isWeekly && duration > 0) {
                    breakdown["Fixed/Setup"] += baseValue / duration; // Spread setup if recurring
                 } else {
                    breakdown["Other Recurring"] += baseValue;
                 }
            }
        });

        // 4. Marketing
        let periodMarketingCost = 0;
        if (marketingSetup.allocationMode === 'channels') {
            const budget = marketingSetup.channels.reduce((s, ch) => s + (ch.weeklyBudget ?? 0), 0);
            periodMarketingCost = isWeekly ? budget : budget * (365.25 / 7 / 12);
        } else if (marketingSetup.allocationMode === 'highLevel' && marketingSetup.totalBudget) {
            const totalBudget = marketingSetup.totalBudget ?? 0;
            const application = marketingSetup.budgetApplication || 'spreadEvenly';
            const spreadDuration = marketingSetup.spreadDuration ?? duration;
            if (application === 'upfront' && period === 1) periodMarketingCost = totalBudget;
            else if (application === 'spreadEvenly' && duration > 0) periodMarketingCost = totalBudget / duration;
            else if (application === 'spreadCustom' && spreadDuration > 0 && period <= spreadDuration) periodMarketingCost = totalBudget / spreadDuration;
        }
        breakdown["Marketing"] += periodMarketingCost;
     });

     const totalCosts = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

     return Object.entries(breakdown)
        .map(([category, totalValue]) => ({
            category,
            totalValue: Math.round(totalValue),
            percentage: totalCosts > 0 ? Math.round((totalValue / totalCosts) * 100) : 0,
        }))
        .filter(item => item.totalValue > 0)
        .sort((a, b) => b.totalValue - a.totalValue);
};

// --- Custom Tooltip for Charts ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload; // Access the data point for the hovered item
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border rounded shadow-lg text-xs">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} style={{ color: entry.color }}>
            {`${entry.name}: ${formatCurrency(entry.value)}`}
          </p>
        ))}
        {/* Add profit if available in the data point */}
        {data.profit !== undefined && (
             <p style={{ color: dataColors.forecast }}>{`Profit: ${formatCurrency(data.profit)}`}</p>
        )}
      </div>
    );
  }
  return null;
};

const ProductSummary: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  // Use the modular store with specific selectors
  const {
    currentProject,
    loadModels,
    loadActuals,
    scenarios,
    currentScenario,
    setCurrentScenario,
    baselineForecastData,
    scenarioForecastData,
    loadScenarios,
    error,
    loading,
    scenariosLoading,
    setBaselineModel
  } = useStore(state => ({
    currentProject: state.currentProject,
    loadModels: state.loadModels,
    loadActuals: state.loadActualsForProject,
    scenarios: state.scenarios || [],
    currentScenario: state.currentScenario,
    setCurrentScenario: state.setCurrentScenario,
    baselineForecastData: state.baselineForecastData || [],
    scenarioForecastData: state.scenarioForecastData || [],
    loadScenarios: state.loadScenarios,
    error: state.error,
    loading: state.loading,
    scenariosLoading: state.scenariosLoading || false,
    setBaselineModel: state.setBaselineModel
  }));

  const [models, setModels] = useState<FinancialModel[]>([]);
  const [actuals, setActuals] = useState<ActualsPeriodEntry[]>([]);
  const [annotation, setAnnotation] = useState<string>("");

  const latestModel = useMemo(() => (models.length > 0 ? models[0] : null), [models]);

  const timeSeriesData = baselineForecastData;

  // Debug logs
  console.log('[ProductSummary] models:', models);
  console.log('[ProductSummary] actuals:', actuals);
  console.log('[ProductSummary] latestModel:', latestModel);
  console.log('[ProductSummary] timeSeriesData:', timeSeriesData);

  // Restore Sparkline calculations (using baselineForecastData)
  const sparklineLength = 8;
  const revenueSparkline = useMemo(() => timeSeriesData.map(d => d.revenue).slice(-sparklineLength), [timeSeriesData]);
  const costSparkline = useMemo(() => timeSeriesData.map(d => d.cost).slice(-sparklineLength), [timeSeriesData]);
  const profitSparkline = useMemo(() => timeSeriesData.map(d => d.profit).slice(-sparklineLength), [timeSeriesData]);
  const marginSparkline = useMemo(() => timeSeriesData.map(d => d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0).slice(-sparklineLength), [timeSeriesData]);

  const summaryMetrics = useMemo(() => {
    if (timeSeriesData.length === 0) {
        return { totalRevenue: 0, totalCosts: 0, totalProfit: 0, profitMargin: 0, breakeven: false };
    }
    // Option A: Use sum of per-period values for totals
    const totalRevenue = timeSeriesData.reduce((sum, p) => sum + (p.revenue || 0), 0);
    const totalCosts = timeSeriesData.reduce((sum, p) => sum + (p.totalCost || 0), 0);
    const totalProfit = timeSeriesData.reduce((sum, p) => sum + (p.profit || 0), 0);
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const breakeven = totalProfit >= 0;

    return { totalRevenue, totalCosts, totalProfit, profitMargin, breakeven };
  }, [timeSeriesData]);

  const revenueBreakdownData = useMemo(() => calculateRevenueBreakdown(timeSeriesData, latestModel), [timeSeriesData, latestModel]);
  const costBreakdownData = useMemo(() => calculateCostBreakdown(timeSeriesData, latestModel), [timeSeriesData, latestModel]);

  const breakEvenPeriod = useMemo(() => {
      const breakEvenIndex = timeSeriesData.findIndex(p => p.cumulativeProfit >= 0);
      if (breakEvenIndex === -1) return { label: "Not Reached", index: null, achieved: false };
      const periodData = timeSeriesData[breakEvenIndex];
      return {
          label: periodData.point,
          index: breakEvenIndex,
          achieved: true
      };
  }, [timeSeriesData]);

  // Calculate Average Metrics
  const averageMetrics = useMemo(() => {
    const numPeriods = timeSeriesData.length;
    if (numPeriods === 0) return { avgRevenue: 0, avgCost: 0, avgProfit: 0 };

    const { totalRevenue, totalCosts, totalProfit } = summaryMetrics;
    return {
        avgRevenue: totalRevenue / numPeriods,
        avgCost: totalCosts / numPeriods,
        avgProfit: totalProfit / numPeriods,
    };
  }, [timeSeriesData, summaryMetrics]);

  const { warnings } = useMemo(() => {
    const { totalRevenue, profitMargin, breakeven } = summaryMetrics;
    const revenueStreams = latestModel?.assumptions.revenue || [];
    let revenueConcentrationCalc = 0;
    if (latestModel && totalRevenue > 0 && revenueStreams.length > 0) {
        const highestInitialRevenue = Math.max(0, ...revenueStreams.map(stream => stream.value ?? 0));
        revenueConcentrationCalc = (highestInitialRevenue / totalRevenue) * 100;
    }

    const warningsList = [];
    if (revenueConcentrationCalc > 80) warningsList.push({ type: 'Revenue Concentration', message: 'Over 80% of revenue comes from a single source', severity: 'warning' });
    if (profitMargin < 20) warningsList.push({ type: 'Low Profit Margin', message: 'Profit margin is below 20%', severity: 'warning' });
    if (!breakeven) warningsList.push({ type: 'No Breakeven', message: 'Product does not reach breakeven point', severity: 'error' });
    if (actuals.length === 0) warningsList.push({ type: 'No Actuals', message: 'No actual performance data has been recorded', severity: 'info' });

    return { warnings: warningsList };
  }, [summaryMetrics, actuals, latestModel]);

  // --- Calculate Deltas ---
  const { revenueDelta, costDelta, profitDelta, marginDelta } = useMemo(() => {
    if (timeSeriesData.length < 2) {
      return { revenueDelta: undefined, costDelta: undefined, profitDelta: undefined, marginDelta: undefined };
    }
    const last = timeSeriesData[timeSeriesData.length - 1];
    const prev = timeSeriesData[timeSeriesData.length - 2];

    const calcDelta = (current: number, previous: number): number | undefined => {
        if (previous === 0) return undefined; // Avoid division by zero
        return ((current - previous) / previous) * 100;
    };

    const lastMargin = last.revenue > 0 ? (last.profit / last.revenue) * 100 : 0;
    const prevMargin = prev.revenue > 0 ? (prev.profit / prev.revenue) * 100 : 0;

    return {
        revenueDelta: calcDelta(last.revenue, prev.revenue),
        costDelta: calcDelta(last.cost, prev.cost),
        profitDelta: calcDelta(last.profit, prev.profit),
        marginDelta: prevMargin === 0 ? undefined : lastMargin - prevMargin // Margin delta is absolute change
    };
  }, [timeSeriesData]);

  // --- Calculate Core Assumption Summaries ---
  const { marketingSpendSummary, fixedCostSummary, variableCostSummary } = useMemo(() => {
    if (!latestModel) return { marketingSpendSummary: 'N/A', fixedCostSummary: 'N/A', variableCostSummary: 'N/A' };

    const { marketing, costs, metadata } = latestModel.assumptions;
    let marketingSpend = 'N/A';
    if (marketing?.allocationMode === 'channels') {
        const weeklyBudget = marketing.channels.reduce((sum, ch) => sum + (ch.weeklyBudget ?? 0), 0);
        marketingSpend = `${formatCurrency(weeklyBudget)} / week`;
    } else if (marketing?.allocationMode === 'highLevel' && marketing.totalBudget) {
        marketingSpend = `${formatCurrency(marketing.totalBudget)} total (${marketing.budgetApplication || 'spread'})`;
    }

    const fixedCosts = (costs || [])
        .filter(c => c.type === 'fixed')
        .reduce((sum, c) => sum + (c.value ?? 0), 0);

    const fbCogs = metadata?.costs?.fbCOGSPercent;
    const merchCogs = metadata?.costs?.merchandiseCogsPercent;
    let cogs = 'N/A';
    if (fbCogs !== undefined && merchCogs !== undefined) {
        cogs = `F&B: ${fbCogs}%, Merch: ${merchCogs}%`;
    } else if (fbCogs !== undefined) {
        cogs = `F&B: ${fbCogs}%`;
    } else if (merchCogs !== undefined) {
        cogs = `Merch: ${merchCogs}%`;
    }

    return {
      marketingSpendSummary: marketingSpend,
      fixedCostSummary: formatCurrency(fixedCosts),
      variableCostSummary: cogs
    };

  }, [latestModel]);

  // Data loading effect - Restore scenario loading via store action
  useEffect(() => {
    const loadData = async () => {
      console.log(`[ProductSummary Effect] Running for projectId: ${projectId}`);
      if (projectId) {
        try {
          const projectIdNum = parseInt(projectId);
          console.log(`[ProductSummary Effect] Fetching models for projectId: ${projectIdNum}`);
          const loadedModels = await loadModels(projectIdNum);
          console.log(`[ProductSummary Effect] Fetched ${loadedModels.length} models.`);

          // Explicitly set the baseline model in the store after loading
          if (loadedModels.length > 0 && typeof setBaselineModel === 'function') {
            setBaselineModel(loadedModels[0]);
            console.log(`[ProductSummary Effect] Baseline model set in store.`);
          } else if (loadedModels.length === 0) {
             if (typeof setBaselineModel === 'function') setBaselineModel(null); // Clear if no models
             console.warn(`[ProductSummary Effect] No models found, clearing baseline.`);
          }

          console.log(`[ProductSummary Effect] Fetching actuals for projectId: ${projectIdNum}`);
          const loadedActuals = await loadActuals(projectIdNum);
          console.log(`[ProductSummary Effect] Fetched ${loadedActuals.length} actuals.`);

          // Load scenarios via store action
          if (typeof loadScenarios === 'function') {
            console.log(`[ProductSummary Effect] Fetching scenarios for projectId: ${projectIdNum}`);
            await loadScenarios(projectIdNum);
            console.log(`[ProductSummary Effect] Scenario fetch action dispatched.`);
          } else {
             console.warn("loadScenarios function not found in store!");
          }

          setModels(loadedModels);
          setActuals(loadedActuals);
          // Scenarios state updated by store
          console.log(`[ProductSummary Effect] State updated.`);
        } catch (error) {
          console.error('[ProductSummary Effect] Error loading data:', error);
        }
      } else {
        console.log(`[ProductSummary Effect] No projectId provided.`);
      }
    };

    loadData();
    // Clean up selected scenario when navigating away
    // return () => { if (setCurrentScenario) setCurrentScenario(null); };
  }, [projectId, loadModels, loadActuals, loadScenarios, setBaselineModel]); // Add setBaselineModel dependency

  // Initialize annotation from model when loaded
  useEffect(() => {
    if (latestModel && latestModel.assumptions.metadata && latestModel.assumptions.metadata.annotation) {
      setAnnotation(latestModel.assumptions.metadata.annotation);
    }
  }, [latestModel]);

  // --- Calculate Scenario Comparison Deltas ---
  const scenarioComparisonData = useMemo(() => {
    if (!currentScenario || baselineForecastData.length === 0 || scenarioForecastData.length === 0) {
      return null;
    }
    const baselineTotals = baselineForecastData[baselineForecastData.length - 1];
    const scenarioTotals = scenarioForecastData[scenarioForecastData.length - 1];

    if (!baselineTotals || !scenarioTotals) return null;

    const revenueDelta = scenarioTotals.cumulativeRevenue - baselineTotals.cumulativeRevenue;
    const costDelta = scenarioTotals.cumulativeCost - baselineTotals.cumulativeCost;
    const profitDelta = scenarioTotals.cumulativeProfit - baselineTotals.cumulativeProfit;

    return {
      name: currentScenario.name,
      revenueDelta,
      costDelta,
      profitDelta
    };
  }, [currentScenario, baselineForecastData, scenarioForecastData]);

  // --- Memoize Scenario Items for Select ---
  const scenarioSelectItems = useMemo(() => {
    if (scenariosLoading) {
      return <SelectItem value="loading" disabled>Loading...</SelectItem>;
    }
    return scenarios
      .filter(scenario => scenario.id != null && scenario.id > 0)
      .map((scenario) => (
        // Check ID and name again for robustness
        scenario.id && scenario.name ? (
          <SelectItem key={scenario.id} value={scenario.id.toString()}>
            {scenario.name}
          </SelectItem>
        ) : null
      ));
  }, [scenarios, scenariosLoading]);

  // --- Prepare data for rendering ---
  const { totalRevenue, totalCosts, totalProfit, profitMargin } = summaryMetrics;
  const finalPeriodLabel = timeSeriesData.length > 0 ? timeSeriesData[timeSeriesData.length - 1].point : 'end';
  const forecastHeadline = `Forecasting ${formatCurrency(totalProfit)} total profit by ${finalPeriodLabel}, with breakeven ${breakEvenPeriod.index !== null ? `expected in ${breakEvenPeriod.label}` : "not reached"}.`;
  const forecastConfidence: 'High' | 'Medium' | 'Low' = 'Medium';
  const confidenceVariant = (forecastConfidence as string) === 'High' ? 'success'
                          : (forecastConfidence as string) === 'Medium' ? 'warning'
                          : 'destructive';

  // --- Helper Function to Format Date/Time ---
  const formatDateTime = (date: Date | string | undefined): string => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
      });
    } catch { return 'Invalid Date'; }
  };

  return (
    <>
      {/* === All your summary UI goes here, UNCHANGED === */}
      <div className="space-y-8">
        {/* === Header Section === */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <TypographyH2 className="text-lg font-semibold tracking-tight flex-grow">{forecastHeadline}</TypographyH2>
          <Badge variant={confidenceVariant} className="flex-shrink-0">
              {forecastConfidence} Confidence
          </Badge>
        </div>

        {/* === Section 1: Summary Cards Row === */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Revenue */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              {/* Optional: Add hover tooltip icon here */}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              {revenueDelta !== undefined && (
                <p className={cn("text-xs", revenueDelta >= 0 ? "text-green-600" : "text-red-600")}>
                    {revenueDelta >= 0 ? '+' : ''}{revenueDelta.toFixed(1)}% vs last period
                </p>
              )}
              <div className="h-[40px] mt-2">
                <Sparkline data={revenueSparkline} width={100} height={30} color={dataColors.revenue} />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Costs */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalCosts)}</div>
              {costDelta !== undefined && (
                <p className={cn("text-xs", costDelta <= 0 ? "text-green-600" : "text-red-600")}>
                    {costDelta >= 0 ? '+' : ''}{costDelta.toFixed(1)}% vs last period
                </p>
              )}
              <div className="h-[40px] mt-2">
                <Sparkline data={costSparkline} width={100} height={30} color={dataColors.cost} />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Profit */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalProfit)}</div>
              {profitDelta !== undefined && (
                <p className={cn("text-xs", profitDelta >= 0 ? "text-green-600" : "text-red-600")}>
                    {profitDelta >= 0 ? '+' : ''}{profitDelta.toFixed(1)}% vs last period
                </p>
              )}
              <div className="h-[40px] mt-2">
                <Sparkline data={profitSparkline} width={100} height={30} color={dataColors.profit} />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Profit Margin */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercent(profitMargin)}</div>
              {marginDelta !== undefined && (
                <p className={cn("text-xs", marginDelta >= 0 ? "text-green-600" : "text-red-600")}>
                    {marginDelta >= 0 ? '+' : ''}{marginDelta.toFixed(1)}% vs last period
                </p>
              )}
              <div className="h-[40px] mt-2">
                <Sparkline data={marginSparkline} width={100} height={30} color={dataColors.profit} />
              </div>
            </CardContent>
          </Card>

          {/* Card 5: Breakeven Point (Consider making larger via grid spans if needed) */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Breakeven Point</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">{breakEvenPeriod.label}</div>
              {breakEvenPeriod.achieved ? (
                  <span className="text-sm text-green-600 font-medium flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" /> Achieved
                  </span>
              ) : (
                  <span className="text-sm text-amber-600 font-medium flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1" /> Projected
                  </span>
              )}
            </CardContent>
          </Card>
        </div>

        {/* === Section 2: Forecast Averages Panel === */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Forecast Averages (Per Week)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <TypographyMuted className="text-sm">Avg. Revenue</TypographyMuted>
                    <div className="text-2xl font-semibold">{formatCurrency(averageMetrics.avgRevenue)}</div>
                </div>
                 <div>
                    <TypographyMuted className="text-sm">Avg. Costs</TypographyMuted>
                    <div className="text-2xl font-semibold">{formatCurrency(averageMetrics.avgCost)}</div>
                </div>
                 <div>
                    <TypographyMuted className="text-sm">Avg. Profit</TypographyMuted>
                    <div className="text-2xl font-semibold">{formatCurrency(averageMetrics.avgProfit)}</div>
                </div>
            </div>
          </CardContent>
        </Card>

        {/* === Section 3: Assumptions & Model Settings (Side-by-Side) === */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Model Settings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Forecast Model Settings</CardTitle>
              {/* Removed Edit button from here, maybe add to overall section? */}
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Growth Model</dt>
                  <dd className="font-medium capitalize">{latestModel?.assumptions.growthModel?.type || 'N/A'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Growth Rate</dt>
                  <dd className="font-medium">{formatPercent(latestModel?.assumptions.growthModel?.rate || 0)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Model Created</dt>
                  <dd className="font-medium">{formatDateTime(latestModel?.createdAt)}</dd>
                </div>
                 <div className="flex justify-between">
                  <dt className="text-muted-foreground">Last Updated</dt>
                  <dd className="font-medium">{formatDateTime(latestModel?.updatedAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Card 2: Core Assumptions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Core Assumptions</CardTitle>
               <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/projects/${projectId}/forecast-builder`)}
               >
                Edit Assumptions
              </Button>
            </CardHeader>
            <CardContent>
               <dl className="space-y-2 text-sm">
                 <div className="flex justify-between">
                   <dt className="text-muted-foreground">Avg Attendance (Initial)</dt>
                   <dd className="font-medium">{latestModel?.assumptions.metadata?.initialWeeklyAttendance?.toLocaleString() ?? 'N/A'}</dd>
                 </div>
                 <div className="flex justify-between">
                   <dt className="text-muted-foreground">Avg Spend / Attendee</dt>
                   <dd className="font-medium">{
                     latestModel?.assumptions.metadata?.perCustomer ?
                     formatCurrency(
                       (latestModel.assumptions.metadata.perCustomer.ticketPrice ?? 0) +
                       (latestModel.assumptions.metadata.perCustomer.fbSpend ?? 0) +
                       (latestModel.assumptions.metadata.perCustomer.merchandiseSpend ?? 0)
                     ) : 'N/A'
                   }</dd>
                 </div>
                  <div className="flex justify-between">
                   <dt className="text-muted-foreground">Marketing Spend</dt>
                   <dd className="font-medium">{marketingSpendSummary}</dd>
                 </div>
                 <div className="flex justify-between">
                   <dt className="text-muted-foreground">Fixed Costs</dt>
                   <dd className="font-medium">{fixedCostSummary}</dd>
                 </div>
                 <div className="flex justify-between">
                   <dt className="text-muted-foreground">Variable Costs (COGS)</dt>
                   <dd className="font-medium">{variableCostSummary}</dd>
                 </div>
               </dl>
            </CardContent>
          </Card>
        </div>

        {/* === Section 4: Forecast Visualisation Charts === */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Weekly Revenue vs. Costs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Weekly Revenue vs. Costs</CardTitle>
            </CardHeader>
            <CardContent>
               <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={timeSeriesData}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                    barCategoryGap="25%"
                    barGap={2}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                    <XAxis
                      dataKey="point"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={formatCurrency}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={60}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: 'transparent' }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                      verticalAlign="bottom"
                      iconSize={10}
                    />
                    <Bar name="Weekly Revenue" dataKey="revenue" fill={dataColors.revenue} radius={[3, 3, 0, 0]} barSize={15} />
                    <Bar name="Weekly Costs" dataKey="cost" fill={dataColors.cost} radius={[3, 3, 0, 0]} barSize={15} />
                  </BarChart>
               </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Chart 2: Financial Forecast */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Financial Forecast</CardTitle>
            </CardHeader>
            <CardContent>
               <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timeSeriesData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                      {/* Adjusted gradient opacity */}
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={dataColors.revenue} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={dataColors.revenue} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={dataColors.cost} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={dataColors.cost} stopOpacity={0}/>
                      </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="point"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatCurrency}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ stroke: dataColors.neutral[400], strokeWidth: 1, strokeDasharray: "3 3" }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                    verticalAlign="bottom"
                    payload={[
                      { value: 'Revenue', type: 'square', id: 'revenue', color: dataColors.revenue },
                      { value: 'Costs', type: 'square', id: 'cost', color: dataColors.cost },
                      { value: 'Profit', type: 'line', id: 'profit', color: dataColors.forecast }
                    ]}
                  />
                  {breakEvenPeriod.index !== null && (
                      <ReferenceLine
                        x={timeSeriesData[breakEvenPeriod.index]?.point}
                        stroke={dataColors.status.warning}
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                      >
                          <RechartsLabel
                            value="Breakeven"
                            position="insideTopLeft"
                            fill={dataColors.status.warning}
                            fontSize={10}
                            offset={8}
                            className="font-semibold"
                          />
                      </ReferenceLine>
                   )}
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke={dataColors.revenue} strokeWidth={1.5} fillOpacity={1} fill="url(#colorRevenue)" dot={false} />
                  <Area type="monotone" dataKey="cost" name="Costs" stroke={dataColors.cost} strokeWidth={1.5} fillOpacity={1} fill="url(#colorCost)" dot={false}/>
                   <Line type="monotone" dataKey="profit" name="Profit" stroke={dataColors.forecast} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* === Section 5: Scenario Analysis, Risk Flags, Notes === */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scenario Analysis Card - Display Comparison */}
            <Card className="lg:col-span-1">
                <CardHeader>
                    <CardTitle className="text-lg">Scenario Impact Overview</CardTitle>
                    <CardDescription>Select a scenario to see its impact vs. baseline.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   {/* Scenario Selector Dropdown */}
                   <div>
                      <Label htmlFor="scenario-select" className="mb-1 block text-sm font-medium">Selected Scenario</Label>
                      <Select 
                        value={currentScenario?.id !== undefined && currentScenario?.id !== null ? currentScenario.id.toString() : "baseline"}
                        onValueChange={(value) => {
                          if (value === "baseline") {
                            if (setCurrentScenario) setCurrentScenario(null);
                            return;
                          }
                          const selectedId = parseInt(value);
                          const scenarioToSet = scenarios.find(s => s.id === selectedId) || null;
                          if (setCurrentScenario) {
                             setCurrentScenario(scenarioToSet);
                          }
                        }}
                      >
                         <SelectTrigger id="scenario-select">
                           <SelectValue placeholder="Select scenario..." />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="baseline">None (Baseline)</SelectItem>
                           {scenarioSelectItems}
                         </SelectContent>
                      </Select>
                   </div>

                   {/* Display Scenario Comparison */}
                   <Separator />
                   <div>
                      <TypographyMuted className="text-sm">Impact vs. Baseline:</TypographyMuted>
                      <div className="mt-2 p-3 bg-muted/50 rounded-md border min-h-[80px]">
                         {currentScenario && scenarioComparisonData ? (
                           <Table>
                             {/* Optional Header <TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Impact</TableHead></TableRow></TableHeader> */}
                             <TableBody>
                                <TableRow>
                                  <TableCell>Revenue</TableCell>
                                  <TableCell className={cn("text-right", scenarioComparisonData.revenueDelta >= 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(scenarioComparisonData.revenueDelta)}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell>Cost</TableCell>
                                  <TableCell className={cn("text-right", scenarioComparisonData.costDelta <= 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(scenarioComparisonData.costDelta)}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell>Profit</TableCell>
                                  <TableCell className={cn("text-right", scenarioComparisonData.profitDelta >= 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(scenarioComparisonData.profitDelta)}</TableCell>
                                </TableRow>
                             </TableBody>
                           </Table>
                         ) : (
                           <p className="text-sm text-center py-4 text-muted-foreground">{scenarios.length > 0 ? "Select a scenario above to see its impact." : "No scenarios defined for this project."}</p>
                         )}
                      </div>
                   </div>
                </CardContent>
            </Card>

            {/* Risk Flags & Alerts / Notes & Commentary Cards */}
            <Card className="lg:col-span-1">
              <CardHeader>
                 <CardTitle className="text-lg">Risk Flags & Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                {warnings.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {warnings.map((warning, index) => {
                          // Using smaller cards/badges for alerts might be better here
                          let alertClasses = "p-3 border rounded-lg flex items-start gap-3 text-xs ";
                          let iconColor = "text-blue-500";
                          const titleColor = "font-semibold";
                          if (warning.severity === 'error') {
                              alertClasses += "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700/50";
                              iconColor = "text-red-500";
                          } else if (warning.severity === 'warning') {
                              alertClasses += "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700/50";
                              iconColor = "text-amber-500";
                          } else { // Info
                              alertClasses += "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700/50";
                          }
                          return (
                              <div key={index} className={alertClasses}>
                                  <AlertTriangle className={`h-4 w-4 ${iconColor} flex-shrink-0 mt-0.5`} />
                                  <div>
                                      <h4 className={titleColor}>{warning.type}</h4>
                                      <p>{warning.message}</p>
                                      {/* TODO: Link to relevant assumption/input */}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
                ) : (
                   <TypographyP className="text-muted-foreground">No specific risks flagged based on current forecast.</TypographyP>
                )}
              </CardContent>
            </Card>

            {/* Notes & Commentary Card */}
            <Card className="lg:col-span-1">
              <CardHeader>
                 <CardTitle className="text-lg">Notes & Commentary</CardTitle>
              </CardHeader>
              <CardContent>
                 <Label htmlFor="pm-notes" className="sr-only">PM Commentary</Label> {/* Screen reader label */}
                 <Textarea
                   id="pm-notes"
                   placeholder="Add notes or observations about this forecast..."
                   value={annotation}
                   onChange={(e) => setAnnotation(e.target.value)}
                   className="mt-1"
                   rows={4}
                 />
                 <div className="flex items-center justify-between mt-2">
                   <Button
                     size="sm"
                     variant="secondary"
                     onClick={async () => {
                       if (latestModel && latestModel.id) {
                         // Save annotation to DB for this model
                         const updated = { ...latestModel, assumptions: { ...latestModel.assumptions, metadata: { ...latestModel.assumptions.metadata, annotation } } };
                         // Save to DB
                         try {
                           await import('@/lib/db').then(({ db }) => db.financialModels.update(latestModel.id, { assumptions: updated.assumptions, updatedAt: new Date() }));
                           // Optionally show toast
                           if (typeof window !== 'undefined') {
                             import('@/components/ui/use-toast').then(({ toast }) => toast({ title: 'Notes Saved', description: `Saved at ${new Date().toLocaleTimeString()}` }));
                           }
                         } catch (err) {
                           if (typeof window !== 'undefined') {
                             import('@/components/ui/use-toast').then(({ toast }) => toast({ title: 'Save Failed', description: 'Could not save notes', variant: 'destructive' }));
                           }
                         }
                       }
                     }}
                   >Save Notes</Button>
                   <span className="text-xs text-muted-foreground">Last updated: {latestModel?.updatedAt ? formatDateTime(latestModel.updatedAt) : 'N/A'}</span>
                 </div>
              </CardContent>
            </Card>
        </div>

        {/* === Section 6: Forecast Data Table === */}
        <div className="mt-12">
          <ForecastDataTab />
        </div>
      </div>
    </>
  );
};

export default ProductSummary;
