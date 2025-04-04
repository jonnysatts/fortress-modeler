import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { FinancialModel, ActualsPeriodEntry } from '@/lib/db';
import useStore from '@/store/useStore';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { generateForecastTimeSeries, ForecastPeriodData } from '@/lib/financialCalculations';
import { TypographyH4, TypographyMuted } from '@/components/ui/typography';
import ContentCard from '@/components/common/ContentCard';
import ChartContainer from '@/components/common/ChartContainer';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, ReferenceLine, Label } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Sparkline } from '@/components/ui/sparkline';
import { Card } from '@/components/ui/card';

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
        let currentAttendance = periodData.attendance ?? 0;
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
         "Other Recurring": 0
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
        let currentAttendance = periodData.attendance ?? 0;

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

        // 2. Fixed/Recurring
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

        // 3. Marketing
        let periodMarketingCost = 0;
        if (marketingSetup.allocationMode === 'channels') {
            const budget = marketingSetup.channels.reduce((s, ch) => s + (ch.weeklyBudget ?? 0), 0);
            periodMarketingCost = isWeekly ? budget : budget * (365.25 / 7 / 12);
        } else if (marketingSetup.allocationMode === 'highLevel') {
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

const ProductSummary: React.FC = () => {
  // Correctly extract projectId from URL parameters
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject, loadModelsForProject, loadActualsForProject } = useStore();
  const [models, setModels] = useState<FinancialModel[]>([]);
  const [actuals, setActuals] = useState<ActualsPeriodEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Memoized calculations depend on state, but called unconditionally
  const latestModel = useMemo(() => (models.length > 0 ? models[0] : null), [models]);

  const timeSeriesData: ForecastPeriodData[] = useMemo(() => {
    if (!latestModel) return [];
    return generateForecastTimeSeries(latestModel);
  }, [latestModel]);

  const summaryMetrics = useMemo(() => {
    if (timeSeriesData.length === 0) {
        return { totalRevenue: 0, totalCosts: 0, totalProfit: 0, profitMargin: 0, breakeven: false };
    }
    const finalPeriod = timeSeriesData[timeSeriesData.length - 1];
    const totalRevenue = finalPeriod.cumulativeRevenue;
    const totalCosts = finalPeriod.cumulativeCost;
    const totalProfit = finalPeriod.cumulativeProfit;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const breakeven = totalProfit >= 0;


    return { totalRevenue, totalCosts, totalProfit, profitMargin, breakeven };
  }, [timeSeriesData]);

  const revenueBreakdownData = useMemo(() => calculateRevenueBreakdown(timeSeriesData, latestModel), [timeSeriesData, latestModel]);
  const costBreakdownData = useMemo(() => calculateCostBreakdown(timeSeriesData, latestModel), [timeSeriesData, latestModel]);

  const breakEvenPeriod = useMemo(() => {
      const breakEvenIndex = timeSeriesData.findIndex(p => p.cumulativeProfit >= 0);
      if (breakEvenIndex === -1) return { label: "Not Reached", index: null };
      const periodData = timeSeriesData[breakEvenIndex];
      return {
          label: periodData.point, // e.g., "Week 7"
          index: breakEvenIndex // Numeric index (0-based) for ReferenceLine
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

  const { revenueConcentration, warnings } = useMemo(() => {
    const { totalRevenue, profitMargin, breakeven } = summaryMetrics;
    const revenueStreams = latestModel?.assumptions.revenue || [];
    let revenueConcentration = 0;
    if (totalRevenue > 0 && revenueStreams.length > 0) {
        const highestInitialRevenue = Math.max(0, ...revenueStreams.map(stream => stream.value ?? 0));
        revenueConcentration = (highestInitialRevenue / totalRevenue) * 100;
    }

    const warnings = [];
    if (revenueConcentration > 80) warnings.push({ type: 'Revenue Concentration', message: 'Over 80% of revenue comes from a single source', severity: 'warning' });
    if (profitMargin < 20) warnings.push({ type: 'Low Profit Margin', message: 'Profit margin is below 20%', severity: 'warning' });
    if (!breakeven) warnings.push({ type: 'No Breakeven', message: 'Product does not reach breakeven point', severity: 'error' });
    if (actuals.length === 0) warnings.push({ type: 'No Actuals', message: 'No actual performance data has been recorded', severity: 'info' });

    return { revenueConcentration, warnings };
  }, [summaryMetrics, actuals, latestModel]);

  // Data loading effect
  useEffect(() => {
    const loadData = async () => {
      // Use projectId in the log and logic
      console.log(`[ProductSummary Effect] Running for projectId: ${projectId}`);
      if (projectId) { // Check projectId instead of id
        setIsLoading(true);
        try {
          const projectIdNum = parseInt(projectId); // Parse projectId
          console.log(`[ProductSummary Effect] Fetching models for projectId: ${projectIdNum}`);
          const loadedModels = await loadModelsForProject(projectIdNum);
          console.log(`[ProductSummary Effect] Fetched ${loadedModels.length} models.`);
          console.log(`[ProductSummary Effect] Fetching actuals for projectId: ${projectIdNum}`);
          const loadedActuals = await loadActualsForProject(projectIdNum);
          console.log(`[ProductSummary Effect] Fetched ${loadedActuals.length} actuals.`);

          setModels(loadedModels);
          setActuals(loadedActuals);
          console.log(`[ProductSummary Effect] State updated.`);
        } catch (error) {
          console.error('[ProductSummary Effect] Error loading data:', error);
        } finally {
          setIsLoading(false);
          console.log(`[ProductSummary Effect] Finished, isLoading set to false.`);
        }
      } else {
          console.log(`[ProductSummary Effect] No projectId provided.`); // Update log message
          setIsLoading(false);
      }
    };

    loadData();
    // Update dependency array to use projectId
  }, [projectId]);

  // --- Conditional Returns AFTER all hooks ---
  if (isLoading) {
    return <div className="py-8 text-center">Loading product data...</div>;
  }

  if (!currentProject) {
    return <div className="py-8 text-center">Product not found</div>;
  }

  if (!latestModel) {
    return (
      <div className="py-8 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <TypographyH4>No Forecasts Available</TypographyH4>
        <TypographyMuted className="mt-2">
          This product doesn't have any forecasts yet. Create a forecast to see financial projections.
        </TypographyMuted>
      </div>
    );
  }

  // --- Prepare data for rendering (now safe to access latestModel) ---
  const { totalRevenue, totalCosts, totalProfit, profitMargin } = summaryMetrics;
  const revenueChartData = (latestModel.assumptions.revenue || []).map(stream => ({ name: stream.name, value: stream.value }));
  const costChartData = (latestModel.assumptions.costs || []).map(cost => ({ name: cost.name, value: cost.value }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
  const COST_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards (Now 5 cards with Breakeven) */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4"> {/* Adjusted grid for 5 cards */}
        <ContentCard title="Total Revenue">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{formatCurrency(totalRevenue)}</div>
            <TrendingUp className="h-6 w-6 text-fortress-emerald" />
          </div>
        </ContentCard>

        <ContentCard title="Total Costs">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{formatCurrency(totalCosts)}</div>
            <TrendingDown className="h-6 w-6 text-red-500" />
          </div>
        </ContentCard>

        <ContentCard title="Total Profit">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{formatCurrency(totalProfit)}</div>
            {totalProfit >= 0 ? (
              <CheckCircle className="h-6 w-6 text-fortress-emerald" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-red-500" />
            )}
          </div>
        </ContentCard>

        <ContentCard title="Profit Margin">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{formatPercent(profitMargin)}</div>
            {profitMargin >= 20 ? (
              <CheckCircle className="h-6 w-6 text-fortress-emerald" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            )}
          </div>
        </ContentCard>

        <ContentCard title="Breakeven Point">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{breakEvenPeriod.label}</div>
          </div>
        </ContentCard>
      </div>

      {/* Warnings & Alerts - Render as individual cards in a grid */}
      {warnings.length > 0 && (
        <div> {/* Optional: Add a title here if needed: <TypographyH4 className="mb-2">Warnings & Alerts</TypographyH4> */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {warnings.map((warning, index) => {
                    // Determine card styling based on severity
                    let cardClasses = "p-4 border rounded-lg flex items-start gap-3 "; // Base classes
                    let iconColor = "text-blue-500"; // Default (info)
                    let titleColor = "text-blue-800 dark:text-blue-200";
                    let textColor = "text-blue-700 dark:text-blue-300";

                    if (warning.severity === 'error') {
                        cardClasses += "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700/50";
                        iconColor = "text-red-500";
                        titleColor = "text-red-800 dark:text-red-200";
                        textColor = "text-red-700 dark:text-red-300";
                    } else if (warning.severity === 'warning') {
                        cardClasses += "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700/50";
                        iconColor = "text-amber-500";
                        titleColor = "text-amber-800 dark:text-amber-200";
                        textColor = "text-amber-700 dark:text-amber-300";
                    } else { // Info
                        cardClasses += "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700/50";
                    }

                    return (
                        <Card key={index} className={cardClasses}>
                            <AlertTriangle className={`h-5 w-5 ${iconColor} flex-shrink-0 mt-0.5`} />
                            <div>
                                <h4 className={`font-medium ${titleColor}`}>{warning.type}</h4>
                                <p className={`text-sm ${textColor}`}>
                                    {warning.message}
                                </p>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
      )}

      {/* Revenue & Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown Pie */}
        <ChartContainer
          title="Total Revenue Distribution"
          description="% contribution per stream"
          height={300} // Adjust height as needed
        >
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={revenueBreakdownData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="totalValue"
                        nameKey="name"
                        label={({ percent }) => `${formatPercent(percent * 100)}`}
                    >
                    {revenueBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(value as number), "Total Revenue"]} />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </ChartContainer>

        {/* Revenue Breakdown Bar */}
        <ChartContainer
          title="Total Revenue Value"
          description="Absolute value per stream"
          height={300} // Adjust height as needed
        >
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueBreakdownData} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={formatCurrency} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }}/>
                    <Tooltip formatter={(value) => [formatCurrency(value as number), "Total Revenue"]} />
                    <Bar dataKey="totalValue" name="Total Revenue" radius={[0, 4, 4, 0]}>
                        {revenueBreakdownData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </ChartContainer>

        {/* Cost Breakdown Pie */}
        <ChartContainer
            title="Total Cost Distribution"
            description="% contribution per category"
            height={300} // Adjust height as needed
        >
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={costBreakdownData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="totalValue"
                        nameKey="category"
                        label={({ percent }) => `${formatPercent(percent * 100)}`}
                    >
                    {costBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COST_COLORS[index % COST_COLORS.length]} />
                    ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(value as number), "Total Cost"]} />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </ChartContainer>

        {/* Cost Breakdown Bar */}
        <ChartContainer
            title="Total Cost Value"
            description="Absolute value per category"
            height={300} // Adjust height as needed
        >
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costBreakdownData} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={formatCurrency} />
                    <YAxis dataKey="category" type="category" width={100} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => [formatCurrency(value as number), "Total Cost"]} />
                    <Bar dataKey="totalValue" name="Total Cost" radius={[0, 4, 4, 0]}>
                        {costBreakdownData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COST_COLORS[index % COST_COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Forecast Chart */}
      <ChartContainer
        title="Financial Forecast"
        description="Revenue, costs, and profit over time"
        height={400}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="point" />
            <YAxis tickFormatter={val => formatCurrency(val)} />
            <Tooltip formatter={(value) => [formatCurrency(value as number), '']} />
            <Legend />
            {breakEvenPeriod.index !== null && (
                <ReferenceLine
                    x={timeSeriesData[breakEvenPeriod.index]?.point}
                    stroke="#F59E0B"
                    strokeDasharray="3 3"
                >
                    <Label value="Breakeven" position="insideTopLeft" fill="#F59E0B" fontSize={10}/>
                </ReferenceLine>
            )}
            <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" strokeWidth={2} />
            <Line type="monotone" dataKey="cost" name="Costs" stroke="#EF4444" strokeWidth={2} />
            <Line type="monotone" dataKey="profit" name="Profit" stroke="#1A2942" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Average Metrics Section */}
      <ContentCard title="Forecast Averages (Per Period)">
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
      </ContentCard>

      {/* Product Details */}
      <ContentCard title="Product Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">Basic Information</h4>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Product Type</dt>
                <dd className="font-medium">{currentProject.productType}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Target Audience</dt>
                <dd className="font-medium">{currentProject.targetAudience || 'Not specified'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Created</dt>
                <dd className="font-medium">{new Date(currentProject.createdAt).toLocaleDateString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Last Updated</dt>
                <dd className="font-medium">{new Date(currentProject.updatedAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h4 className="font-medium mb-2">Forecast Information</h4>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Forecast Name</dt>
                <dd className="font-medium">{latestModel.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Growth Model</dt>
                <dd className="font-medium">{latestModel.assumptions.growthModel?.type || 'Not specified'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Growth Rate</dt>
                <dd className="font-medium">{formatPercent(latestModel.assumptions.growthModel?.rate || 0)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Revenue Streams</dt>
                <dd className="font-medium">{latestModel.assumptions.revenue?.length || 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Cost Categories</dt>
                <dd className="font-medium">{latestModel.assumptions.costs?.length || 0}</dd>
              </div>
            </dl>
          </div>
        </div>
      </ContentCard>
    </div>
  );
};

export default ProductSummary;
